-- SalesDesk branch-scoped conversion and intelligence
-- Migration version: 202609111006

create or replace function public.convert_sales_document_to_invoice(
  p_document_id uuid,p_payment_method text default 'bank',p_payment_status text default 'unpaid'
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_doc public.sales_documents%rowtype;v_invoice uuid;v_number text;v_prefix text;v_line record;v_product public.products%rowtype;v_wh uuid;v_wh_default boolean;v_available numeric;v_nondefault numeric;
begin
  select * into v_doc from public.sales_documents where id=p_document_id for update;if not found then raise exception 'Sales document not found';end if;
  if not public.salesdesk_can(v_doc.business_id,'sales.create') then raise exception 'Sales access required';end if;
  if not public.salesdesk_has_branch_access(v_doc.business_id,v_doc.branch_id) then raise exception 'Branch access denied';end if;
  if v_doc.converted_invoice_id is not null then return v_doc.converted_invoice_id;end if;if v_doc.status in ('rejected','cancelled','fulfilled') then raise exception 'This document cannot be invoiced';end if;
  if p_payment_method not in ('cash','upi','card','bank','other') or p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment details';end if;
  select upper(invoice_prefix) into v_prefix from public.businesses where id=v_doc.business_id;v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');v_number:=v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  select w.id,w.is_default into v_wh,v_wh_default from public.warehouses w where w.business_id=v_doc.business_id and w.is_active=true and (v_doc.branch_id is null or w.branch_id=v_doc.branch_id) order by case when v_doc.branch_id is not null and w.branch_id=v_doc.branch_id then 0 when w.is_default then 1 else 2 end,w.created_at limit 1;
  for v_line in select * from public.sales_document_items where document_id=v_doc.id order by id loop
    if v_line.product_id is null then continue;end if;select * into v_product from public.products where id=v_line.product_id and business_id=v_doc.business_id and is_active=true for update;if not found then raise exception 'Product or service no longer exists';end if;
    if v_product.track_stock then if v_wh is null or coalesce(v_wh_default,false) then select coalesce(sum(ib.quantity),0) into v_nondefault from public.inventory_balances ib join public.warehouses w on w.id=ib.warehouse_id where ib.business_id=v_doc.business_id and ib.product_id=v_product.id and not w.is_default and w.is_active=true;v_available:=greatest(v_product.stock-v_nondefault,0);else select coalesce(quantity,0) into v_available from public.inventory_balances where warehouse_id=v_wh and product_id=v_product.id;v_available:=coalesce(v_available,0);end if;if v_available<v_line.quantity then raise exception 'Not enough stock for %',v_product.name;end if;end if;
  end loop;
  insert into public.invoices(business_id,branch_id,source_document_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_by) values(v_doc.business_id,v_doc.branch_id,v_doc.id,v_number,v_doc.customer_id,v_doc.customer_name,v_doc.customer_phone,v_doc.subtotal,v_doc.discount,v_doc.tax,v_doc.total,p_payment_status,p_payment_method,v_user) returning id into v_invoice;
  for v_line in select * from public.sales_document_items where document_id=v_doc.id order by id loop
    select * into v_product from public.products where id=v_line.product_id and business_id=v_doc.business_id and is_active=true;insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total) values(v_invoice,v_line.product_id,v_line.item_name,v_line.quantity,v_line.rate,coalesce(v_product.cost_price,0),v_line.line_total);
    if v_product.track_stock then update public.products set stock=stock-v_line.quantity where id=v_product.id;if v_wh is not null and not coalesce(v_wh_default,false) then update public.inventory_balances set quantity=quantity-v_line.quantity,updated_at=now() where warehouse_id=v_wh and product_id=v_product.id;end if;insert into public.stock_movements(business_id,product_id,warehouse_id,movement_type,quantity,reference_id,note,created_by) values(v_doc.business_id,v_product.id,v_wh,'sale',-v_line.quantity,v_invoice,'Converted from '||v_doc.document_number,v_user);end if;
  end loop;update public.sales_documents set status='fulfilled',converted_invoice_id=v_invoice,converted_at=now() where id=v_doc.id;return v_invoice;
end $$;
revoke all on function public.convert_sales_document_to_invoice(uuid,text,text) from public,anon;grant execute on function public.convert_sales_document_to_invoice(uuid,text,text) to authenticated;

create or replace function public.salesdesk_supplier_aging(p_business_id uuid)
returns table(supplier_id uuid,supplier_name text,total_purchases numeric,total_paid numeric,total_due numeric,current_due numeric,due_1_30 numeric,due_31_60 numeric,due_61_plus numeric,open_purchases bigint)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.salesdesk_can(p_business_id,'finance.manage') then raise exception 'Finance access required';end if;
  return query with paid as(select purchase_id,sum(amount) paid from public.purchase_payments where business_id=p_business_id group by purchase_id),base as(
    select p.supplier_id,coalesce(s.name,'No supplier') supplier_name,p.total,coalesce(pa.paid,0) paid,greatest(p.total-coalesce(pa.paid,0),0) balance,coalesce(p.due_date,p.purchase_date+coalesce(s.payment_terms_days,0)) due_date
    from public.purchases p left join public.suppliers s on s.id=p.supplier_id left join paid pa on pa.purchase_id=p.id where p.business_id=p_business_id and p.status<>'cancelled' and public.salesdesk_has_branch_access(p_business_id,p.branch_id)
  ) select b.supplier_id,b.supplier_name,sum(b.total),sum(b.paid),sum(b.balance),sum(case when b.balance>0 and b.due_date>=current_date then b.balance else 0 end),sum(case when b.balance>0 and b.due_date<current_date and b.due_date>=current_date-30 then b.balance else 0 end),sum(case when b.balance>0 and b.due_date<current_date-30 and b.due_date>=current_date-60 then b.balance else 0 end),sum(case when b.balance>0 and b.due_date<current_date-60 then b.balance else 0 end),count(*) filter(where b.balance>0) from base b group by b.supplier_id,b.supplier_name order by sum(b.balance) desc,b.supplier_name;
