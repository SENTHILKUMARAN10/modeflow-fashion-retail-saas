-- ModeFlow production hardening migration
-- Run after 20260907_modeflow_realtime.sql.

create extension if not exists "pgcrypto";

-- Keep historical accounting correct: an invoice item must remember cost at sale time.
alter table public.invoice_items
  add column if not exists cost_price numeric(12,2) not null default 0;

-- Idempotency prevents duplicate invoices from double taps / retries.
alter table public.invoices
  add column if not exists idempotency_key uuid;

create unique index if not exists uq_invoices_business_idempotency
  on public.invoices(business_id, idempotency_key)
  where idempotency_key is not null;

-- Common data integrity constraints.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='products_nonnegative_values') then
    alter table public.products add constraint products_nonnegative_values
      check (selling_price >= 0 and cost_price >= 0 and stock >= 0 and reorder_level >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='invoice_totals_nonnegative') then
    alter table public.invoices add constraint invoice_totals_nonnegative
      check (subtotal >= 0 and discount >= 0 and tax >= 0 and total >= 0 and discount <= subtotal + tax);
  end if;
  if not exists (select 1 from pg_constraint where conname='invoice_items_positive_quantity') then
    alter table public.invoice_items add constraint invoice_items_positive_quantity
      check (quantity > 0 and rate >= 0 and cost_price >= 0 and line_total >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='expenses_positive_amount') then
    alter table public.expenses add constraint expenses_positive_amount check (amount > 0);
  end if;
end $$;

-- Consistent timestamps for mutable records.
alter table public.businesses add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();
alter table public.expenses add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at = now(); return new; end; $$;

-- Idempotently recreate updated_at triggers.
do $$
begin
  drop trigger if exists trg_businesses_updated_at on public.businesses;
  create trigger trg_businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
  drop trigger if exists trg_products_updated_at on public.products;
  create trigger trg_products_updated_at before update on public.products for each row execute function public.set_updated_at();
  drop trigger if exists trg_customers_updated_at on public.customers;
  create trigger trg_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
  drop trigger if exists trg_expenses_updated_at on public.expenses;
  create trigger trg_expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();
end $$;

-- Immutable audit trail for sensitive business mutations.
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_business_created on public.audit_logs(business_id,created_at desc);
alter table public.audit_logs enable row level security;
drop policy if exists "owners read audit logs" on public.audit_logs;
create policy "owners read audit logs" on public.audit_logs for select
  using (public.has_business_role(business_id,array['owner']));

create or replace function public.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_business uuid;
  v_entity text;
  v_id text;
begin
  v_entity := TG_TABLE_NAME;
  if TG_OP = 'DELETE' then
    v_business := case when TG_TABLE_NAME='businesses' then OLD.id else OLD.business_id end;
    v_id := coalesce((to_jsonb(OLD)->>'id'), (to_jsonb(OLD)->>'user_id'), '');
    insert into public.audit_logs(business_id,actor_user_id,action,entity_type,entity_id,old_data)
      values(v_business,auth.uid(),lower(TG_OP),v_entity,v_id,to_jsonb(OLD));
    return OLD;
  else
    v_business := case when TG_TABLE_NAME='businesses' then NEW.id else NEW.business_id end;
    v_id := coalesce((to_jsonb(NEW)->>'id'), (to_jsonb(NEW)->>'user_id'), '');
    insert into public.audit_logs(business_id,actor_user_id,action,entity_type,entity_id,old_data,new_data)
      values(v_business,auth.uid(),lower(TG_OP),v_entity,v_id,case when TG_OP='UPDATE' then to_jsonb(OLD) else null end,to_jsonb(NEW));
    return NEW;
  end if;
end;
$$;

-- Audit tables where business-impacting writes happen.
do $$
begin
  drop trigger if exists trg_audit_products on public.products;
  create trigger trg_audit_products after insert or update or delete on public.products for each row execute function public.audit_business_change();
  drop trigger if exists trg_audit_expenses on public.expenses;
  create trigger trg_audit_expenses after insert or update or delete on public.expenses for each row execute function public.audit_business_change();
  drop trigger if exists trg_audit_invoices on public.invoices;
  create trigger trg_audit_invoices after insert or update or delete on public.invoices for each row execute function public.audit_business_change();
  drop trigger if exists trg_audit_members on public.business_members;
  create trigger trg_audit_members after insert or update or delete on public.business_members for each row execute function public.audit_business_change();
