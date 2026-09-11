-- SalesDesk role/RPC hardening
-- Migration version: 202609111005
-- Enforces the role matrix inside SECURITY DEFINER business actions.

create or replace function public.complete_multi_item_sale(
  p_business_id uuid,p_customer_name text,p_customer_phone text,p_items jsonb,p_discount numeric default 0,
  p_payment_method text default 'upi',p_payment_status text default 'paid',p_branch_id uuid default null,p_idempotency_key uuid default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_invoice uuid;v_existing uuid;v_customer uuid;v_number text;v_prefix text;v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_rate numeric;v_line numeric;v_sub numeric:=0;v_total numeric;
begin
  if v_user is null or not public.salesdesk_can(p_business_id,'sales.create') then raise exception 'Sales access required';end if;
  if not public.salesdesk_has_branch_access(p_business_id,p_branch_id) then raise exception 'Branch access denied';end if;
  if not public.has_active_subscription(p_business_id) then raise exception 'SalesDesk subscription required' using errcode='42501';end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 sale items';end if;
  if coalesce(p_discount,0)<0 then raise exception 'Invalid discount';end if;
  if p_payment_method not in ('cash','upi','card','bank','other') or p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment details';end if;
  if p_branch_id is not null and not exists(select 1 from public.branches where id=p_branch_id and business_id=p_business_id and is_active=true) then raise exception 'Invalid branch';end if;
  if p_idempotency_key is not null then select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;if v_existing is not null then return v_existing;end if;end if;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;
    if v_qty is null or v_qty<=0 or v_qty>100000 or v_rate is null or v_rate<0 or v_rate>100000000 then raise exception 'Invalid sale item';end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true for update;
    if not found then raise exception 'Product or service not found';end if;if v_product.track_stock and v_product.stock<v_qty then raise exception 'Not enough stock for %',v_product.name;end if;v_sub:=v_sub+round(v_qty*v_rate,2);
  end loop;
  if coalesce(p_discount,0)>v_sub then raise exception 'Discount cannot exceed subtotal';end if;v_total:=v_sub-coalesce(p_discount,0);
  select upper(invoice_prefix) into v_prefix from public.businesses where id=p_business_id;v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');v_number:=v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  if nullif(trim(p_customer_phone),'') is not null then select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1;end if;
  if v_customer is null then insert into public.customers(business_id,name,phone) values(p_business_id,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),'')) returning id into v_customer;else update public.customers set name=coalesce(nullif(trim(p_customer_name),''),name) where id=v_customer;end if;
  insert into public.invoices(business_id,branch_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_by,idempotency_key)
  values(p_business_id,p_branch_id,v_number,v_customer,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),''),v_sub,coalesce(p_discount,0),0,v_total,p_payment_status,p_payment_method,v_user,p_idempotency_key) returning id into v_invoice;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id for update;v_line:=round(v_qty*v_rate,2);
    insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total) values(v_invoice,v_product.id,v_product.name,v_qty,v_rate,v_product.cost_price,v_line);
    if v_product.track_stock then update public.products set stock=stock-v_qty where id=v_product.id;insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by) values(p_business_id,v_product.id,'sale',-v_qty,v_invoice,'SalesDesk multi-item sale',v_user);end if;
  end loop;return v_invoice;
exception when unique_violation then if p_idempotency_key is not null then select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;if v_existing is not null then return v_existing;end if;end if;raise;
end $$;
revoke all on function public.complete_multi_item_sale(uuid,text,text,jsonb,numeric,text,text,uuid,uuid) from public,anon;grant execute on function public.complete_multi_item_sale(uuid,text,text,jsonb,numeric,text,text,uuid,uuid) to authenticated;

