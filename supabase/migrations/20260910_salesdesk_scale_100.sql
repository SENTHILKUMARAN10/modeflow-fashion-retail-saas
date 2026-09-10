-- SalesDesk 100-client production scale + operations foundation
-- Apply after the 20260907 production hardening and billing migrations.
-- This migration is intentionally additive and keeps existing client identifiers compatible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Subscription state compatibility and business profile fields
-- ---------------------------------------------------------------------------

alter table public.business_subscriptions
  drop constraint if exists business_subscriptions_status_check;
alter table public.business_subscriptions
  add constraint business_subscriptions_status_check
  check (status in (
    'created','pending_verification','authenticated','active','past_due',
    'halted','cancelled','completed','expired','rejected'
  ));

alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists tax_id text;
alter table public.businesses add column if not exists timezone text not null default 'Asia/Kolkata';
alter table public.businesses add column if not exists invoice_prefix text not null default 'SD';

do $$
begin
  if not exists (select 1 from pg_constraint where conname='business_invoice_prefix_format') then
    alter table public.businesses add constraint business_invoice_prefix_format
      check (invoice_prefix ~ '^[A-Za-z0-9-]{2,10}$');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Products and services become first-class concepts
-- ---------------------------------------------------------------------------

alter table public.products add column if not exists item_type text not null default 'product';
alter table public.products add column if not exists category text;
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists track_stock boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='products_item_type_check') then
    alter table public.products add constraint products_item_type_check
      check (item_type in ('product','service'));
  end if;
end $$;

-- Existing service-like records can be explicitly converted later without data loss.

-- ---------------------------------------------------------------------------
-- 3) Invoice operational fields
-- ---------------------------------------------------------------------------

alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- 4) Suppliers and purchasing
-- ---------------------------------------------------------------------------

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  tax_id text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_number text not null,
  status text not null default 'draft' check (status in ('draft','ordered','received','cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  purchase_date date not null default current_date,
  notes text,
  received_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,purchase_number)
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  cost_price numeric(12,2) not null check (cost_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

-- Payment receipts for unpaid/partial invoices. This gives SalesDesk a proper
-- receivables foundation instead of representing a partial payment as a label only.
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'upi' check (payment_method in ('cash','upi','card','bank','other')),
  reference text,
  paid_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Internal production error telemetry. RLS has no client policies: only the
-- server-side service role may write/read it through protected API routes.
create table if not exists public.app_error_logs (
  id bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'web',
  message text not null,
  stack text,
  context jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) Indexes for tenant isolation, dashboard queries and growing histories
-- ---------------------------------------------------------------------------

create index if not exists idx_members_user_business
  on public.business_members(user_id,business_id);
create index if not exists idx_products_business_active_name
  on public.products(business_id,is_active,name);
create unique index if not exists uq_products_business_sku
  on public.products(business_id,lower(sku)) where sku is not null and trim(sku)<>'';
create index if not exists idx_products_business_low_stock
  on public.products(business_id,stock,reorder_level) where is_active=true and track_stock=true;
create index if not exists idx_customers_business_phone
  on public.customers(business_id,phone) where phone is not null;
create index if not exists idx_customers_business_created
  on public.customers(business_id,created_at desc);
create index if not exists idx_invoices_business_status_date
  on public.invoices(business_id,payment_status,created_at desc);
create index if not exists idx_invoice_items_invoice
  on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_product
  on public.invoice_items(product_id) where product_id is not null;
create index if not exists idx_expenses_business_created
  on public.expenses(business_id,created_at desc);
create index if not exists idx_audit_business_entity_date
  on public.audit_logs(business_id,entity_type,created_at desc);
create index if not exists idx_subscriptions_status_end
  on public.business_subscriptions(status,current_period_end);
create index if not exists idx_suppliers_business_name
  on public.suppliers(business_id,name) where is_active=true;
create index if not exists idx_purchases_business_date
  on public.purchases(business_id,purchase_date desc,created_at desc);
create index if not exists idx_purchase_items_purchase
  on public.purchase_items(purchase_id);
create index if not exists idx_invoice_payments_invoice_date
  on public.invoice_payments(invoice_id,paid_at desc);
create index if not exists idx_invoice_payments_business_date
  on public.invoice_payments(business_id,paid_at desc);
create index if not exists idx_app_error_logs_created
  on public.app_error_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- 6) RLS for new operational tables
-- ---------------------------------------------------------------------------

alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.app_error_logs enable row level security;

drop policy if exists "members read suppliers" on public.suppliers;
create policy "members read suppliers" on public.suppliers for select
  using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "managers write suppliers" on public.suppliers;
create policy "managers write suppliers" on public.suppliers for all
  using (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id))
  with check (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id));