end $$;
revoke all on function public.salesdesk_supplier_aging(uuid) from public,anon;grant execute on function public.salesdesk_supplier_aging(uuid) to authenticated;

create or replace function public.salesdesk_daily_brief_v2(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v jsonb;today_sales numeric;yesterday_sales numeric;month_sales numeric;prev_month_sales numeric;month_exp numeric;month_cogs numeric;
begin
 if not public.is_business_member(p_business_id) then raise exception 'Not authorized';end if;
 select coalesce(sum(total),0) into today_sales from public.invoices where business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,branch_id) and created_at>=date_trunc('day',now());
 select coalesce(sum(total),0) into yesterday_sales from public.invoices where business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,branch_id) and created_at>=date_trunc('day',now())-interval '1 day' and created_at<date_trunc('day',now());
 select coalesce(sum(total),0) into month_sales from public.invoices where business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,branch_id) and created_at>=date_trunc('month',now());
 select coalesce(sum(total),0) into prev_month_sales from public.invoices where business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,branch_id) and created_at>=date_trunc('month',now())-interval '1 month' and created_at<date_trunc('month',now());
 select coalesce(sum(amount),0) into month_exp from public.expenses where business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,branch_id) and expense_date>=date_trunc('month',current_date)::date;
 select coalesce(sum(ii.cost_price*ii.quantity),0) into month_cogs from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where i.business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,i.branch_id) and i.created_at>=date_trunc('month',now());
 select jsonb_build_object(
  'today_sales',today_sales,'yesterday_sales',yesterday_sales,'today_change_pct',case when yesterday_sales>0 then round(((today_sales-yesterday_sales)/yesterday_sales)*100,1) else null end,'today_transactions',(select count(*) from public.invoices where business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,branch_id) and created_at>=date_trunc('day',now())),
  'month_sales',month_sales,'previous_month_sales',prev_month_sales,'month_change_pct',case when prev_month_sales>0 then round(((month_sales-prev_month_sales)/prev_month_sales)*100,1) else null end,'month_expenses',month_exp,'month_cogs',month_cogs,'estimated_month_profit',month_sales-month_cogs-month_exp,
  'receivables',coalesce((select sum(case when i.payment_status='paid' then 0 else greatest(i.total-coalesce((select sum(ip.amount) from public.invoice_payments ip where ip.invoice_id=i.id),0),0) end) from public.invoices i where i.business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,i.branch_id)),0),
  'overdue_receivables',coalesce((select sum(greatest(i.total-coalesce((select sum(ip.amount) from public.invoice_payments ip where ip.invoice_id=i.id),0),0)) from public.invoices i where i.business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,i.branch_id) and i.payment_status<>'paid' and i.due_date is not null and i.due_date<current_date),0),
  'payables',coalesce((select sum(greatest(p.total-coalesce((select sum(pp.amount) from public.purchase_payments pp where pp.purchase_id=p.id),0),0)) from public.purchases p where p.business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,p.branch_id) and p.payment_status<>'paid' and p.status<>'cancelled'),0),
  'low_stock',(select count(*) from public.products where business_id=p_business_id and is_active=true and track_stock=true and stock<=reorder_level),'leads',(select count(*) from public.customers where business_id=p_business_id and status='lead'),'due_followups',(select count(*) from public.customer_followups where business_id=p_business_id and status='open' and due_at is not null and due_at<=now() and (assigned_to is null or assigned_to=auth.uid() or public.has_business_role(p_business_id,array['owner','admin','manager']))),'active_team',(select count(*) from public.business_members where business_id=p_business_id and is_active=true),
  'top_products',coalesce((select jsonb_agg(jsonb_build_object('name',x.product_name,'quantity',x.qty,'revenue',x.revenue)) from(select ii.product_name,sum(ii.quantity) qty,sum(ii.line_total) revenue from public.invoice_items ii join public.invoices i on i.id=ii.invoice_id where i.business_id=p_business_id and public.salesdesk_has_branch_access(p_business_id,i.branch_id) and i.created_at>=date_trunc('month',now()) group by ii.product_name order by sum(ii.line_total) desc limit 5)x),'[]'::jsonb),
  'branch_performance',coalesce((select jsonb_agg(jsonb_build_object('branch_id',x.branch_id,'name',x.name,'revenue',x.revenue,'transactions',x.transactions)) from(select b.id branch_id,b.name,coalesce(sum(i.total),0) revenue,count(i.id) transactions from public.branches b left join public.invoices i on i.branch_id=b.id and i.created_at>=date_trunc('month',now()) where b.business_id=p_business_id and b.is_active=true and public.salesdesk_has_branch_access(p_business_id,b.id) group by b.id,b.name order by coalesce(sum(i.total),0) desc)x),'[]'::jsonb)
 ) into v;return v;
end $$;
revoke all on function public.salesdesk_daily_brief_v2(uuid) from public,anon;grant execute on function public.salesdesk_daily_brief_v2(uuid) to authenticated;
