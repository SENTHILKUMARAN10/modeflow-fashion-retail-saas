-- SalesDesk automation, recurring work and billing lifecycle completion
-- Migration version: 202609111130
-- Apply after the professional people/permissions migrations.

create extension if not exists "pgcrypto";

-- Billing lifecycle ---------------------------------------------------------
alter table public.business_subscriptions add column if not exists provider_plan_id text;
alter table public.business_subscriptions add column if not exists provider_payment_id text;
alter table public.business_subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.business_subscriptions add column if not exists last_payment_at timestamptz;
alter table public.business_subscriptions add column if not exists last_event_at timestamptz;
alter table public.business_subscriptions add column if not exists last_event_type text;
alter table public.business_subscriptions add column if not exists grace_until timestamptz;
alter table public.business_subscriptions add column if not exists next_charge_at timestamptz;
alter table public.business_subscriptions add column if not exists failure_count integer not null default 0;
alter table public.business_subscriptions drop constraint if exists business_subscriptions_status_check;
alter table public.business_subscriptions add constraint business_subscriptions_status_check
  check(status in ('created','pending_verification','authenticated','active','past_due','halted','paused','cancelled','completed','expired','rejected'));

create table if not exists public.billing_events(
  provider_event_id text primary key,
  business_id uuid references public.businesses(id) on delete set null,
  provider text not null default 'razorpay',
  provider_subscription_id text,
  provider_payment_id text,
  event_type text not null,
  provider_status text,
  amount numeric(12,2),
  currency text,
  payload_digest text not null,
  occurred_at timestamptz,
  processed_at timestamptz not null default now()
);
create index if not exists idx_billing_events_business_date on public.billing_events(business_id,processed_at desc);
alter table public.billing_events enable row level security;
-- No browser policies: only server service-role code handles provider events.

create or replace function public.has_active_subscription(target_business uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1 from public.business_subscriptions s
    where s.business_id=target_business and (
      (s.status='active' and (s.current_period_end is null or s.current_period_end>now()))
      or (s.status='past_due' and s.grace_until is not null and s.grace_until>now())
    )
  );
$$;
revoke all on function public.has_active_subscription(uuid) from public,anon;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- Automation delivery ledger ----------------------------------------------
alter table public.automation_rules add column if not exists recipient_email text;
alter table public.automation_rules add column if not exists recipient_phone text;
alter table public.automation_rules add column if not exists next_run_at timestamptz;
alter table public.automation_rules add column if not exists last_run_at timestamptz;
alter table public.automation_rules add column if not exists last_status text;
alter table public.automation_rules add column if not exists last_error text;

create table if not exists public.automation_deliveries(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  source_type text not null,
  source_id uuid,
  channel text not null check(channel in ('in_app','email','whatsapp')),
  destination text,
  kind text not null,
  subject text,
  message text not null,
  dedupe_key text not null,
  status text not null default 'sending' check(status in ('sending','sent','skipped','failed')),
  provider_message_id text,
  attempt_count integer not null default 1,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,dedupe_key)
);
create index if not exists idx_automation_deliveries_business on public.automation_deliveries(business_id,created_at desc);
alter table public.automation_deliveries enable row level security;
drop policy if exists "managers read automation deliveries" on public.automation_deliveries;
create policy "managers read automation deliveries" on public.automation_deliveries for select
  using(public.salesdesk_can(business_id,'automation.manage'));

