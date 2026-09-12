-- TripMate secure document vault
create table if not exists public.trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  file_name text not null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table public.trip_documents enable row level security;

drop policy if exists "document owner access" on public.trip_documents;
create policy "document owner access" on public.trip_documents
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists trip_documents_trip_id_idx on public.trip_documents(trip_id);

do $$
begin
  alter publication supabase_realtime add table public.trip_documents;
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-documents', 'trip-documents', false, 15728640)
on conflict (id) do nothing;

drop policy if exists "trip document read own" on storage.objects;
create policy "trip document read own" on storage.objects
for select using (
  bucket_id = 'trip-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "trip document upload own" on storage.objects;
create policy "trip document upload own" on storage.objects
for insert with check (
  bucket_id = 'trip-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "trip document delete own" on storage.objects;
create policy "trip document delete own" on storage.objects
for delete using (
  bucket_id = 'trip-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
