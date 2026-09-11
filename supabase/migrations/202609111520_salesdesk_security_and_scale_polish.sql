-- SalesDesk security/performance polish before production release.

-- Security-definer tenant helpers are for signed-in application users only.
revoke execute on function public.has_business_role(uuid,text[]) from public, anon;
revoke execute on function public.is_business_member(uuid) from public, anon;
grant execute on function public.has_business_role(uuid,text[]) to authenticated, service_role;
grant execute on function public.is_business_member(uuid) to authenticated, service_role;

-- Tenant-facing RLS policies should not target PUBLIC/anonymous roles.
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname='public' and roles = array['public']::name[]
  loop
    execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
  end loop;
end $$;

-- Avoid per-row auth.uid() re-evaluation in hot RLS policies.
alter policy "users create businesses" on public.businesses
  with check (created_by = (select auth.uid()));

alter policy "members create stock movements" on public.stock_movements
  with check (is_business_member(business_id) and has_active_subscription(business_id) and created_by = (select auth.uid()));

alter policy "members read notifications" on public.business_notifications
  using (is_business_member(business_id) and (user_id is null or user_id = (select auth.uid())));

alter policy "members update own notifications" on public.business_notifications
  using (is_business_member(business_id) and (user_id is null or user_id = (select auth.uid())));

alter policy "members view branch assignments" on public.business_member_branches
  using (user_id = (select auth.uid()) or has_business_role(business_id,array['owner','admin']));

alter policy "authorized invoice creation" on public.invoices
  with check (salesdesk_can(business_id,'sales.create') and salesdesk_has_branch_access(business_id,branch_id) and created_by = (select auth.uid()) and has_active_subscription(business_id));

alter policy "authorized expense creation" on public.expenses
  with check (salesdesk_can(business_id,'expenses.manage') and salesdesk_has_branch_access(business_id,branch_id) and created_by = (select auth.uid()) and has_active_subscription(business_id));

alter policy "authorized invoice payments" on public.invoice_payments
  with check ((salesdesk_can(business_id,'finance.manage') or has_business_role(business_id,array['cashier'])) and created_by = (select auth.uid()) and has_active_subscription(business_id));

-- Add a covering index for each foreign key only when none already exists.
do $$
declare
  r record;
  idx_name text;
begin
  for r in
    select con.conname, con.conrelid, con.conkey, n.nspname, c.relname,
           string_agg(quote_ident(a.attname), ', ' order by u.ord) as cols
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    join lateral unnest(con.conkey) with ordinality as u(attnum,ord) on true
    join pg_attribute a on a.attrelid=con.conrelid and a.attnum=u.attnum
    where con.contype='f' and n.nspname='public'
    group by con.conname, con.conrelid, con.conkey, n.nspname, c.relname
  loop
    if not exists (
      select 1
      from pg_index i
      where i.indrelid=r.conrelid
        and i.indisvalid and i.indisready
        and array_to_string((i.indkey::smallint[])[0:cardinality(r.conkey)-1],',') = array_to_string(r.conkey,',')
    ) then
      idx_name := left('idx_fk_' || r.relname || '_' || substr(md5(r.conname),1,10),63);
      execute format('create index if not exists %I on %I.%I (%s)',idx_name,r.nspname,r.relname,r.cols);
    end if;
  end loop;
end $$;

-- Remove known identical indexes while keeping the stable canonical names.
drop index if exists public.idx_expenses_business_expense_date;
drop index if exists public.idx_invoices_business_created;
drop index if exists public.idx_stock_movements_business_created;
