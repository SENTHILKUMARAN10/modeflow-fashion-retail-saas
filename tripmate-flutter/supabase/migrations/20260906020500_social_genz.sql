-- TripMate social + Gen Z collaboration layer
create extension if not exists "pgcrypto";

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
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'traveler' check (role in ('owner','traveler')),
  joined_at timestamptz not null default now(),
  unique(trip_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
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
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.trip_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.vibe_drops enable row level security;

-- Profiles are discoverable so usernames can be searched/tagged.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profile owner insert" on public.profiles;
create policy "profile owner insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Friend requests visible and editable only by the two people involved.
drop policy if exists "friendship participants read" on public.friendships;
create policy "friendship participants read" on public.friendships for select to authenticated using (auth.uid() in (requester_id, addressee_id));
drop policy if exists "friendship requester insert" on public.friendships;
create policy "friendship requester insert" on public.friendships for insert to authenticated with check (auth.uid() = requester_id);
drop policy if exists "friendship participants update" on public.friendships;
create policy "friendship participants update" on public.friendships for update to authenticated using (auth.uid() in (requester_id, addressee_id));

-- Trip crew visibility for the owner and members.
drop policy if exists "trip members read" on public.trip_members;
create policy "trip members read" on public.trip_members for select to authenticated using (
  auth.uid() = user_id or auth.uid() = added_by or exists(select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
);
drop policy if exists "trip owner add members" on public.trip_members;
create policy "trip owner add members" on public.trip_members for insert to authenticated with check (
  auth.uid() = added_by and exists(select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
);
drop policy if exists "trip owner remove members" on public.trip_members;
create policy "trip owner remove members" on public.trip_members for delete to authenticated using (
  exists(select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()) or auth.uid() = user_id
);

-- Conversation membership controls access.
drop policy if exists "conversation members read" on public.conversations;
create policy "conversation members read" on public.conversations for select to authenticated using (
  exists(select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = auth.uid())
);
drop policy if exists "authenticated create conversation" on public.conversations;
create policy "authenticated create conversation" on public.conversations for insert to authenticated with check (true);

drop policy if exists "conversation membership read" on public.conversation_members;
create policy "conversation membership read" on public.conversation_members for select to authenticated using (
  exists(select 1 from public.conversation_members mine where mine.conversation_id = conversation_id and mine.user_id = auth.uid())
);
drop policy if exists "conversation member insert" on public.conversation_members;
create policy "conversation member insert" on public.conversation_members for insert to authenticated with check (auth.uid() = user_id or exists(select 1 from public.conversation_members mine where mine.conversation_id = conversation_id and mine.user_id = auth.uid()));

drop policy if exists "messages member read" on public.messages;
create policy "messages member read" on public.messages for select to authenticated using (
  exists(select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = auth.uid())
);
drop policy if exists "messages member send" on public.messages;
create policy "messages member send" on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and exists(select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = auth.uid())
);

-- Vibe Drops are visible to authenticated users for discovery; owners manage their own.
drop policy if exists "vibe drops read" on public.vibe_drops;
create policy "vibe drops read" on public.vibe_drops for select to authenticated using (expires_at > now());
drop policy if exists "vibe drops owner insert" on public.vibe_drops;
create policy "vibe drops owner insert" on public.vibe_drops for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "vibe drops owner delete" on public.vibe_drops;
create policy "vibe drops owner delete" on public.vibe_drops for delete to authenticated using (auth.uid() = user_id);

-- Backfill a profile for existing users. Username can be edited later.
insert into public.profiles (id, username, full_name)
select u.id,
       'traveler_' || substr(replace(u.id::text, '-', ''), 1, 8),
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    'traveler_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.trip_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.vibe_drops; exception when duplicate_object then null; end $$;

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
create index if not exists trip_members_trip_idx on public.trip_members(trip_id);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists vibe_drops_expires_idx on public.vibe_drops(expires_at);