drop policy if exists "members read purchases" on public.purchases;
create policy "members read purchases" on public.purchases for select
  using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "managers write purchases" on public.purchases;
create policy "managers write purchases" on public.purchases for all
  using (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id))
  with check (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id));

drop policy if exists "members read purchase items" on public.purchase_items;
create policy "members read purchase items" on public.purchase_items for select
  using (exists(
    select 1 from public.purchases p
    where p.id=purchase_id
      and public.is_business_member(p.business_id)
      and public.has_active_subscription(p.business_id)
  ));
drop policy if exists "managers write purchase items" on public.purchase_items;
create policy "managers write purchase items" on public.purchase_items for all
  using (exists(
    select 1 from public.purchases p
    where p.id=purchase_id
      and public.has_business_role(p.business_id,array['owner','manager'])
      and public.has_active_subscription(p.business_id)
  ))
  with check (exists(
    select 1 from public.purchases p
    where p.id=purchase_id
      and public.has_business_role(p.business_id,array['owner','manager'])
      and public.has_active_subscription(p.business_id)
  ));

drop policy if exists "members read invoice payments" on public.invoice_payments;
create policy "members read invoice payments" on public.invoice_payments for select
  using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "members create invoice payments" on public.invoice_payments;
create policy "members create invoice payments" on public.invoice_payments for insert
  with check (public.is_business_member(business_id) and public.has_active_subscription(business_id) and created_by=auth.uid());
drop policy if exists "owners delete invoice payments" on public.invoice_payments;
create policy "owners delete invoice payments" on public.invoice_payments for delete
  using (public.has_business_role(business_id,array['owner']) and public.has_active_subscription(business_id));

-- No app_error_logs policies by design. Service role bypasses RLS.

-- Apply subscription enforcement triggers to direct writes on the new business tables.
do $$
begin
  drop trigger if exists trg_paid_suppliers on public.suppliers;
  create trigger trg_paid_suppliers before insert or update or delete on public.suppliers
    for each row execute function public.enforce_paid_business_write();
  drop trigger if exists trg_paid_purchases on public.purchases;
  create trigger trg_paid_purchases before insert or update or delete on public.purchases
    for each row execute function public.enforce_paid_business_write();
  drop trigger if exists trg_paid_invoice_payments on public.invoice_payments;
  create trigger trg_paid_invoice_payments before insert or update or delete on public.invoice_payments
    for each row execute function public.enforce_paid_business_write();
end $$;

-- updated_at triggers
do $$
begin
  drop trigger if exists trg_suppliers_updated_at on public.suppliers;
  create trigger trg_suppliers_updated_at before update on public.suppliers
    for each row execute function public.set_updated_at();
  drop trigger if exists trg_purchases_updated_at on public.purchases;
  create trigger trg_purchases_updated_at before update on public.purchases
    for each row execute function public.set_updated_at();
end $$;

-- Audit the new business-impacting records.
do $$
begin
  drop trigger if exists trg_audit_suppliers on public.suppliers;
  create trigger trg_audit_suppliers after insert or update or delete on public.suppliers
    for each row execute function public.audit_business_change();
  drop trigger if exists trg_audit_purchases on public.purchases;
  create trigger trg_audit_purchases after insert or update or delete on public.purchases
    for each row execute function public.audit_business_change();
  drop trigger if exists trg_audit_invoice_payments on public.invoice_payments;
  create trigger trg_audit_invoice_payments after insert or update or delete on public.invoice_payments
    for each row execute function public.audit_business_change();
end $$;

-- ---------------------------------------------------------------------------
-- 7) Atomic purchase creation and receiving
-- ---------------------------------------------------------------------------

