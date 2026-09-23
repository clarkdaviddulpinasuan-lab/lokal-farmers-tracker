-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — AUTH REPAIR (paste into Supabase SQL Editor, run once)
-- Fixes: "Database error querying schema" / "Database error finding user"
-- on login, OTP, and signup for seeded test users.
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Drop custom triggers that can break GoTrue user lookups ─────────────
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_sync_email on public.profiles;
drop function if exists public.handle_new_user();
drop function if exists public.sync_profile_email();

-- ── 2. Rebuild seeded auth users (clean rows + confirmed email) ────────────
delete from auth.identities
where user_id in (
  select id from auth.users
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
);

delete from public.profiles
where id in (
  select id from auth.users
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
)
or email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com');

delete from auth.users
where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com');

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
  x.id,
  'authenticated',
  'authenticated',
  x.email,
  extensions.crypt('lokal123', extensions.gen_salt('bf')),
  now(),
  null, null, null,
  null, null,
  null, null, null, null,
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  x.meta,
  false, now(), now(),
  null, null, null, null, null,
  0, null, null, null,
  false, false
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'admin@example.com',
    '{"first_name": "Admin", "last_name": "User", "role": "Admin", "hub_id": null}'::jsonb),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'staffa@example.com',
    '{"first_name": "Clark", "last_name": "Suan", "role": "Staff A", "hub_id": "hub-a"}'::jsonb),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'staffb@example.com',
    '{"first_name": "Maria", "last_name": "Lopez", "role": "Staff B", "hub_id": "hub-b"}'::jsonb)
) as x(id, email, meta);

-- ── 3. Identities (provider_id must match identity_data.sub for GoTrue) ───
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
where u.email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- ── 4. Profiles (no auth trigger — insert directly) ────────────────────────
insert into public.profiles (id, member_code, first_name, last_name, email, role, hub_id, status, created_at, updated_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'MB-001', 'Admin', 'User', 'admin@example.com', 'Admin', null, 'Active', now(), now()),
  ('c0000000-0000-4000-8000-000000000002', 'MB-002', 'Clark', 'Suan', 'staffa@example.com', 'Staff A', 'hub-a', 'Active', now(), now()),
  ('c0000000-0000-4000-8000-000000000003', 'MB-003', 'Maria', 'Lopez', 'staffb@example.com', 'Staff B', 'hub-b', 'Active', now(), now())
on conflict (id) do nothing;

-- ── 5. Member code counter past seeded profiles ────────────────────────────
insert into public.code_counters (prefix, next_value) values ('MB', 3)
on conflict (prefix) do update set next_value = greatest(public.code_counters.next_value, 3);

-- ── 6. Lightweight profile creation on signup (no member_code side effects
--      that can fail the whole auth transaction) ────────────────────────────
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
  -- Never block GoTrue auth if profile insert fails.
  raise warning 'handle_new_user failed: %', SQLERRM;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Restore profile → auth.users email sync (dropped in step 1)
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

-- ── 7. Reload PostgREST schema cache ───────────────────────────────────────
notify pgrst, 'reload schema';

commit;

-- Quick check
select u.email, u.email_confirmed_at is not null as confirmed,
       (u.encrypted_password is not null and length(u.encrypted_password) > 0) as has_pw,
       (select count(*) from auth.identities i where i.user_id = u.id) as identities,
       (select count(*) from public.profiles p where p.id = u.id) as profile
from auth.users u
where u.email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
order by u.email;