-- Recurring work -----------------------------------------------------------
create table if not exists public.recurring_expense_schedules(
  id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,name text not null,category text not null,
  amount numeric(12,2) not null check(amount>0),note text,
  cadence text not null check(cadence in ('daily','weekly','monthly','quarterly','yearly')),
  interval_count integer not null default 1 check(interval_count between 1 and 36),next_run_at timestamptz not null,end_at timestamptz,
  is_active boolean not null default true,last_run_at timestamptz,last_error text,run_count integer not null default 0,
  created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.recurring_invoice_schedules(
  id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,name text not null,
  customer_id uuid references public.customers(id) on delete set null,customer_name text not null,customer_email text,customer_phone text,
  items jsonb not null,discount numeric(12,2) not null default 0 check(discount>=0),due_days integer not null default 7 check(due_days between 0 and 365),
  payment_method text not null default 'bank' check(payment_method in ('cash','upi','card','bank','other')),
  cadence text not null check(cadence in ('weekly','monthly','quarterly','yearly')),interval_count integer not null default 1 check(interval_count between 1 and 36),
  next_run_at timestamptz not null,end_at timestamptz,is_active boolean not null default true,last_run_at timestamptz,
  last_invoice_id uuid references public.invoices(id) on delete set null,last_error text,run_count integer not null default 0,
  created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(jsonb_typeof(items)='array' and jsonb_array_length(items)>0 and jsonb_array_length(items)<=100)
);

create table if not exists public.scheduled_reports(
  id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,name text not null,
  report_type text not null check(report_type in ('daily_brief','weekly_summary','monthly_summary','finance','branch')),
  cadence text not null check(cadence in ('daily','weekly','monthly')),interval_count integer not null default 1 check(interval_count between 1 and 12),
  channel text not null check(channel in ('in_app','email','whatsapp')),recipient text,whatsapp_template text,whatsapp_language text not null default 'en_US',
  timezone text not null default 'Asia/Kolkata',next_run_at timestamptz not null,is_active boolean not null default true,
  last_run_at timestamptz,last_status text,last_error text,created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.automation_executions(
  id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,
  source_type text not null,source_id uuid not null,run_key text not null,status text not null default 'running' check(status in ('running','success','failed','skipped')),
  result_id uuid,error_message text,started_at timestamptz not null default now(),finished_at timestamptz,
  unique(source_type,source_id,run_key)
);
create index if not exists idx_recurring_expense_due on public.recurring_expense_schedules(is_active,next_run_at);
create index if not exists idx_recurring_invoice_due on public.recurring_invoice_schedules(is_active,next_run_at);
create index if not exists idx_scheduled_reports_due on public.scheduled_reports(is_active,next_run_at);
create index if not exists idx_automation_executions_business on public.automation_executions(business_id,started_at desc);

alter table public.recurring_expense_schedules enable row level security;
alter table public.recurring_invoice_schedules enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.automation_executions enable row level security;

do $$ begin
  drop policy if exists "members read recurring expenses" on public.recurring_expense_schedules;
  create policy "members read recurring expenses" on public.recurring_expense_schedules for select using(public.is_business_member(business_id));
  drop policy if exists "managers manage recurring expenses" on public.recurring_expense_schedules;
  create policy "managers manage recurring expenses" on public.recurring_expense_schedules for all
    using(public.salesdesk_can(business_id,'automation.manage')) with check(public.salesdesk_can(business_id,'automation.manage'));

  drop policy if exists "members read recurring invoices" on public.recurring_invoice_schedules;
  create policy "members read recurring invoices" on public.recurring_invoice_schedules for select using(public.is_business_member(business_id));
  drop policy if exists "managers manage recurring invoices" on public.recurring_invoice_schedules;
  create policy "managers manage recurring invoices" on public.recurring_invoice_schedules for all
    using(public.salesdesk_can(business_id,'automation.manage')) with check(public.salesdesk_can(business_id,'automation.manage'));

  drop policy if exists "members read scheduled reports" on public.scheduled_reports;
  create policy "members read scheduled reports" on public.scheduled_reports for select using(public.is_business_member(business_id));
  drop policy if exists "managers manage scheduled reports" on public.scheduled_reports;
  create policy "managers manage scheduled reports" on public.scheduled_reports for all
    using(public.salesdesk_can(business_id,'automation.manage')) with check(public.salesdesk_can(business_id,'automation.manage'));

  drop policy if exists "managers read automation executions" on public.automation_executions;
  create policy "managers read automation executions" on public.automation_executions for select using(public.salesdesk_can(business_id,'automation.manage'));
end $$;

do $$ begin
  drop trigger if exists trg_automation_deliveries_updated_at on public.automation_deliveries;
  create trigger trg_automation_deliveries_updated_at before update on public.automation_deliveries for each row execute function public.set_updated_at();
  drop trigger if exists trg_recurring_expense_updated_at on public.recurring_expense_schedules;
  create trigger trg_recurring_expense_updated_at before update on public.recurring_expense_schedules for each row execute function public.set_updated_at();
  drop trigger if exists trg_recurring_invoice_updated_at on public.recurring_invoice_schedules;
  create trigger trg_recurring_invoice_updated_at before update on public.recurring_invoice_schedules for each row execute function public.set_updated_at();
  drop trigger if exists trg_scheduled_reports_updated_at on public.scheduled_reports;
  create trigger trg_scheduled_reports_updated_at before update on public.scheduled_reports for each row execute function public.set_updated_at();
end $$;

create or replace function public.salesdesk_advance_schedule(p_from timestamptz,p_cadence text,p_interval integer default 1)
returns timestamptz language plpgsql immutable set search_path=public,pg_temp as $$
begin
  return case p_cadence
    when 'daily' then p_from+make_interval(days=>greatest(p_interval,1))
    when 'weekly' then p_from+make_interval(days=>7*greatest(p_interval,1))
    when 'monthly' then p_from+make_interval(months=>greatest(p_interval,1))
    when 'quarterly' then p_from+make_interval(months=>3*greatest(p_interval,1))
    when 'yearly' then p_from+make_interval(years=>greatest(p_interval,1))
    else p_from+interval '1 day' end;
end $$;
revoke all on function public.salesdesk_advance_schedule(timestamptz,text,integer) from public,anon,authenticated;
grant execute on function public.salesdesk_advance_schedule(timestamptz,text,integer) to service_role;

create or replace function public.salesdesk_process_recurring_expense(p_schedule_id uuid,p_run_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.recurring_expense_schedules%rowtype;v_key text;v_exec uuid;v_expense uuid;v_next timestamptz;
begin
  select * into s from public.recurring_expense_schedules where id=p_schedule_id for update;
  if not found or not s.is_active or s.next_run_at>p_run_at then return jsonb_build_object('status','skipped');end if;
  if not public.has_active_subscription(s.business_id) then update public.recurring_expense_schedules set last_error='Active SalesDesk subscription required' where id=s.id;return jsonb_build_object('status','failed','error','Active SalesDesk subscription required');end if;
  v_key:=to_char(s.next_run_at at time zone 'UTC','YYYYMMDDHH24MI');
  insert into public.automation_executions(business_id,source_type,source_id,run_key) values(s.business_id,'recurring_expense',s.id,v_key)
    on conflict(source_type,source_id,run_key) do nothing returning id into v_exec;
  if v_exec is null then return jsonb_build_object('status','skipped','reason','already processed');end if;
  begin
    insert into public.expenses(business_id,branch_id,category,amount,note,expense_date,created_by)
      values(s.business_id,s.branch_id,s.category,s.amount,coalesce(s.note,'Recurring expense: '||s.name),(p_run_at at time zone 'UTC')::date,s.created_by) returning id into v_expense;
    v_next:=public.salesdesk_advance_schedule(s.next_run_at,s.cadence,s.interval_count);
    update public.recurring_expense_schedules set last_run_at=p_run_at,next_run_at=v_next,run_count=run_count+1,last_error=null,
      is_active=case when end_at is not null and v_next>end_at then false else is_active end where id=s.id;
    update public.automation_executions set status='success',result_id=v_expense,finished_at=now() where id=v_exec;
    return jsonb_build_object('status','success','result_id',v_expense,'next_run_at',v_next);
  exception when others then
    update public.automation_executions set status='failed',error_message=sqlerrm,finished_at=now() where id=v_exec;
    update public.recurring_expense_schedules set last_error=sqlerrm where id=s.id;
    return jsonb_build_object('status','failed','error',sqlerrm);
  end;
end $$;
revoke all on function public.salesdesk_process_recurring_expense(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.salesdesk_process_recurring_expense(uuid,timestamptz) to service_role;

create or replace function public.salesdesk_process_recurring_invoice(p_schedule_id uuid,p_run_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.recurring_invoice_schedules%rowtype;v_key text;v_exec uuid;v_invoice uuid;v_customer uuid;v_number text;v_prefix text;v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_rate numeric;v_line numeric;v_sub numeric:=0;v_total numeric;v_next timestamptz;
begin
  select * into s from public.recurring_invoice_schedules where id=p_schedule_id for update;
  if not found or not s.is_active or s.next_run_at>p_run_at then return jsonb_build_object('status','skipped');end if;
  if not public.has_active_subscription(s.business_id) then update public.recurring_invoice_schedules set last_error='Active SalesDesk subscription required' where id=s.id;return jsonb_build_object('status','failed','error','Active SalesDesk subscription required');end if;
  v_key:=to_char(s.next_run_at at time zone 'UTC','YYYYMMDDHH24MI');
  insert into public.automation_executions(business_id,source_type,source_id,run_key) values(s.business_id,'recurring_invoice',s.id,v_key)
    on conflict(source_type,source_id,run_key) do nothing returning id into v_exec;
  if v_exec is null then return jsonb_build_object('status','skipped','reason','already processed');end if;
  begin
    for v_item in select value from jsonb_array_elements(s.items) order by value->>'product_id' loop
      v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
      if v_qty is null or v_qty<=0 or v_rate is null or v_rate<0 then raise exception 'Invalid recurring invoice item';end if;
      select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=s.business_id and is_active=true for update;
      if not found then raise exception 'Product or service not found';end if;
      if v_product.track_stock and v_product.stock<v_qty then raise exception 'Not enough stock for %',v_product.name;end if;
      v_sub:=v_sub+round(v_qty*v_rate,2);
    end loop;
    if s.discount>v_sub then raise exception 'Recurring invoice discount exceeds subtotal';end if;
    v_total:=v_sub-s.discount;select upper(invoice_prefix) into v_prefix from public.businesses where id=s.business_id;v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');
    v_number:=v_prefix||'-R-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
    v_customer:=s.customer_id;
    if v_customer is null and nullif(trim(s.customer_phone),'') is not null then select id into v_customer from public.customers where business_id=s.business_id and phone=trim(s.customer_phone) order by created_at limit 1;end if;
    if v_customer is null then insert into public.customers(business_id,name,email,phone) values(s.business_id,s.customer_name,nullif(trim(s.customer_email),''),nullif(trim(s.customer_phone),'')) returning id into v_customer;end if;
    insert into public.invoices(business_id,branch_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,due_date,notes,created_by)
      values(s.business_id,s.branch_id,v_number,v_customer,s.customer_name,nullif(trim(s.customer_phone),''),v_sub,s.discount,0,v_total,'unpaid',s.payment_method,(p_run_at at time zone 'UTC')::date+s.due_days,'Generated by SalesDesk recurring invoice: '||s.name,s.created_by) returning id into v_invoice;
    for v_item in select value from jsonb_array_elements(s.items) order by value->>'product_id' loop
      v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=s.business_id for update;v_line:=round(v_qty*v_rate,2);
      insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total) values(v_invoice,v_product.id,v_product.name,v_qty,v_rate,v_product.cost_price,v_line);
      if v_product.track_stock then update public.products set stock=stock-v_qty where id=v_product.id;insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by) values(s.business_id,v_product.id,'sale',-v_qty,v_invoice,'Recurring invoice '||s.name,s.created_by);end if;
    end loop;
    v_next:=public.salesdesk_advance_schedule(s.next_run_at,s.cadence,s.interval_count);
    update public.recurring_invoice_schedules set last_run_at=p_run_at,last_invoice_id=v_invoice,next_run_at=v_next,run_count=run_count+1,last_error=null,
      is_active=case when end_at is not null and v_next>end_at then false else is_active end where id=s.id;
    update public.automation_executions set status='success',result_id=v_invoice,finished_at=now() where id=v_exec;
    return jsonb_build_object('status','success','result_id',v_invoice,'next_run_at',v_next);
  exception when others then
    update public.automation_executions set status='failed',error_message=sqlerrm,finished_at=now() where id=v_exec;
    update public.recurring_invoice_schedules set last_error=sqlerrm where id=s.id;
    return jsonb_build_object('status','failed','error',sqlerrm);
  end;
end $$;
revoke all on function public.salesdesk_process_recurring_invoice(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.salesdesk_process_recurring_invoice(uuid,timestamptz) to service_role;

create or replace function public.salesdesk_report_snapshot(p_business_id uuid,p_branch_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'today_sales',coalesce((select sum(total) from public.invoices where business_id=p_business_id and (p_branch_id is null or branch_id=p_branch_id) and created_at>=date_trunc('day',now())),0),
    'month_sales',coalesce((select sum(total) from public.invoices where business_id=p_business_id and (p_branch_id is null or branch_id=p_branch_id) and created_at>=date_trunc('month',now())),0),
    'month_expenses',coalesce((select sum(amount) from public.expenses where business_id=p_business_id and (p_branch_id is null or branch_id=p_branch_id) and created_at>=date_trunc('month',now())),0),
    'receivables',coalesce((select sum(i.total-coalesce((select sum(ip.amount) from public.invoice_payments ip where ip.invoice_id=i.id),0)) from public.invoices i where i.business_id=p_business_id and (p_branch_id is null or i.branch_id=p_branch_id) and i.payment_status<>'paid'),0),
    'payables',coalesce((select sum(p.total-coalesce((select sum(pp.amount) from public.purchase_payments pp where pp.purchase_id=p.id),0)) from public.purchases p where p.business_id=p_business_id and (p_branch_id is null or p.branch_id=p_branch_id) and p.payment_status<>'paid'),0),
    'low_stock',(select count(*) from public.products where business_id=p_business_id and is_active=true and track_stock=true and stock<=reorder_level),
    'due_followups',(select count(*) from public.customer_followups where business_id=p_business_id and status='open' and due_at is not null and due_at<=now()),
    'transactions_today',(select count(*) from public.invoices where business_id=p_business_id and (p_branch_id is null or branch_id=p_branch_id) and created_at>=date_trunc('day',now()))
  ) into v;return v;
end $$;
revoke all on function public.salesdesk_report_snapshot(uuid,uuid) from public,anon,authenticated;
grant execute on function public.salesdesk_report_snapshot(uuid,uuid) to service_role;
