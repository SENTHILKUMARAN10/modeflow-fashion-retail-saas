-- SalesDesk professional operations completion: adaptive onboarding, branches, warehouses,
-- stock transfers and quote/order conversion. Apply after 202609102230_salesdesk_professional_os.sql.

create extension if not exists "pgcrypto";

-- Adaptive business profile -------------------------------------------------
alter table public.businesses add column if not exists business_type text;
alter table public.businesses add column if not exists sell_mode text;
alter table public.businesses add column if not exists industry text;
alter table public.businesses add column if not exists country_code text not null default 'IN';
alter table public.businesses add column if not exists tax_mode text not null default 'none';
alter table public.businesses add column if not exists financial_year_start_month integer not null default 4;
alter table public.businesses add column if not exists module_config jsonb not null default '{}'::jsonb;
alter table public.businesses add column if not exists onboarding_completed_at timestamptz;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='businesses_sell_mode_check') then
    alter table public.businesses add constraint businesses_sell_mode_check
      check(sell_mode is null or sell_mode in ('products','services','both'));
  end if;
  if not exists(select 1 from pg_constraint where conname='businesses_tax_mode_check') then
    alter table public.businesses add constraint businesses_tax_mode_check
      check(tax_mode in ('none','gst','vat','sales_tax','other'));
  end if;
  if not exists(select 1 from pg_constraint where conname='businesses_fy_month_check') then
    alter table public.businesses add constraint businesses_fy_month_check
      check(financial_year_start_month between 1 and 12);
  end if;
end $$;

-- Memberships may optionally be scoped to a branch. Null means all branches.
alter table public.business_members add column if not exists branch_id uuid references public.branches(id) on delete set null;

-- Sales document lineage ----------------------------------------------------
alter table public.sales_documents add column if not exists parent_document_id uuid references public.sales_documents(id) on delete set null;
alter table public.sales_documents add column if not exists converted_invoice_id uuid references public.invoices(id) on delete set null;
alter table public.sales_documents add column if not exists converted_at timestamptz;
alter table public.invoices add column if not exists source_document_id uuid references public.sales_documents(id) on delete set null;

