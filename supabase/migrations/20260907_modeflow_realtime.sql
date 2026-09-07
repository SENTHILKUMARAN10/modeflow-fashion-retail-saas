-- ModeFlow realtime production migration
-- Safe to run after the base schema.

create extension if not exists "pgcrypto";

-- Create the first business and owner membership atomically.
create or replace function public.create_business_with_owner(
  p_name text,
  p_slug text default null,
  p_phone text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_business uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  v_slug := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.businesses(name, slug, phone, address, created_by)
  values (trim(p_name), v_slug, nullif(trim(p_phone), ''), nullif(trim(p_address), ''), v_user)
  returning id into v_business;

  insert into public.business_members(business_id, user_id, role)
  values (v_business, v_user, 'owner');

  return v_business;
end;
$$;

grant execute on function public.create_business_with_owner(text,text,text,text) to authenticated;

-- Atomic POS checkout: create customer, invoice + item, reduce stock, log movement.
create or replace function public.complete_sale(
  p_business_id uuid,
  p_product_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_quantity numeric,
  p_rate numeric,
  p_discount numeric default 0,
  p_payment_method text default 'upi',
  p_payment_status text default 'paid'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_product public.products%rowtype;
  v_customer uuid;
  v_invoice uuid;
  v_invoice_number text;
  v_subtotal numeric(12,2);
  v_total numeric(12,2);
begin
  if v_user is null or not public.is_business_member(p_business_id) then
    raise exception 'Not authorized for this business';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and business_id = p_business_id and is_active = true
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_product.stock < p_quantity then
    raise exception 'Not enough stock';
  end if;

  v_subtotal := round((p_quantity * p_rate)::numeric, 2);
  v_total := greatest(0, v_subtotal - coalesce(p_discount,0));
  v_invoice_number := 'MF-' || to_char(now(),'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));

  if nullif(trim(p_customer_phone),'') is not null then
    select id into v_customer
    from public.customers
    where business_id = p_business_id and phone = trim(p_customer_phone)
    order by created_at asc
    limit 1;
  end if;

  if v_customer is null then
    insert into public.customers(business_id,name,phone)
    values (p_business_id, coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'), nullif(trim(p_customer_phone),''))
    returning id into v_customer;
  else
    update public.customers
    set name = coalesce(nullif(trim(p_customer_name),''), name)
    where id = v_customer;
  end if;

  insert into public.invoices(
    business_id, invoice_number, customer_id, customer_name, customer_phone,
    subtotal, discount, tax, total, payment_status, payment_method, created_by
  ) values (
    p_business_id, v_invoice_number, v_customer,
    coalesce(nullif(trim(p_customer_name),''),'Walk-in customer'), nullif(trim(p_customer_phone),''),
    v_subtotal, coalesce(p_discount,0), 0, v_total, p_payment_status, p_payment_method, v_user
  ) returning id into v_invoice;

  insert into public.invoice_items(invoice_id,product_id,product_name,quantity,rate,line_total)
  values (v_invoice,v_product.id,v_product.name,p_quantity,p_rate,v_subtotal);

  update public.products
  set stock = stock - p_quantity
  where id = v_product.id;

  insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by)
  values (p_business_id,v_product.id,'sale',-p_quantity,v_invoice,'ModeFlow POS sale',v_user);

  return v_invoice;
end;
$$;

grant execute on function public.complete_sale(uuid,uuid,text,text,numeric,numeric,numeric,text,text) to authenticated;

-- Restore stock and remove an invoice atomically (owner only).
create or replace function public.delete_sale(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_item record;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if not found then return; end if;

  if not public.has_business_role(v_invoice.business_id, array['owner']) then
    raise exception 'Owner access required';
  end if;

  for v_item in select * from public.invoice_items where invoice_id = p_invoice_id loop
    if v_item.product_id is not null then
      update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
      insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_id,note,created_by)
      values(v_invoice.business_id,v_item.product_id,'return',v_item.quantity,p_invoice_id,'Invoice deleted; stock restored',auth.uid());
    end if;
  end loop;

  delete from public.invoices where id = p_invoice_id;
end;
$$;

grant execute on function public.delete_sale(uuid) to authenticated;

-- Ensure realtime emits row changes for the core tables.
do $$
begin
  begin alter publication supabase_realtime add table public.products; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.customers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.invoices; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.invoice_items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.expenses; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.stock_movements; exception when duplicate_object then null; end;
end $$;
