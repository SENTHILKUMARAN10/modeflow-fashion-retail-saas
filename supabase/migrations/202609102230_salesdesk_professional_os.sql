-- SalesDesk Professional Business OS expansion
-- Migration version: 202609102230 (unique to avoid duplicate-version conflicts)
-- Requires the existing SalesDesk scale migration.

create extension if not exists "pgcrypto";

-- Team roles ---------------------------------------------------------------
alter table public.business_members drop constraint if exists business_members_role_check;
alter table public.business_members add constraint business_members_role_check
  check(role in ('owner','admin','manager','accountant','cashier','sales','staff'));

-- Branches and warehouses --------------------------------------------------
create table if not exists public.branches(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  code text not null,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,code)
);
create table if not exists public.warehouses(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  code text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,code)
);
create table if not exists public.inventory_balances(
  business_id uuid not null references public.businesses(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key(warehouse_id,product_id)
);
alter table public.invoices add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.expenses add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.purchases add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.stock_movements add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;

insert into public.branches(business_id,name,code,created_by)
select b.id,'Main Branch','MAIN',b.created_by from public.businesses b
where not exists(select 1 from public.branches x where x.business_id=b.id);
insert into public.warehouses(business_id,branch_id,name,code,is_default,created_by)
select b.id,br.id,'Main Warehouse','MAIN',true,b.created_by
from public.businesses b
join lateral(select id from public.branches where business_id=b.id order by created_at limit 1) br on true
where not exists(select 1 from public.warehouses w where w.business_id=b.id);
insert into public.inventory_balances(business_id,warehouse_id,product_id,quantity)
select p.business_id,w.id,p.id,p.stock from public.products p
join lateral(select id from public.warehouses where business_id=p.business_id and is_default=true order by created_at limit 1) w on true
where p.track_stock=true on conflict(warehouse_id,product_id) do nothing;

-- Quotes and sales orders --------------------------------------------------
create table if not exists public.sales_documents(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  document_type text not null check(document_type in ('quote','sales_order')),
  document_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  issue_date date not null default current_date,
  expiry_date date,
  status text not null default 'draft' check(status in ('draft','sent','accepted','rejected','cancelled','fulfilled')),
  subtotal numeric(12,2) not null default 0 check(subtotal>=0),
  discount numeric(12,2) not null default 0 check(discount>=0),
  tax numeric(12,2) not null default 0 check(tax>=0),
  total numeric(12,2) not null default 0 check(total>=0),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,document_number)
);
create table if not exists public.sales_document_items(
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.sales_documents(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_name text not null,
  quantity numeric(12,3) not null check(quantity>0),
  rate numeric(12,2) not null check(rate>=0),
  tax_rate numeric(7,3) not null default 0 check(tax_rate>=0),
  line_total numeric(12,2) not null check(line_total>=0)
);

-- Returns and refunds ------------------------------------------------------
create table if not exists public.sales_returns(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  return_number text not null,
  reason text,
  refund_method text check(refund_method in ('cash','upi','card','bank','credit','other')),
  refund_amount numeric(12,2) not null default 0 check(refund_amount>=0),
  status text not null default 'completed' check(status in ('draft','completed','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(business_id,return_number)
);
create table if not exists public.sales_return_items(
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.sales_returns(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12,3) not null check(quantity>0),
  amount numeric(12,2) not null check(amount>=0),
  restock boolean not null default true
);

-- CRM ----------------------------------------------------------------------
alter table public.customers add column if not exists company_name text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists tags text[] not null default '{}';
alter table public.customers add column if not exists status text not null default 'active';
alter table public.customers drop constraint if exists customers_status_check;
alter table public.customers add constraint customers_status_check check(status in ('lead','active','inactive','blocked'));
create table if not exists public.customer_followups(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  note text,
  due_at timestamptz,
  status text not null default 'open' check(status in ('open','done','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payables -----------------------------------------------------------------
alter table public.purchases add column if not exists due_date date;
alter table public.purchases add column if not exists payment_status text not null default 'unpaid';
alter table public.purchases drop constraint if exists purchases_payment_status_check;
alter table public.purchases add constraint purchases_payment_status_check check(payment_status in ('unpaid','partial','paid'));
create table if not exists public.purchase_payments(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  amount numeric(12,2) not null check(amount>0),
  payment_method text not null default 'bank' check(payment_method in ('cash','upi','card','bank','other')),
  reference text,
  paid_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Team invitations ---------------------------------------------------------
create table if not exists public.team_invitations(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null check(role in ('admin','manager','accountant','cashier','sales','staff')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Goals, notifications and automation -------------------------------------
create table if not exists public.business_goals(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  metric text not null check(metric in ('revenue','profit','sales_count','new_customers','receivables')),
  target numeric(14,2) not null check(target>=0),
  period text not null default 'monthly' check(period in ('weekly','monthly','quarterly','yearly')),
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.business_notifications(
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  message text not null,
  severity text not null default 'info' check(severity in ('info','success','warning','critical')),
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.automation_rules(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  trigger_type text not null check(trigger_type in ('invoice_overdue','low_stock','daily_brief','weekly_report','followup_due')),
  channel text not null default 'in_app' check(channel in ('in_app','email','whatsapp')),
  config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes ------------------------------------------------------------------
create index if not exists idx_branches_business on public.branches(business_id,is_active,name);
create index if not exists idx_warehouses_business on public.warehouses(business_id,is_active,name);
create index if not exists idx_inventory_product on public.inventory_balances(business_id,product_id);
create index if not exists idx_sales_documents_business_date on public.sales_documents(business_id,document_type,created_at desc);
create index if not exists idx_sales_docs_customer on public.sales_documents(business_id,customer_id);
create index if not exists idx_sales_returns_business_date on public.sales_returns(business_id,created_at desc);
create index if not exists idx_followups_business_due on public.customer_followups(business_id,status,due_at);
create index if not exists idx_purchase_payments_purchase on public.purchase_payments(purchase_id,paid_at desc);
create index if not exists idx_team_invites_business on public.team_invitations(business_id,created_at desc);
create index if not exists idx_goals_business_active on public.business_goals(business_id,is_active,metric);
create index if not exists idx_notifications_business on public.business_notifications(business_id,read_at,created_at desc);
create index if not exists idx_automations_business on public.automation_rules(business_id,is_enabled,trigger_type);

-- RLS ----------------------------------------------------------------------
do $$ begin
  alter table public.branches enable row level security;
  alter table public.warehouses enable row level security;
  alter table public.inventory_balances enable row level security;
  alter table public.sales_documents enable row level security;
  alter table public.sales_document_items enable row level security;
  alter table public.sales_returns enable row level security;
  alter table public.sales_return_items enable row level security;
  alter table public.customer_followups enable row level security;
  alter table public.purchase_payments enable row level security;
  alter table public.team_invitations enable row level security;
  alter table public.business_goals enable row level security;
  alter table public.business_notifications enable row level security;
  alter table public.automation_rules enable row level security;
end $$;

drop policy if exists "members read branches" on public.branches;
create policy "members read branches" on public.branches for select using(public.is_business_member(business_id));
drop policy if exists "managers manage branches" on public.branches;
create policy "managers manage branches" on public.branches for all using(public.has_business_role(business_id,array['owner','admin','manager'])) with check(public.has_business_role(business_id,array['owner','admin','manager']));

drop policy if exists "members read warehouses" on public.warehouses;
create policy "members read warehouses" on public.warehouses for select using(public.is_business_member(business_id));
drop policy if exists "managers manage warehouses" on public.warehouses;
create policy "managers manage warehouses" on public.warehouses for all using(public.has_business_role(business_id,array['owner','admin','manager'])) with check(public.has_business_role(business_id,array['owner','admin','manager']));

drop policy if exists "members read balances" on public.inventory_balances;
create policy "members read balances" on public.inventory_balances for select using(public.is_business_member(business_id));

drop policy if exists "members read documents" on public.sales_documents;
create policy "members read documents" on public.sales_documents for select using(public.is_business_member(business_id));
drop policy if exists "sales team manage documents" on public.sales_documents;
create policy "sales team manage documents" on public.sales_documents for all using(public.has_business_role(business_id,array['owner','admin','manager','sales'])) with check(public.has_business_role(business_id,array['owner','admin','manager','sales']));

drop policy if exists "members read document items" on public.sales_document_items;
create policy "members read document items" on public.sales_document_items for select using(exists(select 1 from public.sales_documents d where d.id=document_id and public.is_business_member(d.business_id)));
drop policy if exists "sales team manage document items" on public.sales_document_items;
create policy "sales team manage document items" on public.sales_document_items for all using(exists(select 1 from public.sales_documents d where d.id=document_id and public.has_business_role(d.business_id,array['owner','admin','manager','sales']))) with check(exists(select 1 from public.sales_documents d where d.id=document_id and public.has_business_role(d.business_id,array['owner','admin','manager','sales'])));

drop policy if exists "members read returns" on public.sales_returns;
create policy "members read returns" on public.sales_returns for select using(public.is_business_member(business_id));
drop policy if exists "managers manage returns" on public.sales_returns;
create policy "managers manage returns" on public.sales_returns for all using(public.has_business_role(business_id,array['owner','admin','manager'])) with check(public.has_business_role(business_id,array['owner','admin','manager']));

drop policy if exists "members read return items" on public.sales_return_items;
create policy "members read return items" on public.sales_return_items for select using(exists(select 1 from public.sales_returns r where r.id=return_id and public.is_business_member(r.business_id)));

drop policy if exists "members read followups" on public.customer_followups;
create policy "members read followups" on public.customer_followups for select using(public.is_business_member(business_id));
drop policy if exists "members manage followups" on public.customer_followups;
create policy "members manage followups" on public.customer_followups for all using(public.is_business_member(business_id)) with check(public.is_business_member(business_id));

drop policy if exists "members read purchase payments" on public.purchase_payments;
create policy "members read purchase payments" on public.purchase_payments for select using(public.is_business_member(business_id));
drop policy if exists "finance manage purchase payments" on public.purchase_payments;
create policy "finance manage purchase payments" on public.purchase_payments for all using(public.has_business_role(business_id,array['owner','admin','manager','accountant'])) with check(public.has_business_role(business_id,array['owner','admin','manager','accountant']));

drop policy if exists "owners read team invitations" on public.team_invitations;
create policy "owners read team invitations" on public.team_invitations for select using(public.has_business_role(business_id,array['owner','admin']));
drop policy if exists "owners delete team invitations" on public.team_invitations;
create policy "owners delete team invitations" on public.team_invitations for delete using(public.has_business_role(business_id,array['owner','admin']));

drop policy if exists "members read goals" on public.business_goals;
create policy "members read goals" on public.business_goals for select using(public.is_business_member(business_id));
drop policy if exists "managers manage goals" on public.business_goals;
create policy "managers manage goals" on public.business_goals for all using(public.has_business_role(business_id,array['owner','admin','manager'])) with check(public.has_business_role(business_id,array['owner','admin','manager']));

drop policy if exists "members read notifications" on public.business_notifications;
create policy "members read notifications" on public.business_notifications for select using(public.is_business_member(business_id) and (user_id is null or user_id=auth.uid()));
drop policy if exists "members update own notifications" on public.business_notifications;
create policy "members update own notifications" on public.business_notifications for update using(public.is_business_member(business_id) and (user_id is null or user_id=auth.uid()));

drop policy if exists "members read automations" on public.automation_rules;
create policy "members read automations" on public.automation_rules for select using(public.is_business_member(business_id));
drop policy if exists "managers manage automations" on public.automation_rules;
create policy "managers manage automations" on public.automation_rules for all using(public.has_business_role(business_id,array['owner','admin','manager'])) with check(public.has_business_role(business_id,array['owner','admin','manager']));

-- Atomic branch creation ---------------------------------------------------
create or replace function public.create_branch_with_warehouse(p_business_id uuid,p_name text,p_code text,p_phone text default null,p_email text default null,p_address text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_branch uuid;v_code text:=upper(trim(p_code));
begin
 if v_user is null or not public.has_business_role(p_business_id,array['owner','admin','manager']) then raise exception 'Manager access required';end if;
 if length(trim(coalesce(p_name,'')))<2 or v_code!~'^[A-Z0-9-]{2,16}$' then raise exception 'Enter a valid branch name and code';end if;
 insert into public.branches(business_id,name,code,phone,email,address,created_by) values(p_business_id,trim(p_name),v_code,nullif(trim(p_phone),''),nullif(trim(p_email),''),nullif(trim(p_address),''),v_user) returning id into v_branch;
 insert into public.warehouses(business_id,branch_id,name,code,is_default,created_by) values(p_business_id,v_branch,trim(p_name)||' Warehouse',v_code||'-WH',false,v_user);
 return v_branch;
end $$;
revoke all on function public.create_branch_with_warehouse(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.create_branch_with_warehouse(uuid,text,text,text,text,text) to authenticated;

-- Atomic quote / sales-order creation -------------------------------------
create or replace function public.create_sales_document(p_business_id uuid,p_document_type text,p_customer_name text,p_customer_phone text,p_items jsonb,p_expiry_date date default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_doc uuid;v_number text;v_prefix text;v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_rate numeric;v_sub numeric:=0;v_line numeric;v_customer uuid;
begin
 if v_user is null or not public.has_business_role(p_business_id,array['owner','admin','manager','sales']) then raise exception 'Sales access required';end if;
 if p_document_type not in ('quote','sales_order') then raise exception 'Invalid document type';end if;
 if length(trim(coalesce(p_customer_name,'')))<2 then raise exception 'Customer name is required';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 items';end if;
 v_prefix:=case when p_document_type='quote' then 'QT' else 'SO' end;
 v_number:=v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
 if nullif(trim(p_customer_phone),'') is not null then select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1;end if;
 if v_customer is null then insert into public.customers(business_id,name,phone,status) values(p_business_id,trim(p_customer_name),nullif(trim(p_customer_phone),''),'lead') returning id into v_customer;end if;
 insert into public.sales_documents(business_id,document_type,document_number,customer_id,customer_name,customer_phone,expiry_date,notes,created_by) values(p_business_id,p_document_type,v_number,v_customer,trim(p_customer_name),nullif(trim(p_customer_phone),''),p_expiry_date,nullif(trim(p_notes),''),v_user) returning id into v_doc;
 for v_item in select value from jsonb_array_elements(p_items) loop
   v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
   if v_qty is null or v_qty<=0 or v_rate is null or v_rate<0 then raise exception 'Invalid document line';end if;
   select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true;
   if not found then raise exception 'Product or service not found';end if;
   v_line:=round(v_qty*v_rate,2);v_sub:=v_sub+v_line;
   insert into public.sales_document_items(document_id,product_id,item_name,quantity,rate,line_total) values(v_doc,v_product.id,v_product.name,v_qty,v_rate,v_line);
 end loop;
 update public.sales_documents set subtotal=v_sub,total=v_sub where id=v_doc;
 return v_doc;
end $$;
revoke all on function public.create_sales_document(uuid,text,text,text,jsonb,date,text) from public,anon;
grant execute on function public.create_sales_document(uuid,text,text,text,jsonb,date,text) to authenticated;

-- Atomic supplier payment --------------------------------------------------
create or replace function public.record_purchase_payment(p_purchase_id uuid,p_amount numeric,p_payment_method text default 'bank',p_reference text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_purchase public.purchases%rowtype;v_paid numeric;v_id uuid;
begin
 select * into v_purchase from public.purchases where id=p_purchase_id for update;if not found then raise exception 'Purchase not found';end if;
 if not public.has_business_role(v_purchase.business_id,array['owner','admin','manager','accountant']) then raise exception 'Finance access required';end if;
 if p_amount is null or p_amount<=0 then raise exception 'Payment amount must be positive';end if;
 select coalesce(sum(amount),0) into v_paid from public.purchase_payments where purchase_id=p_purchase_id;
 if v_paid+p_amount>v_purchase.total then raise exception 'Payment exceeds purchase balance';end if;
 insert into public.purchase_payments(business_id,purchase_id,amount,payment_method,reference,created_by) values(v_purchase.business_id,p_purchase_id,p_amount,p_payment_method,nullif(trim(p_reference),''),v_user) returning id into v_id;
 v_paid:=v_paid+p_amount;update public.purchases set payment_status=case when v_paid>=total then 'paid' else 'partial' end where id=p_purchase_id;return v_id;
end $$;
revoke all on function public.record_purchase_payment(uuid,numeric,text,text) from public,anon;
grant execute on function public.record_purchase_payment(uuid,numeric,text,text) to authenticated;

-- Daily Brief / command centre --------------------------------------------
create or replace function public.salesdesk_daily_brief(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v jsonb;
begin
 if auth.uid() is null or not public.is_business_member(p_business_id) then raise exception 'Not authorized';end if;
 select jsonb_build_object(
  'today_sales',coalesce((select sum(total) from public.invoices where business_id=p_business_id and created_at>=date_trunc('day',now())),0),
  'today_transactions',(select count(*) from public.invoices where business_id=p_business_id and created_at>=date_trunc('day',now())),
  'month_sales',coalesce((select sum(total) from public.invoices where business_id=p_business_id and created_at>=date_trunc('month',now())),0),
  'month_expenses',coalesce((select sum(amount) from public.expenses where business_id=p_business_id and created_at>=date_trunc('month',now())),0),
  'receivables',coalesce((select sum(i.total-coalesce((select sum(ip.amount) from public.invoice_payments ip where ip.invoice_id=i.id),0)) from public.invoices i where i.business_id=p_business_id and i.payment_status<>'paid'),0),
  'payables',coalesce((select sum(p.total-coalesce((select sum(pp.amount) from public.purchase_payments pp where pp.purchase_id=p.id),0)) from public.purchases p where p.business_id=p_business_id and p.payment_status<>'paid'),0),
  'low_stock',(select count(*) from public.products where business_id=p_business_id and is_active=true and track_stock=true and stock<=reorder_level),
  'open_followups',(select count(*) from public.customer_followups where business_id=p_business_id and status='open' and due_at is not null and due_at<=now()),
  'new_customers_30d',(select count(*) from public.customers where business_id=p_business_id and created_at>=now()-interval '30 days'),
  'branches',(select count(*) from public.branches where business_id=p_business_id and is_active=true)
 ) into v;return v;
end $$;
revoke all on function public.salesdesk_daily_brief(uuid) from public,anon;
grant execute on function public.salesdesk_daily_brief(uuid) to authenticated;

-- Standard updated_at triggers --------------------------------------------
do $$ begin
 drop trigger if exists trg_branches_updated_at on public.branches;create trigger trg_branches_updated_at before update on public.branches for each row execute function public.set_updated_at();
 drop trigger if exists trg_warehouses_updated_at on public.warehouses;create trigger trg_warehouses_updated_at before update on public.warehouses for each row execute function public.set_updated_at();
 drop trigger if exists trg_sales_documents_updated_at on public.sales_documents;create trigger trg_sales_documents_updated_at before update on public.sales_documents for each row execute function public.set_updated_at();
 drop trigger if exists trg_followups_updated_at on public.customer_followups;create trigger trg_followups_updated_at before update on public.customer_followups for each row execute function public.set_updated_at();
 drop trigger if exists trg_goals_updated_at on public.business_goals;create trigger trg_goals_updated_at before update on public.business_goals for each row execute function public.set_updated_at();
 drop trigger if exists trg_automation_rules_updated_at on public.automation_rules;create trigger trg_automation_rules_updated_at before update on public.automation_rules for each row execute function public.set_updated_at();
end $$;

-- Realtime -----------------------------------------------------------------
do $$ begin
 begin alter publication supabase_realtime add table public.branches;exception when duplicate_object then null;end;
 begin alter publication supabase_realtime add table public.sales_documents;exception when duplicate_object then null;end;
 begin alter publication supabase_realtime add table public.customer_followups;exception when duplicate_object then null;end;
 begin alter publication supabase_realtime add table public.business_notifications;exception when duplicate_object then null;end;
end $$;