-- Warehouse transfers -------------------------------------------------------
create table if not exists public.inventory_transfers(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  from_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  to_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  transfer_number text not null,
  notes text,
  status text not null default 'completed' check(status in ('draft','completed','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(business_id,transfer_number),
  check(from_warehouse_id<>to_warehouse_id)
);

create table if not exists public.inventory_transfer_items(
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.inventory_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity numeric(14,3) not null check(quantity>0)
);

create index if not exists idx_members_business_branch on public.business_members(business_id,branch_id,user_id);
create index if not exists idx_transfers_business_date on public.inventory_transfers(business_id,created_at desc);
create index if not exists idx_transfer_items_transfer on public.inventory_transfer_items(transfer_id);
create index if not exists idx_docs_parent on public.sales_documents(parent_document_id) where parent_document_id is not null;

alter table public.inventory_transfers enable row level security;
alter table public.inventory_transfer_items enable row level security;

drop policy if exists "members read transfers" on public.inventory_transfers;
create policy "members read transfers" on public.inventory_transfers for select
  using(public.is_business_member(business_id));
drop policy if exists "managers manage transfers" on public.inventory_transfers;
create policy "managers manage transfers" on public.inventory_transfers for all
  using(public.has_business_role(business_id,array['owner','admin','manager']))
  with check(public.has_business_role(business_id,array['owner','admin','manager']));

drop policy if exists "members read transfer items" on public.inventory_transfer_items;
create policy "members read transfer items" on public.inventory_transfer_items for select
  using(exists(select 1 from public.inventory_transfers t where t.id=transfer_id and public.is_business_member(t.business_id)));

-- Add transfer movement types while preserving existing movement history.
alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements add constraint stock_movements_movement_type_check
  check(movement_type in ('purchase','sale','adjustment','return','transfer_out','transfer_in'));

-- Complete onboarding in one server-authorized call -------------------------
create or replace function public.complete_business_onboarding(
  p_business_id uuid,
  p_business_name text,
  p_business_type text,
  p_sell_mode text,
  p_country_code text default 'IN',
  p_currency text default 'INR',
  p_tax_mode text default 'none',
  p_financial_year_start_month integer default 4,
  p_industry text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_type text:=lower(trim(coalesce(p_business_type,'')));
  v_mode text:=lower(trim(coalesce(p_sell_mode,'')));
  v_modules jsonb;
  v_branch uuid;
  v_wh uuid;
begin
  if v_user is null or not public.has_business_role(p_business_id,array['owner','admin']) then
    raise exception 'Owner or admin access required';
  end if;
  if length(trim(coalesce(p_business_name,'')))<2 then raise exception 'Business name is required'; end if;
  if v_type not in ('retail','wholesale','services','food','manufacturing','agency','professional','distribution','other') then
    raise exception 'Invalid business type';
  end if;
  if v_mode not in ('products','services','both') then raise exception 'Invalid selling mode'; end if;
  if p_financial_year_start_month not between 1 and 12 then raise exception 'Invalid financial year month'; end if;

  v_modules:=jsonb_build_object(
    'dashboard',true,'sales',true,'customers',true,'finance',true,'documents',true,'reports',true,'team',true,
    'inventory',v_mode<>'services',
    'purchasing',v_mode<>'services' and v_type not in ('agency','professional'),
    'suppliers',v_mode<>'services' and v_type not in ('agency','professional'),
    'branches',v_type in ('retail','wholesale','food','manufacturing','distribution'),
    'crm',true
  );

  update public.businesses set
    name=trim(p_business_name),
    business_type=v_type,
    sell_mode=v_mode,
    industry=nullif(trim(p_industry),''),
    country_code=upper(left(trim(coalesce(p_country_code,'IN')),3)),
    currency=upper(trim(coalesce(p_currency,'INR'))),
    tax_mode=lower(trim(coalesce(p_tax_mode,'none'))),
    financial_year_start_month=p_financial_year_start_month,
    module_config=v_modules,
    onboarding_completed_at=coalesce(onboarding_completed_at,now()),
    updated_at=now()
  where id=p_business_id;

  select id into v_branch from public.branches where business_id=p_business_id and is_active=true order by created_at limit 1;
  if v_branch is null then
    insert into public.branches(business_id,name,code,created_by)
    values(p_business_id,'Main Branch','MAIN',v_user) returning id into v_branch;
  end if;
  select id into v_wh from public.warehouses where business_id=p_business_id and is_default=true order by created_at limit 1;
  if v_wh is null then
    insert into public.warehouses(business_id,branch_id,name,code,is_default,created_by)
    values(p_business_id,v_branch,'Main Warehouse','MAIN',true,v_user) returning id into v_wh;
  end if;

  insert into public.inventory_balances(business_id,warehouse_id,product_id,quantity)
  select p.business_id,v_wh,p.id,p.stock from public.products p
  where p.business_id=p_business_id and p.track_stock=true
  on conflict(warehouse_id,product_id) do nothing;

  return jsonb_build_object('business_id',p_business_id,'modules',v_modules,'branch_id',v_branch,'warehouse_id',v_wh);
end;
$$;
revoke all on function public.complete_business_onboarding(uuid,text,text,text,text,text,text,integer,text) from public,anon;
grant execute on function public.complete_business_onboarding(uuid,text,text,text,text,text,text,integer,text) to authenticated;

-- Warehouse stock is derived so existing sales/purchase code remains compatible.
create or replace function public.salesdesk_warehouse_stock(p_business_id uuid)
returns table(warehouse_id uuid,warehouse_name text,is_default boolean,product_id uuid,product_name text,quantity numeric)
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  with access_check as (
    select 1 where auth.uid() is not null and public.is_business_member(p_business_id)
  ), wh as (
    select w.id,w.name,w.is_default from public.warehouses w,access_check
    where w.business_id=p_business_id and w.is_active=true
  ), non_default as (
    select ib.product_id,sum(ib.quantity) qty
    from public.inventory_balances ib join wh w on w.id=ib.warehouse_id and not w.is_default
    group by ib.product_id
  )
  select w.id,w.name,w.is_default,p.id,p.name,
    case when w.is_default then greatest(p.stock-coalesce(nd.qty,0),0)
         else coalesce(ib.quantity,0) end::numeric
  from wh w
  cross join public.products p
  left join non_default nd on nd.product_id=p.id
  left join public.inventory_balances ib on ib.warehouse_id=w.id and ib.product_id=p.id
  where p.business_id=p_business_id and p.is_active=true and p.track_stock=true
  order by w.is_default desc,w.name,p.name;
$$;
revoke all on function public.salesdesk_warehouse_stock(uuid) from public,anon;
grant execute on function public.salesdesk_warehouse_stock(uuid) to authenticated;

-- Atomic multi-line warehouse transfer --------------------------------------
create or replace function public.transfer_inventory(
  p_business_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_transfer uuid;
  v_number text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_from_default boolean;
  v_to_default boolean;
  v_available numeric;
  v_nondefault numeric;
begin
  if v_user is null or not public.has_business_role(p_business_id,array['owner','admin','manager']) then raise exception 'Manager access required'; end if;
  if p_from_warehouse_id=p_to_warehouse_id then raise exception 'Choose two different warehouses'; end if;
  select is_default into v_from_default from public.warehouses where id=p_from_warehouse_id and business_id=p_business_id and is_active=true;
  if not found then raise exception 'Source warehouse not found'; end if;
  select is_default into v_to_default from public.warehouses where id=p_to_warehouse_id and business_id=p_business_id and is_active=true;
  if not found then raise exception 'Destination warehouse not found'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 transfer items'; end if;

  v_number:='TR-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  insert into public.inventory_transfers(business_id,from_warehouse_id,to_warehouse_id,transfer_number,notes,status,created_by,completed_at)
  values(p_business_id,p_from_warehouse_id,p_to_warehouse_id,v_number,nullif(trim(p_notes),''),'completed',v_user,now()) returning id into v_transfer;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=(v_item->>'quantity')::numeric;
    if v_qty is null or v_qty<=0 then raise exception 'Transfer quantity must be positive'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true and track_stock=true for update;
    if not found then raise exception 'Tracked product not found'; end if;

    if v_from_default then
      select coalesce(sum(ib.quantity),0) into v_nondefault
      from public.inventory_balances ib join public.warehouses w on w.id=ib.warehouse_id
      where ib.business_id=p_business_id and ib.product_id=v_product.id and not w.is_default and w.is_active=true;
      v_available:=greatest(v_product.stock-v_nondefault,0);
    else
      select coalesce(quantity,0) into v_available from public.inventory_balances
      where warehouse_id=p_from_warehouse_id and product_id=v_product.id;
      v_available:=coalesce(v_available,0);
    end if;
    if v_available<v_qty then raise exception 'Not enough stock for % in source warehouse',v_product.name; end if;

    insert into public.inventory_transfer_items(transfer_id,product_id,product_name,quantity)
    values(v_transfer,v_product.id,v_product.name,v_qty);

    if not v_from_default then
      update public.inventory_balances set quantity=quantity-v_qty,updated_at=now()
      where warehouse_id=p_from_warehouse_id and product_id=v_product.id;
    end if;
    if not v_to_default then
      insert into public.inventory_balances(business_id,warehouse_id,product_id,quantity)
      values(p_business_id,p_to_warehouse_id,v_product.id,v_qty)
      on conflict(warehouse_id,product_id) do update set quantity=public.inventory_balances.quantity+excluded.quantity,updated_at=now();
    end if;

    insert into public.stock_movements(business_id,product_id,warehouse_id,movement_type,quantity,reference_id,note,created_by)
    values(p_business_id,v_product.id,p_from_warehouse_id,'transfer_out',-v_qty,v_transfer,v_number,v_user);
    insert into public.stock_movements(business_id,product_id,warehouse_id,movement_type,quantity,reference_id,note,created_by)
    values(p_business_id,v_product.id,p_to_warehouse_id,'transfer_in',v_qty,v_transfer,v_number,v_user);
  end loop;
  return v_transfer;
end;
$$;
revoke all on function public.transfer_inventory(uuid,uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.transfer_inventory(uuid,uuid,uuid,jsonb,text) to authenticated;

-- Branch-aware document creation --------------------------------------------
create or replace function public.create_sales_document_v2(
  p_business_id uuid,
  p_branch_id uuid,
  p_document_type text,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_expiry_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid:=auth.uid();v_doc uuid;v_number text;v_item jsonb;v_product public.products%rowtype;
  v_qty numeric;v_rate numeric;v_sub numeric:=0;v_line numeric;v_customer uuid;
begin
  if v_user is null or not public.has_business_role(p_business_id,array['owner','admin','manager','sales']) then raise exception 'Sales access required'; end if;
  if p_document_type not in ('quote','sales_order') then raise exception 'Invalid document type'; end if;
  if p_branch_id is not null and not exists(select 1 from public.branches where id=p_branch_id and business_id=p_business_id and is_active=true) then raise exception 'Branch not found'; end if;
  if length(trim(coalesce(p_customer_name,'')))<2 then raise exception 'Customer name is required'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 items'; end if;
  v_number:=(case when p_document_type='quote' then 'QT' else 'SO' end)||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  if nullif(trim(p_customer_phone),'') is not null then select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1; end if;
  if v_customer is null then insert into public.customers(business_id,name,phone,status) values(p_business_id,trim(p_customer_name),nullif(trim(p_customer_phone),''),'lead') returning id into v_customer; end if;
  insert into public.sales_documents(business_id,branch_id,document_type,document_number,customer_id,customer_name,customer_phone,expiry_date,notes,created_by)
  values(p_business_id,p_branch_id,p_document_type,v_number,v_customer,trim(p_customer_name),nullif(trim(p_customer_phone),''),p_expiry_date,nullif(trim(p_notes),''),v_user) returning id into v_doc;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
    if v_qty is null or v_qty<=0 or v_rate is null or v_rate<0 then raise exception 'Invalid document line'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true;
    if not found then raise exception 'Product or service not found'; end if;
    v_line:=round(v_qty*v_rate,2);v_sub:=v_sub+v_line;
    insert into public.sales_document_items(document_id,product_id,item_name,quantity,rate,line_total) values(v_doc,v_product.id,v_product.name,v_qty,v_rate,v_line);
  end loop;
  update public.sales_documents set subtotal=v_sub,total=v_sub where id=v_doc;
  return v_doc;
end;
$$;
revoke all on function public.create_sales_document_v2(uuid,uuid,text,text,text,jsonb,date,text) from public,anon;
grant execute on function public.create_sales_document_v2(uuid,uuid,text,text,text,jsonb,date,text) to authenticated;

-- Quote -> sales order ------------------------------------------------------
create or replace function public.convert_quote_to_order(p_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_user uuid:=auth.uid();v_src public.sales_documents%rowtype;v_new uuid;v_number text;
begin
  select * into v_src from public.sales_documents where id=p_document_id for update;
  if not found or v_src.document_type<>'quote' then raise exception 'Quote not found'; end if;
  if not public.has_business_role(v_src.business_id,array['owner','admin','manager','sales']) then raise exception 'Sales access required'; end if;
  if v_src.status in ('rejected','cancelled','fulfilled') then raise exception 'This quote cannot be converted'; end if;
  v_number:='SO-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  insert into public.sales_documents(business_id,branch_id,document_type,document_number,customer_id,customer_name,customer_phone,issue_date,status,subtotal,discount,tax,total,notes,parent_document_id,created_by)
  values(v_src.business_id,v_src.branch_id,'sales_order',v_number,v_src.customer_id,v_src.customer_name,v_src.customer_phone,current_date,'accepted',v_src.subtotal,v_src.discount,v_src.tax,v_src.total,v_src.notes,v_src.id,v_user) returning id into v_new;
  insert into public.sales_document_items(document_id,product_id,item_name,quantity,rate,tax_rate,line_total)
  select v_new,product_id,item_name,quantity,rate,tax_rate,line_total from public.sales_document_items where document_id=v_src.id;
  update public.sales_documents set status='accepted' where id=v_src.id;
  return v_new;
end;
$$;
revoke all on function public.convert_quote_to_order(uuid) from public,anon;
grant execute on function public.convert_quote_to_order(uuid) to authenticated;

-- Quote/order -> invoice with stock deduction -------------------------------
create or replace function public.convert_sales_document_to_invoice(
  p_document_id uuid,
  p_payment_method text default 'bank',
  p_payment_status text default 'unpaid'
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid:=auth.uid();v_doc public.sales_documents%rowtype;v_invoice uuid;v_number text;v_prefix text;v_line record;
  v_product public.products%rowtype;v_wh uuid;v_wh_default boolean;v_available numeric;v_nondefault numeric;
begin
  select * into v_doc from public.sales_documents where id=p_document_id for update;
  if not found then raise exception 'Sales document not found'; end if;
  if not public.has_business_role(v_doc.business_id,array['owner','admin','manager','sales','cashier']) then raise exception 'Sales access required'; end if;
  if v_doc.converted_invoice_id is not null then return v_doc.converted_invoice_id; end if;
  if v_doc.status in ('rejected','cancelled','fulfilled') then raise exception 'This document cannot be invoiced'; end if;
  if p_payment_method not in ('cash','upi','card','bank','other') then raise exception 'Invalid payment method'; end if;
  if p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment status'; end if;

  select upper(invoice_prefix) into v_prefix from public.businesses where id=v_doc.business_id;
  v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');
  v_number:=v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  select w.id,w.is_default into v_wh,v_wh_default from public.warehouses w
  where w.business_id=v_doc.business_id and w.is_active=true and (v_doc.branch_id is null or w.branch_id=v_doc.branch_id)
  order by case when v_doc.branch_id is not null and w.branch_id=v_doc.branch_id then 0 when w.is_default then 1 else 2 end,w.created_at limit 1;

  -- Lock and validate every stock-tracked line before creating the invoice.
  for v_line in select * from public.sales_document_items where document_id=v_doc.id order by id loop
    if v_line.product_id is null then continue; end if;
    select * into v_product from public.products where id=v_line.product_id and business_id=v_doc.business_id and is_active=true for update;
    if not found then raise exception 'Product or service no longer exists'; end if;
    if v_product.track_stock then
      if v_wh is null or coalesce(v_wh_default,false) then
        select coalesce(sum(ib.quantity),0) into v_nondefault from public.inventory_balances ib join public.warehouses w on w.id=ib.warehouse_id
        where ib.business_id=v_doc.business_id and ib.product_id=v_product.id and not w.is_default and w.is_active=true;
        v_available:=greatest(v_product.stock-v_nondefault,0);
      else
        select coalesce(quantity,0) into v_available from public.inventory_balances where warehouse_id=v_wh and product_id=v_product.id;
        v_available:=coalesce(v_available,0);
      end if;
      if v_available<v_line.quantity then raise exception 'Not enough stock for %',v_product.name; end if;
    end if;
  end loop;

  insert into public.invoices(business_id,branch_id,source_document_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_by)
  values(v_doc.business_id,v_doc.branch_id,v_doc.id,v_number,v_doc.customer_id,v_doc.customer_name,v_doc.customer_phone,v_doc.subtotal,v_doc.discount,v_doc.tax,v_doc.total,p_payment_status,p_payment_method,v_user)
  returning id into v_invoice;

  for v_line in select * from public.sales_document_items where document_id=v_doc.id order by id loop
    select * into v_product from public.products where id=v_line.product_id and business_id=v_doc.business_id and is_active=true;
    insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total)
    values(v_invoice,v_line.product_id,v_line.item_name,v_line.quantity,v_line.rate,coalesce(v_product.cost_price,0),v_line.line_total);
    if v_product.track_stock then
      update public.products set stock=stock-v_line.quantity where id=v_product.id;
      if v_wh is not null and not coalesce(v_wh_default,false) then
        update public.inventory_balances set quantity=quantity-v_line.quantity,updated_at=now() where warehouse_id=v_wh and product_id=v_product.id;
      end if;
      insert into public.stock_movements(business_id,product_id,warehouse_id,movement_type,quantity,reference_id,note,created_by)
      values(v_doc.business_id,v_product.id,v_wh,'sale',-v_line.quantity,v_invoice,'Converted from '||v_doc.document_number,v_user);
    end if;
  end loop;

  update public.sales_documents set status='fulfilled',converted_invoice_id=v_invoice,converted_at=now() where id=v_doc.id;
  return v_invoice;
end;
$$;
revoke all on function public.convert_sales_document_to_invoice(uuid,text,text) from public,anon;
grant execute on function public.convert_sales_document_to_invoice(uuid,text,text) to authenticated;

-- Branch summary ------------------------------------------------------------
create or replace function public.salesdesk_branch_summary(p_business_id uuid,p_branch_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare v jsonb;
begin
  if auth.uid() is null or not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  if not exists(select 1 from public.branches where id=p_branch_id and business_id=p_business_id) then raise exception 'Branch not found'; end if;
  select jsonb_build_object(
    'sales_30d',coalesce((select sum(total) from public.invoices where business_id=p_business_id and branch_id=p_branch_id and created_at>=now()-interval '30 days'),0),
    'transactions_30d',(select count(*) from public.invoices where business_id=p_business_id and branch_id=p_branch_id and created_at>=now()-interval '30 days'),
    'expenses_30d',coalesce((select sum(amount) from public.expenses where business_id=p_business_id and branch_id=p_branch_id and created_at>=now()-interval '30 days'),0),
    'open_documents',(select count(*) from public.sales_documents where business_id=p_business_id and branch_id=p_branch_id and status not in ('fulfilled','cancelled','rejected')),
    'warehouses',(select count(*) from public.warehouses where business_id=p_business_id and branch_id=p_branch_id and is_active=true)
  ) into v;
  return v;
end;
$$;
revoke all on function public.salesdesk_branch_summary(uuid,uuid) from public,anon;
grant execute on function public.salesdesk_branch_summary(uuid,uuid) to authenticated;

-- Realtime ------------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.inventory_transfers; exception when duplicate_object then null; end;
end $$;
