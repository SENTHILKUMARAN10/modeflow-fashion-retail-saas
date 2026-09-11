-- SalesDesk authenticated Data API grants
-- Keeps the project safe when Supabase "Automatically expose new tables" is disabled.
-- RLS remains the authorization boundary for every tenant-facing table.

grant usage on schema public to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses','business_members','business_member_branches',
    'products','customers','invoices','invoice_items','expenses','stock_movements',
    'suppliers','purchases','purchase_items','invoice_payments','purchase_payments',
    'branches','warehouses','inventory_balances',
    'sales_documents','sales_document_items','sales_returns','sales_return_items',
    'customer_followups','business_goals','business_notifications','automation_rules',
    'recurring_expense_schedules','recurring_invoice_schedules','scheduled_reports'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    end if;
  end loop;

  foreach t in array array[
    'business_subscriptions','team_invitations','automation_deliveries',
    'automation_executions','audit_logs'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select on table public.%I to authenticated', t);
    end if;
  end loop;
end $$;

-- Never expose service-only telemetry through authenticated browser credentials.
revoke all on table public.app_error_logs from authenticated;
