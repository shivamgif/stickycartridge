-- ============================================================
-- GB Emu — Supabase Schema (Phase 5)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read all profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up (incl. anonymous)
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── ROMs ────────────────────────────────────────────────────
create table if not exists roms (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references profiles(id) on delete set null,
  title          text not null,
  description    text default '',
  storage_path   text not null,   -- path inside 'roms' storage bucket
  downloads      int  not null default 0,
  likes          int  not null default 0,
  created_at     timestamptz default now()
);

alter table roms enable row level security;

create policy "Anyone can read roms"
  on roms for select using (true);

create policy "Authenticated users can insert roms"
  on roms for insert with check (auth.uid() = owner_id);

create policy "Owners can delete their roms"
  on roms for delete using (auth.uid() = owner_id);

-- ── ROM Likes ────────────────────────────────────────────────
create table if not exists rom_likes (
  user_id uuid references profiles(id) on delete cascade,
  rom_id  uuid references roms(id) on delete cascade,
  primary key (user_id, rom_id)
);

alter table rom_likes enable row level security;

create policy "Users can read all likes"
  on rom_likes for select using (true);

create policy "Users can like roms"
  on rom_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike roms"
  on rom_likes for delete using (auth.uid() = user_id);

-- Keep the likes counter on roms in sync
create or replace function sync_rom_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update roms set likes = likes + 1 where id = new.rom_id;
  elsif (TG_OP = 'DELETE') then
    update roms set likes = greatest(0, likes - 1) where id = old.rom_id;
  end if;
  return null;
end;
$$;

create or replace trigger on_rom_like_change
  after insert or delete on rom_likes
  for each row execute function sync_rom_likes_count();

-- Keep the downloads counter on roms in sync (call via RPC)
create or replace function increment_downloads(rom_id uuid)
returns void language plpgsql security definer as $$
begin
  update roms set downloads = downloads + 1 where id = rom_id;
end;
$$;

-- ── Storage bucket ───────────────────────────────────────────
-- Create this in: Supabase Dashboard → Storage → New Bucket
-- Name: roms | Public: false
-- Then add these policies in the Storage → Policies tab:

-- SELECT: authenticated users can download
-- INSERT: authenticated users can upload to their own folder
-- DELETE: owner can delete

-- (Storage policies can't be set via SQL; use the dashboard or supabase CLI)
