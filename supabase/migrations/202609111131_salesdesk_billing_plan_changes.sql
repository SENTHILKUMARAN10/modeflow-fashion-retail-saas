-- SalesDesk provider-scheduled plan changes
-- Migration version: 202609111131
alter table public.business_subscriptions add column if not exists pending_plan_interval text;
alter table public.business_subscriptions add column if not exists pending_provider_plan_id text;
alter table public.business_subscriptions add column if not exists pending_plan_effective_at timestamptz;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='business_subscriptions_pending_interval_check') then
    alter table public.business_subscriptions add constraint business_subscriptions_pending_interval_check
      check(pending_plan_interval is null or pending_plan_interval in ('monthly','annual'));
  end if;
end $$;
