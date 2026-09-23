-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — AUTH REPAIR (paste into Supabase SQL Editor, run once)
-- Fixes: "Database error querying schema" / "Database error finding user"
-- on login, OTP, and signup for seeded test users.
--
-- Does NOT delete profiles or auth.users (they are referenced by
-- delivery_groups and other app tables). Rebuilds identities and resets
-- passwords in place. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Drop custom triggers that can break GoTrue user lookups ─────────────
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_sync_email on public.profiles;
drop function if exists public.handle_new_user();
drop function if exists public.sync_profile_email();

-- ── 2. Seeded user definitions ─────────────────────────────────────────────
create temp table _seed_users (
  id uuid primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  role text not null,
  hub_id text null,
  member_code text unique not null
) on commit drop;

insert into _seed_users values
  ('c0000000-0000-4000-8000-000000000001', 'admin@example.com', 'Admin', 'User', 'Admin', null, 'MB-001'),
  ('c0000000-0000-4000-8000-000000000002', 'staffa@example.com', 'Clark', 'Suan', 'Staff A', 'hub-a', 'MB-002'),
  ('c0000000-0000-4000-8000-000000000003', 'staffb@example.com', 'Maria', 'Lopez', 'Staff B', 'hub-b', 'MB-003');

-- ── 3. Upsert auth.users in place (keep id so FKs stay valid) ──────────────
-- Align profile id to auth id when a user already exists under a different id.
update public.profiles p
set id = u.id
from auth.users u
where p.email = u.email
  and p.id <> u.id
  and u.email in (select email from _seed_users)
  and not exists (select 1 from public.profiles x where x.id = u.id);

-- Match auth.users.id to profile id when profile exists but auth row is missing/different.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  invited_at, confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at,
  email_change_token_new, email_change_token_current, email_change, email_change_sent_at,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
  email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at,
  is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000',
  s.id,
  'authenticated',
  'authenticated',
  s.email,
  extensions.crypt('lokal123', extensions.gen_salt('bf')),
  now(),
  null, null, null,
  null, null,
  null, null, null, null,
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'role', s.role,
    'hub_id', s.hub_id
  ),
  false, now(), now(),
  null, null, null, null, null,
  0, null, null, null,
  false, false
from _seed_users s
where not exists (
  select 1 from auth.users u where u.id = s.id or u.email = s.email
);

-- If auth row exists under another id for the same email, do not delete it here
-- (FKs). Instead reset password / confirmation on that row and point profile id
-- to it (done above when possible).
update auth.users u
set
  email = s.email,
  encrypted_password = extensions.crypt('lokal123', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  confirmation_token = null,
  confirmation_sent_at = null,
  recovery_token = null,
  banned_until = null,
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb) || '{"provider": "email", "providers": ["email"]}'::jsonb,
  raw_user_meta_data = jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'role', s.role,
    'hub_id', s.hub_id
  ),
  updated_at = now()
from _seed_users s
where (u.id = s.id or u.email = s.email);

-- If profile still points at a different id than its auth user, fix profile.id
-- only when that auth user exists and has no other profile row.
update public.profiles p
set id = u.id
from auth.users u
join _seed_users s on s.email = u.email
where p.email = s.email
  and p.id <> u.id
  and not exists (select 1 from public.profiles x where x.id = u.id);

-- ── 4. Rebuild email identities for seeded users ───────────────────────────
delete from auth.identities i
using auth.users u
where i.user_id = u.id
  and u.email in (select email from _seed_users);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'provider', 'email',
    'providers', array['email']::text[]
  ),
  'email',
  u.id::text,
  now(), now(), now()
from auth.users u
where u.email in (select email from _seed_users);

-- ── 5. Profiles (upsert only — never delete) ───────────────────────────────
insert into public.profiles (id, member_code, first_name, last_name, email, role, hub_id, status, created_at, updated_at)
select s.id, s.member_code, s.first_name, s.last_name, s.email, s.role, s.hub_id, 'Active', now(), now()
from _seed_users s
where exists (select 1 from auth.users u where u.id = s.id)
   or exists (select 1 from auth.users u where u.email = s.email)
on conflict (id) do update set
  member_code = excluded.member_code,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  role = excluded.role,
  hub_id = excluded.hub_id,
  status = 'Active';

-- ── 6. Member code counter past seeded profiles ────────────────────────────
insert into public.code_counters (prefix, next_value) values ('MB', 3)
on conflict (prefix) do update set next_value = greatest(public.code_counters.next_value, 3);

-- ── 7. Lightweight profile creation on signup ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'Staff B');
  v_hub text := new.raw_user_meta_data ->> 'hub_id';
  v_code text;
begin
  if v_role not in ('Admin', 'Staff A', 'Staff B') then
    v_role := 'Staff B';
  end if;
  if v_role = 'Admin' then
    v_hub := null;
  end if;
  if v_role in ('Staff A', 'Staff B') and (v_hub is null or v_hub = '') then
    v_hub := 'hub-a';
  end if;
  if not exists (select 1 from public.hubs where id = v_hub) then
    select id into v_hub from public.hubs order by id limit 1;
  end if;

  v_code := public.next_code('MB', 3);

  insert into public.profiles (id, member_code, first_name, last_name, email, role, hub_id, status)
  values (
    new.id,
    v_code,
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'Member'),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), ''),
    coalesce(new.email, ''),
    v_role,
    v_hub,
    'Active'
  )
  on conflict (id) do nothing;

  return new;
exception when others then
  raise warning 'handle_new_user failed: %', SQLERRM;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update auth.users set email = new.email, updated_at = now() where id = new.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_sync_email on public.profiles;
create trigger profiles_sync_email
  before update on public.profiles
  for each row execute function public.sync_profile_email();

-- ── 8. Reload PostgREST schema cache ───────────────────────────────────────
notify pgrst, 'reload schema';

commit;

-- Quick check
select u.email,
       u.email_confirmed_at is not null as confirmed,
       (u.encrypted_password is not null and length(u.encrypted_password) > 0) as has_pw,
       (select count(*) from auth.identities i where i.user_id = u.id) as identities,
       (select count(*) from public.profiles p where p.id = u.id) as profile
from auth.users u
where u.email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
order by u.email;
