-- TripMate real-time backend
create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric(12,2) not null default 0,
  cover_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  place text,
  notes text,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'Other',
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.expenses enable row level security;
alter table public.checklist_items enable row level security;

drop policy if exists "trip owner access" on public.trips;
create policy "trip owner access" on public.trips
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "itinerary owner access" on public.itinerary_items;
create policy "itinerary owner access" on public.itinerary_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expense owner access" on public.expenses;
create policy "expense owner access" on public.expenses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "checklist owner access" on public.checklist_items;
create policy "checklist owner access" on public.checklist_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.itinerary_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.checklist_items;
exception when duplicate_object then null;
end $$;

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists itinerary_trip_id_idx on public.itinerary_items(trip_id);
create index if not exists expenses_trip_id_idx on public.expenses(trip_id);
create index if not exists checklist_trip_id_idx on public.checklist_items(trip_id);
