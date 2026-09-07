-- ModeFlow paid subscription enforcement
alter table public.businesses add column if not exists region text not null default 'IN';

create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_subscription_id text unique,
  plan_interval text not null check (plan_interval in ('monthly','annual')),
  currency text not null check (currency in ('INR','USD')),
  amount numeric(12,2) not null default 0,
  status text not null default 'created' check (status in ('created','authenticated','active','past_due','halted','cancelled','completed','expired')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.business_subscriptions enable row level security;
drop policy if exists "members read subscriptions" on public.business_subscriptions;
create policy "members read subscriptions" on public.business_subscriptions for select
using (public.is_business_member(business_id));

create or replace function public.has_active_subscription(target_business uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.business_subscriptions s
    where s.business_id=target_business
      and s.status in ('authenticated','active')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;
revoke all on function public.has_active_subscription(uuid) from public, anon;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- Paid feature tables require both membership and an active subscription.
drop policy if exists "members read products" on public.products;
create policy "members read products" on public.products for select using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "managers write products" on public.products;
create policy "managers write products" on public.products for all using (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id)) with check (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id));

drop policy if exists "members read customers" on public.customers;
create policy "members read customers" on public.customers for select using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "members write customers" on public.customers;
create policy "members write customers" on public.customers for all using (public.is_business_member(business_id) and public.has_active_subscription(business_id)) with check (public.is_business_member(business_id) and public.has_active_subscription(business_id));

drop policy if exists "members read invoices" on public.invoices;
create policy "members read invoices" on public.invoices for select using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "members create invoices" on public.invoices;
create policy "members create invoices" on public.invoices for insert with check (public.is_business_member(business_id) and public.has_active_subscription(business_id) and created_by=auth.uid());
drop policy if exists "managers modify invoices" on public.invoices;
create policy "managers modify invoices" on public.invoices for update using (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id));
drop policy if exists "owners delete invoices" on public.invoices;
create policy "owners delete invoices" on public.invoices for delete using (public.has_business_role(business_id,array['owner']) and public.has_active_subscription(business_id));

drop policy if exists "members read invoice items" on public.invoice_items;
create policy "members read invoice items" on public.invoice_items for select using (exists(select 1 from public.invoices i where i.id=invoice_id and public.is_business_member(i.business_id) and public.has_active_subscription(i.business_id)));
drop policy if exists "members create invoice items" on public.invoice_items;
create policy "members create invoice items" on public.invoice_items for insert with check (exists(select 1 from public.invoices i where i.id=invoice_id and public.is_business_member(i.business_id) and public.has_active_subscription(i.business_id)));

drop policy if exists "members read expenses" on public.expenses;
create policy "members read expenses" on public.expenses for select using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "members create expenses" on public.expenses;
create policy "members create expenses" on public.expenses for insert with check (public.is_business_member(business_id) and public.has_active_subscription(business_id) and created_by=auth.uid());
drop policy if exists "managers modify expenses" on public.expenses;
create policy "managers modify expenses" on public.expenses for update using (public.has_business_role(business_id,array['owner','manager']) and public.has_active_subscription(business_id));
drop policy if exists "owners delete expenses" on public.expenses;
create policy "owners delete expenses" on public.expenses for delete using (public.has_business_role(business_id,array['owner']) and public.has_active_subscription(business_id));

drop policy if exists "members read stock movements" on public.stock_movements;
create policy "members read stock movements" on public.stock_movements for select using (public.is_business_member(business_id) and public.has_active_subscription(business_id));
drop policy if exists "members create stock movements" on public.stock_movements;
create policy "members create stock movements" on public.stock_movements for insert with check (public.is_business_member(business_id) and public.has_active_subscription(business_id) and created_by=auth.uid());

-- Extra protection for SECURITY DEFINER mutation paths: authenticated writes to paid tables
-- are rejected at the database layer when the subscription is inactive.
create or replace function public.enforce_paid_business_write()
returns trigger language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
  if auth.uid() is null then return coalesce(new,old); end if;
  bid := coalesce(new.business_id, old.business_id);
  if bid is not null and not public.has_active_subscription(bid) then
    raise exception 'ModeFlow subscription required' using errcode='42501';
  end if;
  return coalesce(new,old);
end;$$;

foreach_table: begin end;

drop trigger if exists trg_paid_products on public.products;
create trigger trg_paid_products before insert or update or delete on public.products for each row execute function public.enforce_paid_business_write();
drop trigger if exists trg_paid_customers on public.customers;
create trigger trg_paid_customers before insert or update or delete on public.customers for each row execute function public.enforce_paid_business_write();
drop trigger if exists trg_paid_invoices on public.invoices;
create trigger trg_paid_invoices before insert or update or delete on public.invoices for each row execute function public.enforce_paid_business_write();
drop trigger if exists trg_paid_expenses on public.expenses;
create trigger trg_paid_expenses before insert or update or delete on public.expenses for each row execute function public.enforce_paid_business_write();
drop trigger if exists trg_paid_stock on public.stock_movements;
create trigger trg_paid_stock before insert or update or delete on public.stock_movements for each row execute function public.enforce_paid_business_write();
