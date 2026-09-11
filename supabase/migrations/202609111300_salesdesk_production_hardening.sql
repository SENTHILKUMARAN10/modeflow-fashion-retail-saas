-- SalesDesk production hardening: integrity guards and high-traffic indexes
-- Migration version: 202609111300
-- Apply after the SalesDesk professional operations/automation migrations.

-- High-traffic tenant indexes ------------------------------------------------
create index if not exists idx_business_members_active_role
  on public.business_members(business_id,is_active,role,user_id);
create index if not exists idx_products_business_active_name
  on public.products(business_id,is_active,name);
create index if not exists idx_customers_business_phone
  on public.customers(business_id,phone) where phone is not null;
create index if not exists idx_customers_business_email
  on public.customers(business_id,email) where email is not null;
create index if not exists idx_invoices_business_created
  on public.invoices(business_id,created_at desc);
create index if not exists idx_invoices_receivables_due
  on public.invoices(business_id,payment_status,due_date)
  where payment_status in ('unpaid','partial');
create index if not exists idx_expenses_business_expense_date
  on public.expenses(business_id,expense_date desc);
create index if not exists idx_stock_movements_business_created
  on public.stock_movements(business_id,created_at desc);
create index if not exists idx_followups_business_due_open
  on public.customer_followups(business_id,due_at)
  where status='open';
create index if not exists idx_sales_documents_business_created
  on public.sales_documents(business_id,created_at desc);
create index if not exists idx_sales_documents_business_status
  on public.sales_documents(business_id,document_type,status);
create index if not exists idx_automation_deliveries_status_created
  on public.automation_deliveries(business_id,status,created_at desc);
create index if not exists idx_notifications_unread_created
  on public.business_notifications(business_id,is_read,created_at desc);
create index if not exists idx_inventory_balances_business_product
  on public.inventory_balances(business_id,product_id,warehouse_id);

-- Prevent a branch belonging to one tenant from being attached to another ----
create or replace function public.salesdesk_assert_branch_ownership()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.branch_id is not null and not exists(
    select 1 from public.branches b
    where b.id=new.branch_id and b.business_id=new.business_id
  ) then
    raise exception 'Branch does not belong to this business' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.salesdesk_assert_branch_ownership() from public,anon,authenticated;

-- These tables all carry business_id + branch_id in the professional schema.
do $$
begin
  drop trigger if exists trg_invoice_branch_tenant on public.invoices;
  create trigger trg_invoice_branch_tenant before insert or update of business_id,branch_id on public.invoices
    for each row execute function public.salesdesk_assert_branch_ownership();

  drop trigger if exists trg_expense_branch_tenant on public.expenses;
  create trigger trg_expense_branch_tenant before insert or update of business_id,branch_id on public.expenses
    for each row execute function public.salesdesk_assert_branch_ownership();

  drop trigger if exists trg_sales_document_branch_tenant on public.sales_documents;
  create trigger trg_sales_document_branch_tenant before insert or update of business_id,branch_id on public.sales_documents
    for each row execute function public.salesdesk_assert_branch_ownership();

  drop trigger if exists trg_recurring_expense_branch_tenant on public.recurring_expense_schedules;
  create trigger trg_recurring_expense_branch_tenant before insert or update of business_id,branch_id on public.recurring_expense_schedules
    for each row execute function public.salesdesk_assert_branch_ownership();

  drop trigger if exists trg_recurring_invoice_branch_tenant on public.recurring_invoice_schedules;
  create trigger trg_recurring_invoice_branch_tenant before insert or update of business_id,branch_id on public.recurring_invoice_schedules
    for each row execute function public.salesdesk_assert_branch_ownership();

  drop trigger if exists trg_scheduled_report_branch_tenant on public.scheduled_reports;
  create trigger trg_scheduled_report_branch_tenant before insert or update of business_id,branch_id on public.scheduled_reports
    for each row execute function public.salesdesk_assert_branch_ownership();
end $$;

-- Prevent a warehouse from being paired with another tenant's business --------
create or replace function public.salesdesk_assert_warehouse_ownership()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.warehouse_id is not null and not exists(
    select 1 from public.warehouses w
    where w.id=new.warehouse_id and w.business_id=new.business_id
  ) then
    raise exception 'Warehouse does not belong to this business' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.salesdesk_assert_warehouse_ownership() from public,anon,authenticated;

drop trigger if exists trg_inventory_balance_warehouse_tenant on public.inventory_balances;
create trigger trg_inventory_balance_warehouse_tenant
before insert or update of business_id,warehouse_id on public.inventory_balances
for each row execute function public.salesdesk_assert_warehouse_ownership();

-- Tenant-facing tables must remain under RLS. Abort migration if a later change
-- accidentally disables it on a critical table.
do $$
declare t text; enabled boolean;
begin
  foreach t in array array[
    'businesses','business_members','products','customers','invoices','expenses',
    'stock_movements','suppliers','purchases','branches','warehouses',
    'inventory_balances','sales_documents','customer_followups',
    'automation_rules','business_notifications','recurring_expense_schedules',
    'recurring_invoice_schedules','scheduled_reports','automation_deliveries'
  ] loop
    select c.relrowsecurity into enabled
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=t;
    if enabled is distinct from true then
      raise exception 'Production hardening requires RLS on public.%',t;
    end if;
  end loop;
end $$;
