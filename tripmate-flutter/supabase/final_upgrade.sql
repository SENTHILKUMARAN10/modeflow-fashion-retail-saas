-- TripMate final Supabase upgrade
-- Run this once after the base trips/itinerary/expenses/checklist schema is already installed.

-- === Memories, bookings, notes and private memory storage ===
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
create policy "memory owner access" on public.trip_memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "booking owner access" on public.trip_bookings;
create policy "booking owner access" on public.trip_bookings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "note owner access" on public.trip_notes;
create policy "note owner access" on public.trip_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-memories','trip-memories',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "users read own trip memories" on storage.objects;
create policy "users read own trip memories" on storage.objects for select to authenticated using (bucket_id='trip-memories' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "users upload own trip memories" on storage.objects;
create policy "users upload own trip memories" on storage.objects for insert to authenticated with check (bucket_id='trip-memories' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "users delete own trip memories" on storage.objects;
create policy "users delete own trip memories" on storage.objects for delete to authenticated using (bucket_id='trip-memories' and (storage.foldername(name))[1]=auth.uid()::text);
create index if not exists trip_memories_trip_id_idx on public.trip_memories(trip_id);
create index if not exists trip_bookings_trip_id_idx on public.trip_bookings(trip_id);
create index if not exists trip_notes_trip_id_idx on public.trip_notes(trip_id);
do $$ begin alter publication supabase_realtime add table public.trip_memories; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.trip_bookings; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.trip_notes; exception when duplicate_object then null; end $$;

-- === Secure Travel Vault ===
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
create policy "document owner access" on public.trip_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists trip_documents_trip_id_idx on public.trip_documents(trip_id);
do $$ begin alter publication supabase_realtime add table public.trip_documents; exception when duplicate_object then null; end $$;
insert into storage.buckets (id,name,public,file_size_limit) values ('trip-documents','trip-documents',false,15728640) on conflict (id) do nothing;
drop policy if exists "trip document read own" on storage.objects;
create policy "trip document read own" on storage.objects for select using (bucket_id='trip-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "trip document upload own" on storage.objects;
create policy "trip document upload own" on storage.objects for insert with check (bucket_id='trip-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "trip document delete own" on storage.objects;
create policy "trip document delete own" on storage.objects for delete using (bucket_id='trip-documents' and (storage.foldername(name))[1]=auth.uid()::text);

-- === Profiles, friends, trip crew, messages, Vibe Drops ===
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  bio text,
  avatar_url text,
  home_city text,
  travel_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requester_id,addressee_id),
  check (requester_id<>addressee_id)
);
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'traveler' check (role in ('owner','traveler')),
  joined_at timestamptz not null default now(),
  unique(trip_id,user_id)
);
create table if not exists public.conversations (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create table if not exists public.vibe_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  vibe text not null default '✨',
  caption text,
  place text,
  storage_path text,
  expires_at timestamptz not null default (now()+interval '24 hours'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.trip_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.vibe_drops enable row level security;
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
drop policy if exists "profile owner insert" on public.profiles;
create policy "profile owner insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
drop policy if exists "friendship participants read" on public.friendships;
create policy "friendship participants read" on public.friendships for select to authenticated using (auth.uid() in (requester_id,addressee_id));
drop policy if exists "friendship requester insert" on public.friendships;
create policy "friendship requester insert" on public.friendships for insert to authenticated with check (auth.uid()=requester_id);
drop policy if exists "friendship participants update" on public.friendships;
create policy "friendship participants update" on public.friendships for update to authenticated using (auth.uid() in (requester_id,addressee_id));
drop policy if exists "trip members read" on public.trip_members;
create policy "trip members read" on public.trip_members for select to authenticated using (auth.uid()=user_id or auth.uid()=added_by or exists(select 1 from public.trips t where t.id=trip_id and t.user_id=auth.uid()));
drop policy if exists "trip owner add members" on public.trip_members;
create policy "trip owner add members" on public.trip_members for insert to authenticated with check (auth.uid()=added_by and exists(select 1 from public.trips t where t.id=trip_id and t.user_id=auth.uid()));
drop policy if exists "trip owner remove members" on public.trip_members;
create policy "trip owner remove members" on public.trip_members for delete to authenticated using (exists(select 1 from public.trips t where t.id=trip_id and t.user_id=auth.uid()) or auth.uid()=user_id);

-- SECURITY DEFINER helper avoids recursive RLS checks on conversation_members.
create or replace function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.conversation_members where conversation_id=cid and user_id=auth.uid());
$$;
revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists "conversation members read" on public.conversations;
create policy "conversation members read" on public.conversations for select to authenticated using (public.is_conversation_member(id));
drop policy if exists "authenticated create conversation" on public.conversations;
create policy "authenticated create conversation" on public.conversations for insert to authenticated with check (true);
drop policy if exists "conversation membership read" on public.conversation_members;
create policy "conversation membership read" on public.conversation_members for select to authenticated using (user_id=auth.uid() or public.is_conversation_member(conversation_id));
drop policy if exists "conversation member insert" on public.conversation_members;
create policy "conversation member insert" on public.conversation_members for insert to authenticated with check (user_id=auth.uid() or public.is_conversation_member(conversation_id));
drop policy if exists "messages member read" on public.messages;
create policy "messages member read" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists "messages member send" on public.messages;
create policy "messages member send" on public.messages for insert to authenticated with check (auth.uid()=sender_id and public.is_conversation_member(conversation_id));
drop policy if exists "vibe drops read" on public.vibe_drops;
create policy "vibe drops read" on public.vibe_drops for select to authenticated using (expires_at>now());
drop policy if exists "vibe drops owner insert" on public.vibe_drops;
create policy "vibe drops owner insert" on public.vibe_drops for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "vibe drops owner delete" on public.vibe_drops;
create policy "vibe drops owner delete" on public.vibe_drops for delete to authenticated using (auth.uid()=user_id);
insert into public.profiles(id,username,full_name)
select u.id,'traveler_'||substr(replace(u.id::text,'-',''),1,8),coalesce(u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1))
from auth.users u on conflict (id) do nothing;
create or replace function public.handle_new_user_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,full_name)
  values(new.id,'traveler_'||substr(replace(new.id::text,'-',''),1,8),coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.handle_new_user_profile();
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.trip_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.vibe_drops; exception when duplicate_object then null; end $$;
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
create index if not exists trip_members_trip_idx on public.trip_members(trip_id);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists vibe_drops_expires_idx on public.vibe_drops(expires_at);