create or replace function public.create_purchase(
  p_business_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_purchase uuid;
  v_number text;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric(12,3);
  v_cost numeric(12,2);
begin
  if v_user is null or not public.has_business_role(p_business_id,array['owner','manager']) then
    raise exception 'Owner or manager access required';
  end if;
  if not public.has_active_subscription(p_business_id) then
    raise exception 'SalesDesk subscription required' using errcode='42501';
  end if;
  if p_supplier_id is not null and not exists(
    select 1 from public.suppliers where id=p_supplier_id and business_id=p_business_id and is_active=true
  ) then
    raise exception 'Supplier not found';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'At least one purchase item is required';
  end if;
  if jsonb_array_length(p_items)>100 then raise exception 'Too many purchase items'; end if;

  v_number := 'PO-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  insert into public.purchases(business_id,supplier_id,purchase_number,status,subtotal,total,notes,created_by)
  values(p_business_id,p_supplier_id,v_number,'draft',0,0,nullif(trim(p_notes),''),v_user)
  returning id into v_purchase;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    v_cost := (v_item->>'cost_price')::numeric;
    if v_qty is null or v_qty<=0 or v_qty>100000 then raise exception 'Invalid purchase quantity'; end if;
    if v_cost is null or v_cost<0 or v_cost>100000000 then raise exception 'Invalid purchase cost'; end if;

    select * into v_product from public.products
    where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true;
    if not found then raise exception 'Purchase product not found'; end if;

    insert into public.purchase_items(purchase_id,product_id,product_name,quantity,cost_price,line_total)
    values(v_purchase,v_product.id,v_product.name,v_qty,v_cost,round(v_qty*v_cost,2));
    v_subtotal := v_subtotal + round(v_qty*v_cost,2);
  end loop;

  update public.purchases set subtotal=v_subtotal,total=v_subtotal where id=v_purchase;
  return v_purchase;
end;
$$;
revoke all on function public.create_purchase(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.create_purchase(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.receive_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_purchase public.purchases%rowtype;
  v_item record;
  v_product public.products%rowtype;
begin
  select * into v_purchase from public.purchases where id=p_purchase_id for update;
  if not found then raise exception 'Purchase not found'; end if;
  if not public.has_business_role(v_purchase.business_id,array['owner','manager']) then
    raise exception 'Owner or manager access required';
  end if;
  if not public.has_active_subscription(v_purchase.business_id) then
    raise exception 'SalesDesk subscription required' using errcode='42501';
  end if;
  if v_purchase.status='received' then return; end if;
  if v_purchase.status='cancelled' then raise exception 'Cancelled purchase cannot be received'; end if;

  for v_item in select * from public.purchase_items where purchase_id=p_purchase_id loop
    select * into v_product from public.products where id=v_item.product_id for update;
    if not found or v_product.business_id<>v_purchase.business_id then raise exception 'Invalid purchase product'; end if;
    update public.products
      set cost_price=v_item.cost_price,
          stock=case when track_stock then stock+v_item.quantity else stock end
      where id=v_item.product_id;
    if v_product.track_stock then
      insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by)
      values(v_purchase.business_id,v_item.product_id,'purchase',v_item.quantity,p_purchase_id,'SalesDesk purchase received',v_user);
    end if;
  end loop;

  update public.purchases set status='received',received_at=now() where id=p_purchase_id;
end;
$$;
revoke all on function public.receive_purchase(uuid) from public,anon;
grant execute on function public.receive_purchase(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Receivables: record payments against unpaid/partial invoices
-- ---------------------------------------------------------------------------

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text default 'upi',
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_invoice public.invoices%rowtype;
  v_payment uuid;
  v_paid numeric(12,2);
begin
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if not public.is_business_member(v_invoice.business_id) then raise exception 'Not authorized'; end if;
  if not public.has_active_subscription(v_invoice.business_id) then
    raise exception 'SalesDesk subscription required' using errcode='42501';
  end if;
  if p_amount is null or p_amount<=0 then raise exception 'Payment amount must be greater than zero'; end if;
  if p_payment_method not in ('cash','upi','card','bank','other') then raise exception 'Invalid payment method'; end if;

  select coalesce(sum(amount),0) into v_paid from public.invoice_payments where invoice_id=p_invoice_id;
  if v_paid+p_amount > v_invoice.total then raise exception 'Payment exceeds invoice balance'; end if;

  insert into public.invoice_payments(business_id,invoice_id,amount,payment_method,reference,created_by)
  values(v_invoice.business_id,p_invoice_id,p_amount,p_payment_method,nullif(trim(p_reference),''),v_user)
  returning id into v_payment;

  v_paid := v_paid+p_amount;
  update public.invoices
  set payment_status=case when v_paid>=total then 'paid' else 'partial' end,
      payment_method=p_payment_method
  where id=p_invoice_id;
  return v_payment;
end;
$$;
revoke all on function public.record_invoice_payment(uuid,numeric,text,text) from public,anon;
grant execute on function public.record_invoice_payment(uuid,numeric,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) Update checkout for stock-tracked products AND non-stock services
-- ---------------------------------------------------------------------------

create or replace function public.complete_sale(
  p_business_id uuid,
  p_product_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_quantity numeric,
  p_rate numeric,
  p_discount numeric default 0,
  p_payment_method text default 'upi',
  p_payment_status text default 'paid',
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_product public.products%rowtype;
  v_customer uuid;
  v_invoice uuid;
  v_existing uuid;
  v_invoice_number text;
  v_prefix text;
  v_subtotal numeric(12,2);
  v_total numeric(12,2);
begin
  if v_user is null or not public.is_business_member(p_business_id) then raise exception 'Not authorized for this business'; end if;
  if not public.has_active_subscription(p_business_id) then raise exception 'SalesDesk subscription required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity<=0 or p_quantity>100000 then raise exception 'Invalid quantity'; end if;
  if p_rate is null or p_rate<0 or p_rate>100000000 then raise exception 'Invalid rate'; end if;
  if coalesce(p_discount,0)<0 then raise exception 'Invalid discount'; end if;
  if p_payment_method not in ('cash','upi','card','bank','other') then raise exception 'Invalid payment method'; end if;
  if p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment status'; end if;
  if length(coalesce(p_customer_name,''))>160 or length(coalesce(p_customer_phone,''))>30 then raise exception 'Customer details are too long'; end if;

  if p_idempotency_key is not null then
    select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;
    if v_existing is not null then return v_existing; end if;
  end if;

  select * into v_product from public.products
  where id=p_product_id and business_id=p_business_id and is_active=true for update;
  if not found then raise exception 'Product or service not found'; end if;
  if v_product.track_stock and v_product.stock<p_quantity then raise exception 'Not enough stock'; end if;

  v_subtotal := round((p_quantity*p_rate)::numeric,2);
  if coalesce(p_discount,0)>v_subtotal then raise exception 'Discount cannot exceed subtotal'; end if;
  v_total := v_subtotal-coalesce(p_discount,0);
  select upper(invoice_prefix) into v_prefix from public.businesses where id=p_business_id;
  v_prefix := coalesce(nullif(trim(v_prefix),''),'SD');
  v_invoice_number := v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  if nullif(trim(p_customer_phone),'') is not null then
    select id into v_customer from public.customers
    where business_id=p_business_id and phone=trim(p_customer_phone)
    order by created_at limit 1;
  end if;
  if v_customer is null then
    insert into public.customers(business_id,name,phone)
    values(p_business_id,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),''))
    returning id into v_customer;
  else
    update public.customers set name=coalesce(nullif(trim(p_customer_name),''),name) where id=v_customer;
  end if;

  insert into public.invoices(
    business_id,invoice_number,customer_id,customer_name,customer_phone,
    subtotal,discount,tax,total,payment_status,payment_method,created_by,idempotency_key
  ) values (
    p_business_id,v_invoice_number,v_customer,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),''),
    v_subtotal,coalesce(p_discount,0),0,v_total,p_payment_status,p_payment_method,v_user,p_idempotency_key
  ) returning id into v_invoice;

  insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total)
  values(v_invoice,v_product.id,v_product.name,p_quantity,p_rate,v_product.cost_price,v_subtotal);

  if v_product.track_stock then
    update public.products set stock=stock-p_quantity where id=v_product.id;
    insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by)
    values(p_business_id,v_product.id,'sale',-p_quantity,v_invoice,'SalesDesk sale',v_user);
  end if;
  return v_invoice;