end $$;

-- Harden first workspace creation. Explicitly revoke default PUBLIC execution.
create or replace function public.create_business_with_owner(
  p_name text,
  p_slug text default null,
  p_phone text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_business uuid;
  v_slug text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(p_name)) > 120 then
    raise exception 'Business name must be between 2 and 120 characters';
  end if;
  if (select count(*) from public.business_members where user_id=v_user) >= 20 then
    raise exception 'Workspace limit reached';
  end if;
  v_slug := coalesce(nullif(trim(p_slug),''), lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g')) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.businesses(name,slug,phone,address,created_by)
    values(trim(p_name),v_slug,nullif(trim(p_phone),''),nullif(trim(p_address),''),v_user)
    returning id into v_business;
  insert into public.business_members(business_id,user_id,role) values(v_business,v_user,'owner');
  return v_business;
end;
$$;
revoke all on function public.create_business_with_owner(text,text,text,text) from public, anon;
grant execute on function public.create_business_with_owner(text,text,text,text) to authenticated;

-- Production checkout with validation, row locking and idempotency.
drop function if exists public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text);
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
  v_subtotal numeric(12,2);
  v_total numeric(12,2);
begin
  if v_user is null or not public.is_business_member(p_business_id) then raise exception 'Not authorized for this business'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000 then raise exception 'Invalid quantity'; end if;
  if p_rate is null or p_rate < 0 or p_rate > 100000000 then raise exception 'Invalid rate'; end if;
  if coalesce(p_discount,0) < 0 then raise exception 'Invalid discount'; end if;
  if p_payment_method not in ('cash','upi','card','bank','other') then raise exception 'Invalid payment method'; end if;
  if p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment status'; end if;
  if length(coalesce(p_customer_name,'')) > 160 or length(coalesce(p_customer_phone,'')) > 30 then raise exception 'Customer details are too long'; end if;

  if p_idempotency_key is not null then
    select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;
    if v_existing is not null then return v_existing; end if;
  end if;

  select * into v_product from public.products
    where id=p_product_id and business_id=p_business_id and is_active=true for update;
  if not found then raise exception 'Product not found'; end if;
  if v_product.stock < p_quantity then raise exception 'Not enough stock'; end if;

  v_subtotal := round((p_quantity*p_rate)::numeric,2);
  if coalesce(p_discount,0) > v_subtotal then raise exception 'Discount cannot exceed subtotal'; end if;
  v_total := v_subtotal-coalesce(p_discount,0);
  v_invoice_number := 'MF-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  if nullif(trim(p_customer_phone),'') is not null then
    select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1;
  end if;
  if v_customer is null then
    insert into public.customers(business_id,name,phone)
      values(p_business_id,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),'')) returning id into v_customer;
  else
    update public.customers set name=coalesce(nullif(trim(p_customer_name),''),name) where id=v_customer;
  end if;

  insert into public.invoices(business_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_by,idempotency_key)
    values(p_business_id,v_invoice_number,v_customer,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),''),v_subtotal,coalesce(p_discount,0),0,v_total,p_payment_status,p_payment_method,v_user,p_idempotency_key)
    returning id into v_invoice;

  insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total)
    values(v_invoice,v_product.id,v_product.name,p_quantity,p_rate,v_product.cost_price,v_subtotal);
  update public.products set stock=stock-p_quantity where id=v_product.id;
  insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by)
    values(p_business_id,v_product.id,'sale',-p_quantity,v_invoice,'ModeFlow POS sale',v_user);
  return v_invoice;
exception when unique_violation then
  if p_idempotency_key is not null then
    select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;
    if v_existing is not null then return v_existing; end if;
  end if;
  raise;
end;
$$;
revoke all on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text,uuid) from public, anon;
grant execute on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text,uuid) to authenticated;

-- Harden delete-sale RPC too.
revoke all on function public.delete_sale(uuid) from public, anon;
grant execute on function public.delete_sale(uuid) to authenticated;

-- Lock down helper mutation functions from anonymous callers.
revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.audit_business_change() from public, anon;

-- Realtime audit logs are intentionally NOT published; sensitive history is query-only.
