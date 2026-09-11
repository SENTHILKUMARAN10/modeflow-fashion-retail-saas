\set ON_ERROR_STOP on
-- SalesDesk staging query-plan verification.
-- Usage: psql "$STAGING_DB_URL" -v business_id='<uuid>' -f scripts/performance/query-plan.sql
-- Run only against staging/test data representative of production scale.

\echo 'SalesDesk performance plan checks for business' :business_id

explain (analyze,buffers,format text)
select id,name,stock,reorder_level
from public.products
where business_id=:'business_id'::uuid and is_active=true
order by name
limit 100;

explain (analyze,buffers,format text)
select id,invoice_number,total,payment_status,created_at
from public.invoices
where business_id=:'business_id'::uuid
order by created_at desc
limit 100;

explain (analyze,buffers,format text)
select id,invoice_number,total,due_date,payment_status
from public.invoices
where business_id=:'business_id'::uuid
  and payment_status in ('unpaid','partial')
order by due_date nulls last
limit 100;

explain (analyze,buffers,format text)
select id,title,due_at,priority
from public.customer_followups
where business_id=:'business_id'::uuid and status='open'
order by due_at nulls last
limit 100;

explain (analyze,buffers,format text)
select id,product_id,warehouse_id,quantity
from public.inventory_balances
where business_id=:'business_id'::uuid
limit 250;

explain (analyze,buffers,format text)
select id,kind,title,created_at
from public.business_notifications
where business_id=:'business_id'::uuid and is_read=false
order by created_at desc
limit 100;

-- Index inventory used during review.
select schemaname,tablename,indexname,indexdef
from pg_indexes
where schemaname='public'
  and tablename in ('business_members','products','customers','invoices','expenses','stock_movements','customer_followups','sales_documents','inventory_balances','business_notifications','automation_deliveries')
order by tablename,indexname;