create or replace function public.complete_sale(
  p_business_id uuid,p_product_id uuid,p_customer_name text,p_customer_phone text,p_quantity numeric,p_rate numeric,p_discount numeric default 0,p_payment_method text default 'upi',p_payment_status text default 'paid',p_idempotency_key uuid default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_product public.products%rowtype;v_customer uuid;v_invoice uuid;v_existing uuid;v_number text;v_prefix text;v_sub numeric;v_total numeric;
begin
  if v_user is null or not public.salesdesk_can(p_business_id,'sales.create') then raise exception 'Sales access required';end if;
  if not public.has_active_subscription(p_business_id) then raise exception 'SalesDesk subscription required' using errcode='42501';end if;
  if p_quantity is null or p_quantity<=0 or p_quantity>100000 or p_rate is null or p_rate<0 then raise exception 'Invalid sale details';end if;
  if p_payment_method not in ('cash','upi','card','bank','other') or p_payment_status not in ('paid','partial','unpaid') then raise exception 'Invalid payment details';end if;
  if p_idempotency_key is not null then select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;if v_existing is not null then return v_existing;end if;end if;
  select * into v_product from public.products where id=p_product_id and business_id=p_business_id and is_active=true for update;if not found then raise exception 'Product or service not found';end if;
  if v_product.track_stock and v_product.stock<p_quantity then raise exception 'Not enough stock';end if;v_sub:=round(p_quantity*p_rate,2);if coalesce(p_discount,0)<0 or coalesce(p_discount,0)>v_sub then raise exception 'Invalid discount';end if;v_total:=v_sub-coalesce(p_discount,0);
  select upper(invoice_prefix) into v_prefix from public.businesses where id=p_business_id;v_prefix:=coalesce(nullif(trim(v_prefix),''),'SD');v_number:=v_prefix||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  if nullif(trim(p_customer_phone),'') is not null then select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1;end if;
  if v_customer is null then insert into public.customers(business_id,name,phone) values(p_business_id,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),'')) returning id into v_customer;end if;
  insert into public.invoices(business_id,invoice_number,customer_id,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_by,idempotency_key) values(p_business_id,v_number,v_customer,coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'),nullif(trim(p_customer_phone),''),v_sub,coalesce(p_discount,0),0,v_total,p_payment_status,p_payment_method,v_user,p_idempotency_key) returning id into v_invoice;
  insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,cost_price,line_total) values(v_invoice,v_product.id,v_product.name,p_quantity,p_rate,v_product.cost_price,v_sub);
  if v_product.track_stock then update public.products set stock=stock-p_quantity where id=v_product.id;insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by) values(p_business_id,v_product.id,'sale',-p_quantity,v_invoice,'SalesDesk sale',v_user);end if;return v_invoice;
exception when unique_violation then if p_idempotency_key is not null then select id into v_existing from public.invoices where business_id=p_business_id and idempotency_key=p_idempotency_key;if v_existing is not null then return v_existing;end if;end if;raise;
end $$;
revoke all on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text,uuid) from public,anon;grant execute on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text,uuid) to authenticated;

