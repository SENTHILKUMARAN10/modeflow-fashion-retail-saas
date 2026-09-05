-- Thatha Kadai Business OS - multi-tenant SaaS schema
-- Run in Supabase SQL editor for the production cloud version.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  address text,
  currency text not null default 'INR',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sku text,
  unit text not null default 'kg',
  selling_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  stock numeric(12,3) not null default 0,
  reorder_level numeric(12,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status text not null default 'paid' check (payment_status in ('paid','partial','unpaid')),
  payment_method text not null default 'cash' check (payment_method in ('cash','upi','card','bank','other')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12,3) not null,
  rate numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null,
  note text,
  expense_date date not null default current_date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('purchase','sale','adjustment','return')),
  quantity numeric(12,3) not null,
  reference_id uuid,
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_products_business on public.products(business_id);
create index if not exists idx_customers_business on public.customers(business_id);
create index if not exists idx_invoices_business_date on public.invoices(business_id, created_at desc);
create index if not exists idx_expenses_business_date on public.expenses(business_id, expense_date desc);

create or replace function public.is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business and bm.user_id = auth.uid()
  );
$$;

create or replace function public.has_business_role(target_business uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business
      and bm.user_id = auth.uid()
      and bm.role = any(allowed_roles)
  );
$$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.expenses enable row level security;
alter table public.stock_movements enable row level security;

create policy "members read businesses" on public.businesses for select using (public.is_business_member(id));
create policy "users create businesses" on public.businesses for insert with check (created_by = auth.uid());
create policy "owners update businesses" on public.businesses for update using (public.has_business_role(id,array['owner']));

create policy "members read memberships" on public.business_members for select using (public.is_business_member(business_id));
create policy "owners manage memberships" on public.business_members for all using (public.has_business_role(business_id,array['owner'])) with check (public.has_business_role(business_id,array['owner']));

create policy "members read products" on public.products for select using (public.is_business_member(business_id));
create policy "managers write products" on public.products for all using (public.has_business_role(business_id,array['owner','manager'])) with check (public.has_business_role(business_id,array['owner','manager']));

create policy "members read customers" on public.customers for select using (public.is_business_member(business_id));
create policy "members write customers" on public.customers for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "members read invoices" on public.invoices for select using (public.is_business_member(business_id));
create policy "members create invoices" on public.invoices for insert with check (public.is_business_member(business_id) and created_by=auth.uid());
create policy "managers modify invoices" on public.invoices for update using (public.has_business_role(business_id,array['owner','manager']));
create policy "owners delete invoices" on public.invoices for delete using (public.has_business_role(business_id,array['owner']));

create policy "members read invoice items" on public.invoice_items for select using (exists(select 1 from public.invoices i where i.id=invoice_id and public.is_business_member(i.business_id)));
create policy "members create invoice items" on public.invoice_items for insert with check (exists(select 1 from public.invoices i where i.id=invoice_id and public.is_business_member(i.business_id)));

create policy "members read expenses" on public.expenses for select using (public.is_business_member(business_id));
create policy "members create expenses" on public.expenses for insert with check (public.is_business_member(business_id) and created_by=auth.uid());
create policy "managers modify expenses" on public.expenses for update using (public.has_business_role(business_id,array['owner','manager']));
create policy "owners delete expenses" on public.expenses for delete using (public.has_business_role(business_id,array['owner']));

create policy "members read stock movements" on public.stock_movements for select using (public.is_business_member(business_id));
create policy "members create stock movements" on public.stock_movements for insert with check (public.is_business_member(business_id) and created_by=auth.uid());
