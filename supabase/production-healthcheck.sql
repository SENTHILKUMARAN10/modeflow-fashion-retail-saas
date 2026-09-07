-- ModeFlow production healthcheck (read-only)
-- Run in Supabase SQL Editor after production migrations.

select 'rls_products' as check_name, relrowsecurity as passed from pg_class where oid='public.products'::regclass
union all select 'rls_customers', relrowsecurity from pg_class where oid='public.customers'::regclass
union all select 'rls_invoices', relrowsecurity from pg_class where oid='public.invoices'::regclass
union all select 'rls_expenses', relrowsecurity from pg_class where oid='public.expenses'::regclass
union all select 'rls_audit_logs', relrowsecurity from pg_class where oid='public.audit_logs'::regclass;

select routine_name, security_type
from information_schema.routines
where routine_schema='public'
  and routine_name in ('create_business_with_owner','complete_sale','delete_sale')
order by routine_name;

select indexname
from pg_indexes
where schemaname='public'
  and indexname in ('uq_invoices_business_idempotency','idx_audit_business_created')
order by indexname;

select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='invoice_items' and column_name='cost_price'
union all
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='invoices' and column_name='idempotency_key';

select count(*) as negative_stock_rows from public.products where stock < 0;