create or replace function public.record_invoice_payment(p_invoice_id uuid,p_amount numeric,p_payment_method text default 'upi',p_reference text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_invoice public.invoices%rowtype;v_payment uuid;v_paid numeric;
begin
  select * into v_invoice from public.invoices where id=p_invoice_id for update;if not found then raise exception 'Invoice not found';end if;
  if not (public.salesdesk_can(v_invoice.business_id,'finance.manage') or public.has_business_role(v_invoice.business_id,array['cashier'])) then raise exception 'Payment access required';end if;
  if not public.salesdesk_has_branch_access(v_invoice.business_id,v_invoice.branch_id) then raise exception 'Branch access denied';end if;
  if p_amount is null or p_amount<=0 then raise exception 'Payment amount must be greater than zero';end if;if p_payment_method not in ('cash','upi','card','bank','other') then raise exception 'Invalid payment method';end if;
  select coalesce(sum(amount),0) into v_paid from public.invoice_payments where invoice_id=p_invoice_id;if v_paid+p_amount>v_invoice.total then raise exception 'Payment exceeds invoice balance';end if;
  insert into public.invoice_payments(business_id,invoice_id,amount,payment_method,reference,created_by) values(v_invoice.business_id,p_invoice_id,p_amount,p_payment_method,nullif(trim(p_reference),''),v_user) returning id into v_payment;
  v_paid:=v_paid+p_amount;update public.invoices set payment_status=case when v_paid>=total then 'paid' else 'partial' end,payment_method=p_payment_method where id=p_invoice_id;return v_payment;
end $$;
revoke all on function public.record_invoice_payment(uuid,numeric,text,text) from public,anon;grant execute on function public.record_invoice_payment(uuid,numeric,text,text) to authenticated;

create or replace function public.create_purchase(p_business_id uuid,p_supplier_id uuid,p_items jsonb,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_purchase uuid;v_number text;v_sub numeric:=0;v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_cost numeric;
begin
 if v_user is null or not public.salesdesk_can(p_business_id,'purchases.manage') then raise exception 'Purchasing access required';end if;if not public.has_active_subscription(p_business_id) then raise exception 'SalesDesk subscription required' using errcode='42501';end if;
 if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and business_id=p_business_id and is_active=true) then raise exception 'Supplier not found';end if;if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 purchase items';end if;
 v_number:='PO-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));insert into public.purchases(business_id,supplier_id,purchase_number,status,subtotal,total,notes,created_by) values(p_business_id,p_supplier_id,v_number,'draft',0,0,nullif(trim(p_notes),''),v_user) returning id into v_purchase;
 for v_item in select value from jsonb_array_elements(p_items) loop v_qty:=(v_item->>'quantity')::numeric;v_cost:=(v_item->>'cost_price')::numeric;if v_qty is null or v_qty<=0 or v_cost is null or v_cost<0 then raise exception 'Invalid purchase line';end if;select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true;if not found then raise exception 'Purchase product not found';end if;insert into public.purchase_items(purchase_id,product_id,product_name,quantity,cost_price,line_total) values(v_purchase,v_product.id,v_product.name,v_qty,v_cost,round(v_qty*v_cost,2));v_sub:=v_sub+round(v_qty*v_cost,2);end loop;
 update public.purchases set subtotal=v_sub,total=v_sub where id=v_purchase;return v_purchase;
end $$;
revoke all on function public.create_purchase(uuid,uuid,jsonb,text) from public,anon;grant execute on function public.create_purchase(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.receive_purchase(p_purchase_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_purchase public.purchases%rowtype;v_item record;v_product public.products%rowtype;
begin
 select * into v_purchase from public.purchases where id=p_purchase_id for update;if not found then raise exception 'Purchase not found';end if;if not public.salesdesk_can(v_purchase.business_id,'purchases.manage') then raise exception 'Purchasing access required';end if;if v_purchase.status='received' then return;end if;if v_purchase.status='cancelled' then raise exception 'Cancelled purchase cannot be received';end if;
 for v_item in select * from public.purchase_items where purchase_id=p_purchase_id loop select * into v_product from public.products where id=v_item.product_id for update;if not found or v_product.business_id<>v_purchase.business_id then raise exception 'Invalid purchase product';end if;update public.products set cost_price=v_item.cost_price,stock=case when track_stock then stock+v_item.quantity else stock end where id=v_item.product_id;if v_product.track_stock then insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by) values(v_purchase.business_id,v_item.product_id,'purchase',v_item.quantity,p_purchase_id,'SalesDesk purchase received',v_user);end if;end loop;update public.purchases set status='received',received_at=now() where id=p_purchase_id;
end $$;
revoke all on function public.receive_purchase(uuid) from public,anon;grant execute on function public.receive_purchase(uuid) to authenticated;

create or replace function public.create_sales_document_v2(p_business_id uuid,p_branch_id uuid,p_document_type text,p_customer_name text,p_customer_phone text,p_items jsonb,p_expiry_date date default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_doc uuid;v_number text;v_item jsonb;v_product public.products%rowtype;v_qty numeric;v_rate numeric;v_sub numeric:=0;v_line numeric;v_customer uuid;
begin
 if v_user is null or not public.salesdesk_can(p_business_id,'sales.manage') then raise exception 'Sales access required';end if;if not public.salesdesk_has_branch_access(p_business_id,p_branch_id) then raise exception 'Branch access denied';end if;if p_document_type not in ('quote','sales_order') then raise exception 'Invalid document type';end if;if p_branch_id is not null and not exists(select 1 from public.branches where id=p_branch_id and business_id=p_business_id and is_active=true) then raise exception 'Branch not found';end if;if length(trim(coalesce(p_customer_name,'')))<2 then raise exception 'Customer name is required';end if;if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 items';end if;
 v_number:=(case when p_document_type='quote' then 'QT' else 'SO' end)||'-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));if nullif(trim(p_customer_phone),'') is not null then select id into v_customer from public.customers where business_id=p_business_id and phone=trim(p_customer_phone) order by created_at limit 1;end if;if v_customer is null then insert into public.customers(business_id,name,phone,status) values(p_business_id,trim(p_customer_name),nullif(trim(p_customer_phone),''),'lead') returning id into v_customer;end if;
 insert into public.sales_documents(business_id,branch_id,document_type,document_number,customer_id,customer_name,customer_phone,expiry_date,notes,created_by) values(p_business_id,p_branch_id,p_document_type,v_number,v_customer,trim(p_customer_name),nullif(trim(p_customer_phone),''),p_expiry_date,nullif(trim(p_notes),''),v_user) returning id into v_doc;
 for v_item in select value from jsonb_array_elements(p_items) loop v_qty:=(v_item->>'quantity')::numeric;v_rate:=(v_item->>'rate')::numeric;if v_qty is null or v_qty<=0 or v_rate is null or v_rate<0 then raise exception 'Invalid document line';end if;select * into v_product from public.products where id=(v_item->>'product_id')::uuid and business_id=p_business_id and is_active=true;if not found then raise exception 'Product or service not found';end if;v_line:=round(v_qty*v_rate,2);v_sub:=v_sub+v_line;insert into public.sales_document_items(document_id,product_id,item_name,quantity,rate,line_total) values(v_doc,v_product.id,v_product.name,v_qty,v_rate,v_line);end loop;update public.sales_documents set subtotal=v_sub,total=v_sub where id=v_doc;return v_doc;
end $$;
revoke all on function public.create_sales_document_v2(uuid,uuid,text,text,text,jsonb,date,text) from public,anon;grant execute on function public.create_sales_document_v2(uuid,uuid,text,text,text,jsonb,date,text) to authenticated;

create or replace function public.convert_quote_to_order(p_document_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_src public.sales_documents%rowtype;v_new uuid;v_number text;
begin
 select * into v_src from public.sales_documents where id=p_document_id for update;if not found or v_src.document_type<>'quote' then raise exception 'Quote not found';end if;if not public.salesdesk_can(v_src.business_id,'sales.manage') then raise exception 'Sales access required';end if;if not public.salesdesk_has_branch_access(v_src.business_id,v_src.branch_id) then raise exception 'Branch access denied';end if;if v_src.status in ('rejected','cancelled','fulfilled') then raise exception 'This quote cannot be converted';end if;v_number:='SO-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));insert into public.sales_documents(business_id,branch_id,document_type,document_number,customer_id,customer_name,customer_phone,issue_date,status,subtotal,discount,tax,total,notes,parent_document_id,created_by) values(v_src.business_id,v_src.branch_id,'sales_order',v_number,v_src.customer_id,v_src.customer_name,v_src.customer_phone,current_date,'accepted',v_src.subtotal,v_src.discount,v_src.tax,v_src.total,v_src.notes,v_src.id,v_user) returning id into v_new;insert into public.sales_document_items(document_id,product_id,item_name,quantity,rate,tax_rate,line_total) select v_new,product_id,item_name,quantity,rate,tax_rate,line_total from public.sales_document_items where document_id=v_src.id;update public.sales_documents set status='accepted' where id=v_src.id;return v_new;
end $$;
revoke all on function public.convert_quote_to_order(uuid) from public,anon;grant execute on function public.convert_quote_to_order(uuid) to authenticated;
