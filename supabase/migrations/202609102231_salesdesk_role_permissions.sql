-- SalesDesk role permissions + atomic returns
-- Migration version: 202609102231

-- Extend write permissions for the new Admin role while keeping owner-only destructive controls.
drop policy if exists "managers write products" on public.products;
create policy "managers write products" on public.products for all
  using(public.has_business_role(business_id,array['owner','admin','manager']) and public.has_active_subscription(business_id))
  with check(public.has_business_role(business_id,array['owner','admin','manager']) and public.has_active_subscription(business_id));

drop policy if exists "managers write suppliers" on public.suppliers;
create policy "managers write suppliers" on public.suppliers for all
  using(public.has_business_role(business_id,array['owner','admin','manager']) and public.has_active_subscription(business_id))
  with check(public.has_business_role(business_id,array['owner','admin','manager']) and public.has_active_subscription(business_id));

drop policy if exists "managers write purchases" on public.purchases;
create policy "managers write purchases" on public.purchases for all
  using(public.has_business_role(business_id,array['owner','admin','manager']) and public.has_active_subscription(business_id))
  with check(public.has_business_role(business_id,array['owner','admin','manager']) and public.has_active_subscription(business_id));

drop policy if exists "managers modify invoices" on public.invoices;
create policy "managers modify invoices" on public.invoices for update
  using(public.has_business_role(business_id,array['owner','admin','manager','accountant']) and public.has_active_subscription(business_id))
  with check(public.has_business_role(business_id,array['owner','admin','manager','accountant']) and public.has_active_subscription(business_id));

drop policy if exists "managers modify expenses" on public.expenses;
create policy "managers modify expenses" on public.expenses for update
  using(public.has_business_role(business_id,array['owner','admin','manager','accountant']) and public.has_active_subscription(business_id))
  with check(public.has_business_role(business_id,array['owner','admin','manager','accountant']) and public.has_active_subscription(business_id));

create or replace function public.create_sales_return(
  p_invoice_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_refund_method text default 'credit',
  p_reason text default null,
  p_restock boolean default true
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid();v_invoice public.invoices%rowtype;v_item public.invoice_items%rowtype;
  v_already numeric:=0;v_amount numeric;v_return uuid;v_number text;v_track boolean;
begin
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found';end if;
  if not public.has_business_role(v_invoice.business_id,array['owner','admin','manager']) then raise exception 'Manager access required';end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Return quantity must be positive';end if;
  if p_refund_method not in ('cash','upi','card','bank','credit','other') then raise exception 'Invalid refund method';end if;
  select * into v_item from public.invoice_items where invoice_id=p_invoice_id and product_id=p_product_id order by id limit 1;
  if not found then raise exception 'Invoice item not found';end if;
  select coalesce(sum(ri.quantity),0) into v_already from public.sales_return_items ri join public.sales_returns r on r.id=ri.return_id where r.invoice_id=p_invoice_id and ri.product_id=p_product_id and r.status='completed';
  if v_already+p_quantity>v_item.quantity then raise exception 'Return quantity exceeds quantity sold';end if;
  v_amount:=round(p_quantity*v_item.rate,2);
  v_number:='RT-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  insert into public.sales_returns(business_id,invoice_id,return_number,reason,refund_method,refund_amount,status,created_by)
  values(v_invoice.business_id,p_invoice_id,v_number,nullif(trim(p_reason),''),p_refund_method,v_amount,'completed',v_user) returning id into v_return;
  insert into public.sales_return_items(return_id,product_id,product_name,quantity,amount,restock)
  values(v_return,p_product_id,v_item.product_name,p_quantity,v_amount,p_restock);
  if p_restock then
    select track_stock into v_track from public.products where id=p_product_id and business_id=v_invoice.business_id for update;
    if coalesce(v_track,false) then
      update public.products set stock=stock+p_quantity where id=p_product_id;
      insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by)
      values(v_invoice.business_id,p_product_id,'return',p_quantity,v_return,'SalesDesk customer return',v_user);
    end if;
  end if;
  return v_return;
end $$;
revoke all on function public.create_sales_return(uuid,uuid,numeric,text,text,boolean) from public,anon;
grant execute on function public.create_sales_return(uuid,uuid,numeric,text,text,boolean) to authenticated;

-- Auditing for new financial/operational records.
do $$ begin
 drop trigger if exists trg_audit_sales_documents on public.sales_documents;create trigger trg_audit_sales_documents after insert or update or delete on public.sales_documents for each row execute function public.audit_business_change();
 drop trigger if exists trg_audit_sales_returns on public.sales_returns;create trigger trg_audit_sales_returns after insert or update or delete on public.sales_returns for each row execute function public.audit_business_change();
 drop trigger if exists trg_audit_followups on public.customer_followups;create trigger trg_audit_followups after insert or update or delete on public.customer_followups for each row execute function public.audit_business_change();
 drop trigger if exists trg_audit_purchase_payments on public.purchase_payments;create trigger trg_audit_purchase_payments after insert or update or delete on public.purchase_payments for each row execute function public.audit_business_change();
end $$;
