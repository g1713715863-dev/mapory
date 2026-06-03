-- ============================================================
-- Mapory — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- User profiles (extends Supabase auth.users)
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.user_profiles for select using (true);

create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trips (journeys)
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  start_date date,
  end_date date,
  is_public boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "Trips viewable by admin or if public"
  on public.trips for select using (
    is_public = true
    or exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );

create policy "Only admins can manage trips"
  on public.trips for all using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  storage_key text not null,
  url text not null,
  thumbnail_url text,
  title text,
  body text,
  lat double precision,
  lng double precision,
  location_name text,
  taken_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Photos viewable by admin or if trip is public"
  on public.photos for select using (
    exists (select 1 from public.trips where id = trip_id and is_public = true)
    or exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );

create policy "Only admins can manage photos"
  on public.photos for all using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );

-- Spatial index for map queries
create index photos_location_idx on public.photos (lat, lng) where lat is not null and lng is not null;

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) > 0 and char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can insert comments"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Admins can delete any comment"
  on public.comments for delete using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- View: comments with user display name (security_invoker prevents privilege escalation)
create view public.comments_with_user
with (security_invoker = true)
as
  select
    c.id,
    c.photo_id,
    c.user_id,
    c.body,
    c.created_at,
    p.display_name
  from public.comments c
  left join public.user_profiles p on p.id = c.user_id;

grant select on public.comments_with_user to authenticated;

-- Share links (admin-created links giving access to specific trips)
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  trip_ids uuid[] not null,
  label text not null default '',
  created_at timestamptz not null default now()
);

alter table public.share_links enable row level security;

create policy "Anyone can read share links"
  on public.share_links for select using (true);

create policy "Only admins can manage share links"
  on public.share_links for all using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );
