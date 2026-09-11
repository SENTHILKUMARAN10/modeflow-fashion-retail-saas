-- SalesDesk people, permissions, CRM and intelligence completion
-- Migration version: 202609111000
-- Depends on the SalesDesk Professional Business OS and branch/document migrations.

-- ---------------------------------------------------------------------------
-- Team directory and branch-scoped access
-- ---------------------------------------------------------------------------
alter table public.business_members add column if not exists display_name text;
alter table public.business_members add column if not exists job_title text;
alter table public.business_members add column if not exists is_active boolean not null default true;
alter table public.business_members add column if not exists updated_at timestamptz not null default now();
alter table public.team_invitations add column if not exists branch_ids uuid[] not null default '{}';

create table if not exists public.business_member_branches(
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(business_id,user_id,branch_id),
  foreign key(business_id,user_id) references public.business_members(business_id,user_id) on delete cascade
);
create index if not exists idx_member_branches_user on public.business_member_branches(business_id,user_id);

-- Active membership is the basis of tenant access.
create or replace function public.is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1 from public.business_members
    where business_id=target_business and user_id=auth.uid() and is_active=true
  );
$$;

create or replace function public.has_business_role(target_business uuid,allowed_roles text[])
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1 from public.business_members
    where business_id=target_business and user_id=auth.uid() and is_active=true and role=any(allowed_roles)
  );
$$;

create or replace function public.salesdesk_can(target_business uuid,capability text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r text;
begin
  select role into r from public.business_members
  where business_id=target_business and user_id=auth.uid() and is_active=true;
  if r is null then return false; end if;
  if r in ('owner','admin') then return true; end if;
  return case capability
    when 'workspace.read' then true
    when 'reports.read' then true
    when 'products.read' then true
    when 'customers.read' then true
    when 'suppliers.read' then r in ('manager','accountant','staff')
    when 'products.manage' then r='manager'
    when 'customers.manage' then r in ('manager','sales','cashier')
    when 'sales.create' then r in ('manager','sales','cashier')
    when 'sales.manage' then r in ('manager','sales')
    when 'crm.manage' then r in ('manager','sales','staff')
    when 'expenses.manage' then r in ('manager','accountant')
    when 'purchases.manage' then r='manager'
    when 'finance.manage' then r in ('manager','accountant')
    when 'inventory.manage' then r='manager'
    when 'branches.manage' then r='manager'
    when 'goals.manage' then r='manager'
    when 'automation.manage' then r='manager'
    else false
  end;
end;
$$;
revoke all on function public.salesdesk_can(uuid,text) from public,anon;
grant execute on function public.salesdesk_can(uuid,text) to authenticated;

create or replace function public.salesdesk_has_branch_access(target_business uuid,target_branch uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r text; assigned_count integer;
begin
  if target_branch is null then return public.is_business_member(target_business); end if;
  select role into r from public.business_members
    where business_id=target_business and user_id=auth.uid() and is_active=true;
  if r is null then return false; end if;
  if r in ('owner','admin','manager','accountant') then return true; end if;
  select count(*) into assigned_count from public.business_member_branches
    where business_id=target_business and user_id=auth.uid();
  if assigned_count=0 then return true; end if; -- backwards-compatible until assignments are configured
  return exists(select 1 from public.business_member_branches
    where business_id=target_business and user_id=auth.uid() and branch_id=target_branch);
end;
$$;
revoke all on function public.salesdesk_has_branch_access(uuid,uuid) from public,anon;
grant execute on function public.salesdesk_has_branch_access(uuid,uuid) to authenticated;

create or replace function public.salesdesk_role_capabilities(target_business uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r text;
begin
  select role into r from public.business_members where business_id=target_business and user_id=auth.uid() and is_active=true;
  if r is null then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'role',r,
    'products_manage',public.salesdesk_can(target_business,'products.manage'),
    'customers_manage',public.salesdesk_can(target_business,'customers.manage'),
    'sales_create',public.salesdesk_can(target_business,'sales.create'),
    'sales_manage',public.salesdesk_can(target_business,'sales.manage'),
    'crm_manage',public.salesdesk_can(target_business,'crm.manage'),
    'expenses_manage',public.salesdesk_can(target_business,'expenses.manage'),
    'purchases_manage',public.salesdesk_can(target_business,'purchases.manage'),
    'finance_manage',public.salesdesk_can(target_business,'finance.manage'),
    'inventory_manage',public.salesdesk_can(target_business,'inventory.manage'),
    'branches_manage',public.salesdesk_can(target_business,'branches.manage'),
    'team_manage',r in ('owner','admin'),
    'billing_manage',r='owner'
  );
end;
$$;
revoke all on function public.salesdesk_role_capabilities(uuid) from public,anon;
grant execute on function public.salesdesk_role_capabilities(uuid) to authenticated;

alter table public.business_member_branches enable row level security;
drop policy if exists "members view branch assignments" on public.business_member_branches;
create policy "members view branch assignments" on public.business_member_branches for select
  using(user_id=auth.uid() or public.has_business_role(business_id,array['owner','admin']));
drop policy if exists "owners manage branch assignments" on public.business_member_branches;
create policy "owners manage branch assignments" on public.business_member_branches for all
  using(public.has_business_role(business_id,array['owner']))
  with check(public.has_business_role(business_id,array['owner']));

-- Direct browser membership mutations remain owner-only. Admin team changes go through audited server APIs.
drop policy if exists "owners manage memberships" on public.business_members;
drop policy if exists "owners insert memberships" on public.business_members;
drop policy if exists "owners update memberships" on public.business_members;
drop policy if exists "owners delete memberships" on public.business_members;
create policy "owners insert memberships" on public.business_members for insert
  with check(public.has_business_role(business_id,array['owner']));
create policy "owners update memberships" on public.business_members for update
  using(public.has_business_role(business_id,array['owner']))
  with check(public.has_business_role(business_id,array['owner']));
create policy "owners delete memberships" on public.business_members for delete
  using(public.has_business_role(business_id,array['owner']));

-- Tighten broad write policies from the earlier MVP.
drop policy if exists "members write customers" on public.customers;
create policy "authorized customer writes" on public.customers for all
  using(public.salesdesk_can(business_id,'customers.manage') and public.has_active_subscription(business_id))
  with check(public.salesdesk_can(business_id,'customers.manage') and public.has_active_subscription(business_id));

drop policy if exists "members create invoices" on public.invoices;
create policy "authorized invoice creation" on public.invoices for insert
  with check(public.salesdesk_can(business_id,'sales.create') and public.salesdesk_has_branch_access(business_id,branch_id) and created_by=auth.uid() and public.has_active_subscription(business_id));

drop policy if exists "members create invoice items" on public.invoice_items;
create policy "authorized invoice item creation" on public.invoice_items for insert
  with check(exists(select 1 from public.invoices i where i.id=invoice_id and public.salesdesk_can(i.business_id,'sales.create') and public.salesdesk_has_branch_access(i.business_id,i.branch_id) and public.has_active_subscription(i.business_id)));

drop policy if exists "members create expenses" on public.expenses;
create policy "authorized expense creation" on public.expenses for insert
  with check(public.salesdesk_can(business_id,'expenses.manage') and public.salesdesk_has_branch_access(business_id,branch_id) and created_by=auth.uid() and public.has_active_subscription(business_id));

drop policy if exists "members create invoice payments" on public.invoice_payments;
create policy "authorized invoice payments" on public.invoice_payments for insert
  with check((public.salesdesk_can(business_id,'finance.manage') or public.has_business_role(business_id,array['cashier'])) and created_by=auth.uid() and public.has_active_subscription(business_id));

drop policy if exists "members manage followups" on public.customer_followups;
create policy "authorized followup management" on public.customer_followups for all
  using(public.salesdesk_can(business_id,'crm.manage') and public.has_active_subscription(business_id))
  with check(public.salesdesk_can(business_id,'crm.manage') and public.has_active_subscription(business_id));

-- Branch scope is an additional restrictive guard on branch-aware operational records.
drop policy if exists "branch scoped invoice access" on public.invoices;
create policy "branch scoped invoice access" on public.invoices as restrictive for all
  using(public.salesdesk_has_branch_access(business_id,branch_id))
  with check(public.salesdesk_has_branch_access(business_id,branch_id));
drop policy if exists "branch scoped expense access" on public.expenses;
create policy "branch scoped expense access" on public.expenses as restrictive for all
  using(public.salesdesk_has_branch_access(business_id,branch_id))
  with check(public.salesdesk_has_branch_access(business_id,branch_id));
drop policy if exists "branch scoped purchase access" on public.purchases;
create policy "branch scoped purchase access" on public.purchases as restrictive for all
  using(public.salesdesk_has_branch_access(business_id,branch_id))
  with check(public.salesdesk_has_branch_access(business_id,branch_id));
drop policy if exists "branch scoped document access" on public.sales_documents;
create policy "branch scoped document access" on public.sales_documents as restrictive for all
  using(public.salesdesk_has_branch_access(business_id,branch_id))
  with check(public.salesdesk_has_branch_access(business_id,branch_id));

-- ---------------------------------------------------------------------------
-- CRM completion
-- ---------------------------------------------------------------------------
alter table public.customer_followups add column if not exists priority text not null default 'normal';
alter table public.customer_followups add column if not exists completed_at timestamptz;
alter table public.customer_followups add column if not exists outcome text;
alter table public.customer_followups drop constraint if exists customer_followups_priority_check;
alter table public.customer_followups add constraint customer_followups_priority_check check(priority in ('low','normal','high','urgent'));

create or replace function public.salesdesk_complete_followup(p_followup_id uuid,p_outcome text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.customer_followups%rowtype;
begin
  select * into f from public.customer_followups where id=p_followup_id for update;
  if not found then raise exception 'Follow-up not found'; end if;
  if not public.salesdesk_can(f.business_id,'crm.manage') then raise exception 'CRM access required'; end if;
  update public.customer_followups set status='done',completed_at=now(),outcome=nullif(trim(p_outcome),'') where id=p_followup_id;
end;
$$;
revoke all on function public.salesdesk_complete_followup(uuid,text) from public,anon;
grant execute on function public.salesdesk_complete_followup(uuid,text) to authenticated;

create or replace function public.salesdesk_update_customer_crm(p_customer_id uuid,p_status text,p_tags text[],p_company_name text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b uuid;
begin
  select business_id into b from public.customers where id=p_customer_id;
  if b is null then raise exception 'Customer not found'; end if;
  if not public.salesdesk_can(b,'customers.manage') then raise exception 'Customer access required'; end if;
  if p_status not in ('lead','active','inactive','blocked') then raise exception 'Invalid customer status'; end if;
  update public.customers set status=p_status,tags=coalesce(p_tags,'{}'::text[]),company_name=nullif(trim(p_company_name),'') where id=p_customer_id;
end;
$$;
revoke all on function public.salesdesk_update_customer_crm(uuid,text,text[],text) from public,anon;
grant execute on function public.salesdesk_update_customer_crm(uuid,text,text[],text) to authenticated;

-- ---------------------------------------------------------------------------
-- Supplier / payable completion
-- ---------------------------------------------------------------------------
alter table public.suppliers add column if not exists contact_person text;
alter table public.suppliers add column if not exists payment_terms_days integer not null default 0;
alter table public.suppliers add column if not exists tags text[] not null default '{}';
alter table public.suppliers drop constraint if exists suppliers_payment_terms_check;
alter table public.suppliers add constraint suppliers_payment_terms_check check(payment_terms_days between 0 and 365);

create or replace function public.salesdesk_supplier_aging(p_business_id uuid)
returns table(
  supplier_id uuid,supplier_name text,total_purchases numeric,total_paid numeric,total_due numeric,
  current_due numeric,due_1_30 numeric,due_31_60 numeric,due_61_plus numeric,open_purchases bigint
)
language sql stable security definer set search_path=public,pg_temp as $$
  with paid as(
    select purchase_id,sum(amount) paid from public.purchase_payments where business_id=p_business_id group by purchase_id
  ), base as(
    select p.supplier_id,coalesce(s.name,'No supplier') supplier_name,p.total,
      coalesce(pa.paid,0) paid,greatest(p.total-coalesce(pa.paid,0),0) balance,
      coalesce(p.due_date,p.purchase_date + coalesce(s.payment_terms_days,0)) due_date
    from public.purchases p left join public.suppliers s on s.id=p.supplier_id left join paid pa on pa.purchase_id=p.id
    where p.business_id=p_business_id and p.status<>'cancelled'
  )
  select b.supplier_id,b.supplier_name,sum(b.total),sum(b.paid),sum(b.balance),
    sum(case when b.balance>0 and b.due_date>=current_date then b.balance else 0 end),
    sum(case when b.balance>0 and b.due_date<current_date and b.due_date>=current_date-30 then b.balance else 0 end),
    sum(case when b.balance>0 and b.due_date<current_date-30 and b.due_date>=current_date-60 then b.balance else 0 end),
    sum(case when b.balance>0 and b.due_date<current_date-60 then b.balance else 0 end),
    count(*) filter(where b.balance>0)
  from base b
  where public.is_business_member(p_business_id)
  group by b.supplier_id,b.supplier_name
  order by sum(b.balance) desc,b.supplier_name;
$$;
revoke all on function public.salesdesk_supplier_aging(uuid) from public,anon;
grant execute on function public.salesdesk_supplier_aging(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Daily Brief v2 / analytics
-- ---------------------------------------------------------------------------
alter table public.invoices add column if not exists due_date date;
create index if not exists idx_invoices_business_due on public.invoices(business_id,payment_status,due_date) where payment_status<>'paid';
create index if not exists idx_followups_assignee_due on public.customer_followups(business_id,assigned_to,status,due_at);

create or replace function public.salesdesk_daily_brief_v2(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v jsonb; today_sales numeric; yesterday_sales numeric; month_sales numeric; prev_month_sales numeric; month_exp numeric; month_cogs numeric;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  select coalesce(sum(total),0) into today_sales from public.invoices where business_id=p_business_id and created_at>=date_trunc('day',now());
  select coalesce(sum(total),0) into yesterday_sales from public.invoices where business_id=p_business_id and created_at>=date_trunc('day',now())-interval '1 day' and created_at<date_trunc('day',now());
  select coalesce(sum(total),0) into month_sales from public.invoices where business_id=p_business_id and created_at>=date_trunc('month',now());
  select coalesce(sum(total),0) into prev_month_sales from public.invoices where business_id=p_business_id and created_at>=date_trunc('month',now())-interval '1 month' and created_at<date_trunc('month',now());
  select coalesce(sum(amount),0) into month_exp from public.expenses where business_id=p_business_id and expense_date>=date_trunc('month',current_date)::date;
  select coalesce(sum(ii.cost_price*ii.quantity),0) into month_cogs from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where i.business_id=p_business_id and i.created_at>=date_trunc('month',now());

  select jsonb_build_object(
    'today_sales',today_sales,
    'yesterday_sales',yesterday_sales,
    'today_change_pct',case when yesterday_sales>0 then round(((today_sales-yesterday_sales)/yesterday_sales)*100,1) else null end,
    'today_transactions',(select count(*) from public.invoices where business_id=p_business_id and created_at>=date_trunc('day',now())),
    'month_sales',month_sales,
    'previous_month_sales',prev_month_sales,
    'month_change_pct',case when prev_month_sales>0 then round(((month_sales-prev_month_sales)/prev_month_sales)*100,1) else null end,
    'month_expenses',month_exp,
    'month_cogs',month_cogs,
    'estimated_month_profit',month_sales-month_cogs-month_exp,
    'receivables',coalesce((select sum(case when i.payment_status='paid' then 0 else greatest(i.total-coalesce((select sum(ip.amount) from public.invoice_payments ip where ip.invoice_id=i.id),0),0) end) from public.invoices i where i.business_id=p_business_id),0),
    'overdue_receivables',coalesce((select sum(greatest(i.total-coalesce((select sum(ip.amount) from public.invoice_payments ip where ip.invoice_id=i.id),0),0)) from public.invoices i where i.business_id=p_business_id and i.payment_status<>'paid' and i.due_date is not null and i.due_date<current_date),0),
    'payables',coalesce((select sum(greatest(p.total-coalesce((select sum(pp.amount) from public.purchase_payments pp where pp.purchase_id=p.id),0),0)) from public.purchases p where p.business_id=p_business_id and p.payment_status<>'paid' and p.status<>'cancelled'),0),
    'low_stock',(select count(*) from public.products where business_id=p_business_id and is_active=true and track_stock=true and stock<=reorder_level),
    'leads',(select count(*) from public.customers where business_id=p_business_id and status='lead'),
    'due_followups',(select count(*) from public.customer_followups where business_id=p_business_id and status='open' and due_at is not null and due_at<=now()),
    'active_team',(select count(*) from public.business_members where business_id=p_business_id and is_active=true),
    'top_products',coalesce((select jsonb_agg(jsonb_build_object('name',x.product_name,'quantity',x.qty,'revenue',x.revenue)) from(
      select ii.product_name,sum(ii.quantity) qty,sum(ii.line_total) revenue from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id
      where i.business_id=p_business_id and i.created_at>=date_trunc('month',now()) group by ii.product_name order by sum(ii.line_total) desc limit 5
    ) x),'[]'::jsonb),
    'branch_performance',coalesce((select jsonb_agg(jsonb_build_object('branch_id',x.branch_id,'name',x.name,'revenue',x.revenue,'transactions',x.transactions)) from(
      select b.id branch_id,b.name,coalesce(sum(i.total),0) revenue,count(i.id) transactions from public.branches b left join public.invoices i on i.branch_id=b.id and i.created_at>=date_trunc('month',now())
      where b.business_id=p_business_id and b.is_active=true group by b.id,b.name order by coalesce(sum(i.total),0) desc
    ) x),'[]'::jsonb)
  ) into v;
  return v;
end;
$$;
revoke all on function public.salesdesk_daily_brief_v2(uuid) from public,anon;
grant execute on function public.salesdesk_daily_brief_v2(uuid) to authenticated;

-- Auditing / timestamps -----------------------------------------------------
do $$ begin
  drop trigger if exists trg_business_members_updated_at on public.business_members;
  create trigger trg_business_members_updated_at before update on public.business_members for each row execute function public.set_updated_at();
  drop trigger if exists trg_audit_member_branches on public.business_member_branches;
  create trigger trg_audit_member_branches after insert or update or delete on public.business_member_branches for each row execute function public.audit_business_change();
exception when undefined_function then null;
end $$;