exception when unique_violation then
  if p_idempotency_key is not null then
    select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;
    if v_existing is not null then return v_existing; end if;
  end if;
  raise;
end;
$$;
revoke all on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text,uuid) from public,anon;
grant execute on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Server-side business health summary to avoid downloading huge histories
-- ---------------------------------------------------------------------------

create or replace function public.business_health_summary(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  if not public.has_active_subscription(p_business_id) then raise exception 'SalesDesk subscription required' using errcode='42501'; end if;

  select jsonb_build_object(
    'revenue_30d',coalesce((select sum(total) from public.invoices where business_id=p_business_id and created_at>=now()-interval '30 days'),0),
    'transactions_30d',(select count(*) from public.invoices where business_id=p_business_id and created_at>=now()-interval '30 days'),
    'open_invoice_value',coalesce((select sum(total) from public.invoices where business_id=p_business_id and payment_status<>'paid'),0),
    'expenses_30d',coalesce((select sum(amount) from public.expenses where business_id=p_business_id and created_at>=now()-interval '30 days'),0),
    'customer_count',(select count(*) from public.customers where business_id=p_business_id),
    'low_stock_count',(select count(*) from public.products where business_id=p_business_id and is_active=true and track_stock=true and stock<=reorder_level),
    'inventory_value',coalesce((select sum(stock*cost_price) from public.products where business_id=p_business_id and is_active=true and track_stock=true),0)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.business_health_summary(uuid) from public,anon;
grant execute on function public.business_health_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11) Realtime for new operational data
-- ---------------------------------------------------------------------------

do $$
begin
  begin alter publication supabase_realtime add table public.suppliers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.purchases; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.invoice_payments; exception when duplicate_object then null; end;
end $$;
