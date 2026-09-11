-- SalesDesk multi-item transaction engine
-- Migration version: 202609102232

create or replace function public.complete_multi_item_sale(
  p_business_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method text default 'upi',
  p_payment_status text default 'paid',
  p_branch_id uuid default null,
  p_idempotency_key uuid default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid();v_invoice uuid;v_existing uuid;v_customer uuid;v_number text;v_prefix text;
  v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_rate numeric;v_line numeric;v_sub numeric:=0;v_total numeric;
begin
  if v_user is null or not public.is_business_member(p_business_id) then raise exception 'Not authorized for this business';end if;
  if not public.has_active_subscription(p_business_id) then raise exception 'SalesDesk subscription required' using errcode='42501';end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 sale items';end if;
  if coalesce(p_discount,0)<0 then raise exception 'Invalid discount';end if;
  if p_payment_method not in ('cash','upi','card','bank','other') or p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment details';end if;
  if p_branch_id is not null and not exists(select 1 from public.branches where id=p_branch_id and business_id=p_business_id and is_active=true) then raise exception 'Invalid branch';end if;
  if p_idempotency_key is not null then select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;if v_existing is not null then return v_existing;end if;end if;

  -- Validate and lock products in deterministic order to reduce deadlock risk.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
    if v_qty is null or v_qty<=0 or v_qty>100000 or v_rate is null or v_rate<0 or v_rate>100000000 then raise exception 'Invalid sale item';end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true for update;
    if not found then raise exception 'Product or service not found';end if;
    if v_product.track_stock and v_product.stock<v_qty then raise exception 'Not enough stock for %',v_product.name;end if;
    v_sub:=v_sub+round(v_qty*v_rate,2);
  end loop;
  if coalesce(p_discount,0)>v_sub then raise exception 'Discount cannot exceed subtotal';end if;
  v_total:=v_sub-coalesce(p_discount,0);

  select upper(invoice_prefix) into v_prefix from public.businesses where id=p_business_id;v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');
  v_number:=v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  if nullif(trim(p_customer_phone),'') is not null then select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1;end if;
  if v_customer is null then insert into public.customers(business_id,name,phone) values(p_business_id,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),'')) returning id into v_customer;
  else update public.customers set name=coalesce(nullif(trim(p_customer_name),''),name) where id=v_customer;end if;

  insert into public.invoices(business_id,branch_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_by,idempotency_key)
  values(p_business_id,p_branch_id,v_number,v_customer,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),''),v_sub,coalesce(p_discount,0),0,v_total,p_payment_status,p_payment_method,v_user,p_idempotency_key) returning id into v_invoice;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id for update;
    v_line:=round(v_qty*v_rate,2);
    insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total) values(v_invoice,v_product.id,v_product.name,v_qty,v_rate,v_product.cost_price,v_line);
    if v_product.track_stock then
      update public.products set stock=stock-v_qty where id=v_product.id;
      insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by) values(p_business_id,v_product.id,'sale',-v_qty,v_invoice,'SalesDesk multi-item sale',v_user);
    end if;
  end loop;
  return v_invoice;
exception when unique_violation then
  if p_idempotency_key is not null then select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;if v_existing is not null then return v_existing;end if;end if;
  raise;
end $$;
revoke all on function public.complete_multi_item_sale(uuid,text,text,jsonb,numeric,text,text,uuid,uuid) from public,anon;
grant execute on function public.complete_multi_item_sale(uuid,text,text,jsonb,numeric,text,text,uuid,uuid) to authenticated;
