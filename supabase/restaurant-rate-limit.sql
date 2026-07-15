-- Restaurant registration rate limit and ownership enforcement
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.restaurants
  add column if not exists owner_id uuid,
  add column if not exists owner_email text;

alter table public.restaurants
  alter column is_approved set default false;

create or replace function public.get_restaurant_registration_usage(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_is_admin boolean := exists (
    select 1 from public.admin_users au where au.user_id = p_user_id
  );
  v_today_start timestamptz := date_trunc('day', now());
  v_registrations_today integer := 0;
  v_pending_count integer := 0;
  v_last_created_at timestamptz;
  v_cooldown_remaining integer := 0;
  v_daily_limit integer := 3;
  v_can_register boolean := true;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'registrations_today', 0,
      'daily_limit', v_daily_limit,
      'remaining_today', v_daily_limit,
      'pending_count', 0,
      'cooldown_remaining_seconds', 0,
      'can_register', false,
      'is_admin', false
    );
  end if;

  if v_is_admin then
    return jsonb_build_object(
      'registrations_today', 0,
      'daily_limit', v_daily_limit,
      'remaining_today', v_daily_limit,
      'pending_count', 0,
      'cooldown_remaining_seconds', 0,
      'can_register', true,
      'is_admin', true
    );
  end if;

  select count(*), max(created_at)
    into v_registrations_today, v_last_created_at
  from public.restaurants
  where owner_id = p_user_id
    and created_at >= v_today_start;

  select count(*)
    into v_pending_count
  from public.restaurants
  where owner_id = p_user_id
    and is_approved = false;

  if v_last_created_at is not null then
    v_cooldown_remaining := greatest(0, 60 - extract(epoch from (now() - v_last_created_at))::int);
  end if;

  if v_registrations_today >= v_daily_limit then
    v_can_register := false;
  elsif v_cooldown_remaining > 0 then
    v_can_register := false;
  elsif v_pending_count >= 10 then
    v_can_register := false;
  end if;

  return jsonb_build_object(
    'registrations_today', coalesce(v_registrations_today, 0),
    'daily_limit', v_daily_limit,
    'remaining_today', greatest(0, v_daily_limit - coalesce(v_registrations_today, 0)),
    'pending_count', coalesce(v_pending_count, 0),
    'cooldown_remaining_seconds', coalesce(v_cooldown_remaining, 0),
    'can_register', v_can_register,
    'is_admin', false
  );
end;
$$;

create or replace function public.enforce_restaurant_registration_limits()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := exists (
    select 1 from public.admin_users au where au.user_id = v_user_id
  );
  v_registrations_today integer := 0;
  v_pending_count integer := 0;
  v_last_created_at timestamptz;
  v_daily_limit integer := 3;
  v_cooldown_remaining integer := 0;
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  if new.owner_id is null then
    raise exception 'OWNER_ID_MISMATCH';
  end if;

  if new.owner_id <> v_user_id then
    raise exception 'OWNER_ID_MISMATCH';
  end if;

  if v_is_admin then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(format('restaurant_registration:%s', v_user_id::text)));

  select count(*), max(created_at)
    into v_registrations_today, v_last_created_at
  from public.restaurants
  where owner_id = v_user_id
    and created_at >= date_trunc('day', now());

  select count(*)
    into v_pending_count
  from public.restaurants
  where owner_id = v_user_id
    and is_approved = false;

  if v_last_created_at is not null then
    v_cooldown_remaining := greatest(0, 60 - extract(epoch from (now() - v_last_created_at))::int);
  end if;

  if v_registrations_today >= v_daily_limit then
    raise exception 'DAILY_LIMIT_REACHED';
  end if;

  if v_cooldown_remaining > 0 then
    raise exception 'COOLDOWN_ACTIVE';
  end if;

  if v_pending_count >= 10 then
    raise exception 'PENDING_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_restaurant_registration_limits on public.restaurants;
create trigger trg_enforce_restaurant_registration_limits
before insert on public.restaurants
for each row execute function public.enforce_restaurant_registration_limits();

alter table public.restaurants enable row level security;

drop policy if exists "Public read approved" on public.restaurants;
create policy "Public read approved" on public.restaurants
for select using (is_approved = true);

drop policy if exists "Admin read all" on public.restaurants;
create policy "Admin read all" on public.restaurants
for select using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

drop policy if exists "Owner read own pending" on public.restaurants;
create policy "Owner read own pending" on public.restaurants
for select using (owner_id = auth.uid());

drop policy if exists "Insert own restaurant" on public.restaurants;
create policy "Insert own restaurant" on public.restaurants
for insert with check (owner_id = auth.uid() and owner_id is not null);

drop policy if exists "Update own restaurant" on public.restaurants;
create policy "Update own restaurant" on public.restaurants
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Delete own restaurant" on public.restaurants;
create policy "Delete own restaurant" on public.restaurants
for delete using (owner_id = auth.uid());
