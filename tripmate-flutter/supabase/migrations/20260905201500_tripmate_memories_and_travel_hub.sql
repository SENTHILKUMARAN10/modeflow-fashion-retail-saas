-- TripMate v1.1: memories, bookings, important info and private media storage

create table if not exists public.trip_memories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'Other',
  title text not null,
  confirmation_code text,
  provider text,
  starts_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'note',
  created_at timestamptz not null default now()
);

alter table public.trip_memories enable row level security;
alter table public.trip_bookings enable row level security;
alter table public.trip_notes enable row level security;

drop policy if exists "memory owner access" on public.trip_memories;
create policy "memory owner access" on public.trip_memories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "booking owner access" on public.trip_bookings;
create policy "booking owner access" on public.trip_bookings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "note owner access" on public.trip_notes;
create policy "note owner access" on public.trip_notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-memories',
  'trip-memories',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage path format: <user_id>/<trip_id>/<filename>
drop policy if exists "users read own trip memories" on storage.objects;
create policy "users read own trip memories" on storage.objects
for select to authenticated
using (
  bucket_id = 'trip-memories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users upload own trip memories" on storage.objects;
create policy "users upload own trip memories" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'trip-memories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own trip memories" on storage.objects;
create policy "users delete own trip memories" on storage.objects
for delete to authenticated
using (
  bucket_id = 'trip-memories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create index if not exists trip_memories_trip_id_idx on public.trip_memories(trip_id);
create index if not exists trip_bookings_trip_id_idx on public.trip_bookings(trip_id);
create index if not exists trip_notes_trip_id_idx on public.trip_notes(trip_id);

do $$ begin
  alter publication supabase_realtime add table public.trip_memories;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.trip_bookings;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.trip_notes;
exception when duplicate_object then null; end $$;
