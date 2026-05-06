-- ============================================================
-- MCAT Prep Planner — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query > Run)
-- ============================================================

-- 1. Profiles (extended with exam date + onboarding flag + per-user settings)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  exam_date date default null,
  onboarding_complete boolean default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Days (one JSONB blob per user, keyed by YYYY-MM-DD)
--    Shape: { "2026-05-15": { "blocks": [...], "todos": [...] }, ... }
create table if not exists mcat_days (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. Templates (daily + weekly templates the user can apply)
--    Shape: { "daily": [...], "weekly": [...] }
create table if not exists mcat_templates (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb not null default '{"daily":[],"weekly":[]}'::jsonb,
  updated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — users can only access their own data
-- ============================================================

alter table profiles enable row level security;
alter table mcat_days enable row level security;
alter table mcat_templates enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Days
drop policy if exists "Users can manage own days" on mcat_days;
create policy "Users can manage own days"
  on mcat_days for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Templates
drop policy if exists "Users can manage own templates" on mcat_templates;
create policy "Users can manage own templates"
  on mcat_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile row on signup
-- ============================================================

create or replace function public.handle_new_mcat_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_mcat on auth.users;
create trigger on_auth_user_created_mcat
  after insert on auth.users
  for each row execute function public.handle_new_mcat_user();
