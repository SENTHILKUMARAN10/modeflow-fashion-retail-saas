-- SalesDesk branch-aware recurring invoice inventory processing
-- Migration version: 202609111132

create or replace function public.salesdesk_process_recurring_invoice(p_schedule_id uuid,p_run_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  s public.recurring_invoice_schedules%rowtype;v_key text;v_exec uuid;v_invoice uuid;v_customer uuid;v_number text;v_prefix text;
  v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_rate numeric;v_line numeric;v_sub numeric:=0;v_total numeric;v_next timestamptz;
  v_wh uuid;v_wh_default boolean;v_available numeric;v_nondefault numeric;
begin
  select * into s from public.recurring_invoice_schedules where id=p_schedule_id for update;
  if not found or not s.is_active or s.next_run_at>p_run_at then return jsonb_build_object('status','skipped');end if;
  if not public.has_active_subscription(s.business_id) then
    update public.recurring_invoice_schedules set last_error='Active SalesDesk subscription required' where id=s.id;
    return jsonb_build_object('status','failed','error','Active SalesDesk subscription required');
  end if;
  if s.branch_id is not null and not exists(select 1 from public.branches where id=s.branch_id and business_id=s.business_id and is_active=true) then
    update public.recurring_invoice_schedules set last_error='Assigned branch is no longer active' where id=s.id;
    return jsonb_build_object('status','failed','error','Assigned branch is no longer active');
  end if;

  v_key:=to_char(s.next_run_at at time zone 'UTC','YYYYMMDDHH24MI');
  insert into public.automation_executions(business_id,source_type,source_id,run_key)
    values(s.business_id,'recurring_invoice',s.id,v_key)
    on conflict(source_type,source_id,run_key) do nothing returning id into v_exec;
  if v_exec is null then return jsonb_build_object('status','skipped','reason','already processed');end if;

  begin
    select w.id,w.is_default into v_wh,v_wh_default
    from public.warehouses w
    where w.business_id=s.business_id and w.is_active=true and (s.branch_id is null or w.branch_id=s.branch_id)
    order by case when s.branch_id is not null and w.branch_id=s.branch_id then 0 when w.is_default then 1 else 2 end,w.created_at limit 1;

    if s.branch_id is not null and v_wh is null then raise exception 'No active warehouse is available for the recurring invoice branch';end if;

    for v_item in select value from jsonb_array_elements(s.items) order by value->>'product_id' loop
      v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
      if v_qty is null or v_qty<=0 or v_qty>100000 or v_rate is null or v_rate<0 or v_rate>100000000 then raise exception 'Invalid recurring invoice item';end if;
      select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=s.business_id and is_active=true for update;
      if not found then raise exception 'Product or service not found';end if;
      if v_product.track_stock then
        if v_wh is null or coalesce(v_wh_default,false) then
          select coalesce(sum(ib.quantity),0) into v_nondefault
          from public.inventory_balances ib join public.warehouses w on w.id=ib.warehouse_id
          where ib.business_id=s.business_id and ib.product_id=v_product.id and not w.is_default and w.is_active=true;
          v_available:=greatest(v_product.stock-v_nondefault,0);
        else
          select coalesce(quantity,0) into v_available from public.inventory_balances where warehouse_id=v_wh and product_id=v_product.id;
          v_available:=coalesce(v_available,0);
        end if;
        if v_available<v_qty then raise exception 'Not enough stock for % at the scheduled branch',v_product.name;end if;
      end if;
      v_sub:=v_sub+round(v_qty*v_rate,2);
    end loop;

    if s.discount>v_sub then raise exception 'Recurring invoice discount exceeds subtotal';end if;
    v_total:=v_sub-s.discount;
    select upper(invoice_prefix) into v_prefix from public.businesses where id=s.business_id;
    v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');
    v_number:=v_prefix||'-R-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));

    v_customer:=s.customer_id;
    if v_customer is not null and not exists(select 1 from public.customers where id=v_customer and business_id=s.business_id) then v_customer:=null;end if;
    if v_customer is null and nullif(trim(s.customer_phone),'') is not null then
      select id into v_customer from public.customers where business_id=s.business_id and phone=trim(s.customer_phone) order by created_at limit 1;
    end if;
    if v_customer is null then
      insert into public.customers(business_id,name,email,phone)
        values(s.business_id,s.customer_name,nullif(trim(s.customer_email),''),nullif(trim(s.customer_phone),'')) returning id into v_customer;
    end if;

    insert into public.invoices(business_id,branch_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,due_date,notes,created_by)
      values(s.business_id,s.branch_id,v_number,v_customer,s.customer_name,nullif(trim(s.customer_phone),''),v_sub,s.discount,0,v_total,'unpaid',s.payment_method,(p_run_at at time zone 'UTC')::date+s.due_days,'Generated by SalesDesk recurring invoice: '||s.name,s.created_by)
      returning id into v_invoice;

    for v_item in select value from jsonb_array_elements(s.items) order by value->>'product_id' loop
      v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
      select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=s.business_id for update;
      v_line:=round(v_qty*v_rate,2);
      insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total)
        values(v_invoice,v_product.id,v_product.name,v_qty,v_rate,v_product.cost_price,v_line);
      if v_product.track_stock then
        update public.products set stock=stock-v_qty where id=v_product.id;
        if v_wh is not null and not coalesce(v_wh_default,false) then
          update public.inventory_balances set quantity=quantity-v_qty,updated_at=now()
          where warehouse_id=v_wh and product_id=v_product.id;
        end if;
        insert into public.stock_movements(business_id,product_id,warehouse_id,movement_type,quantity,reference_id,note,created_by)
          values(s.business_id,v_product.id,v_wh,'sale',-v_qty,v_invoice,'Recurring invoice '||s.name,s.created_by);
      end if;
    end loop;

    v_next:=public.salesdesk_advance_schedule(s.next_run_at,s.cadence,s.interval_count);
    update public.recurring_invoice_schedules set last_run_at=p_run_at,last_invoice_id=v_invoice,next_run_at=v_next,run_count=run_count+1,last_error=null,
      is_active=case when end_at is not null and v_next>end_at then false else is_active end where id=s.id;
    update public.automation_executions set status='success',result_id=v_invoice,finished_at=now() where id=v_exec;
    return jsonb_build_object('status','success','result_id',v_invoice,'next_run_at',v_next,'warehouse_id',v_wh);
  exception when others then
    update public.automation_executions set status='failed',error_message=sqlerrm,finished_at=now() where id=v_exec;
    update public.recurring_invoice_schedules set last_error=sqlerrm where id=s.id;
    return jsonb_build_object('status','failed','error',sqlerrm);
  end;
end $$;
revoke all on function public.salesdesk_process_recurring_invoice(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.salesdesk_process_recurring_invoice(uuid,timestamptz) to service_role;
