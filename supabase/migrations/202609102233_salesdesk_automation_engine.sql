-- SalesDesk automation execution support
-- Migration version: 202609102233
alter table public.business_notifications add column if not exists dedupe_key text;
create unique index if not exists uq_business_notifications_dedupe on public.business_notifications(business_id,dedupe_key) where dedupe_key is not null;
create index if not exists idx_invoices_due_open on public.invoices(business_id,due_date) where payment_status<>'paid';
