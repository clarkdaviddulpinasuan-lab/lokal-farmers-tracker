-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — RESET DEMO: members + ops data + auth NULL-token fix
-- Paste into Supabase SQL Editor, run once (choose "Run and enable RLS").
--
-- 1) Fixes auth.users token columns that cause
--    "500 Database error querying schema" on sign-in.
-- 2) Deletes the 3 demo members and demo operational data
--    (deliveries, batches, sales, orders, settlements, returns, …).
-- 3) Keeps hubs, products, farmers, preorders (reference data).
-- 4) Reinstalls needs_setup / create_first_admin with empty-string tokens.
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. GoTrue must see '' not NULL on token columns ─────────────────────────
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null;

update auth.users
set phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, '')
where phone_change is null
   or phone_change_token is null;

-- ── 2. Demo operational data (keep hubs / products / farmers / preorders) ───
delete from public.return_items;
delete from public.return_requests;
delete from public.return_records;
delete from public.notifications;
delete from public.audit_logs;
delete from public.farmer_allocations;
delete from public.sales;
delete from public.settlements;
delete from public.order_items;
delete from public.orders;
delete from public.batches;
delete from public.deliveries;
delete from public.delivery_groups;

-- ── 3. Demo members (identities → profiles → users) ─────────────────────────
delete from auth.identities
where user_id in (
  select id from auth.users
  where lower(email) in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
);

delete from public.profiles
where lower(email) in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
   or id in (
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'c0000000-0000-4000-8000-000000000002'::uuid,
     'c0000000-0000-4000-8000-000000000003'::uuid
   );

delete from auth.users
where lower(email) in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
   or id in (
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'c0000000-0000-4000-8000-000000000002'::uuid,
     'c0000000-0000-4000-8000-000000000003'::uuid
   );

-- ── 4. Remaining auth.users NULLs (any half-created Admin) ──────────────────
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb)
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null
   or email_confirmed_at is null
   or raw_app_meta_data is null;

-- Ensure email identity exists for every remaining auth user with a password
insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'provider', 'email', 'providers', array['email']::text[]),
  'email', u.id::text, now(), now(), now()
from auth.users u
where u.email is not null
  and u.encrypted_password is not null
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- ── 5. Counters (ops wiped; keep farmers F) ─────────────────────────────────
insert into public.code_counters (prefix, next_value) values
  ('DLV', 0), ('GRP', 0), ('ORD', 0), ('SL', 0), ('RET', 0),
  ('ST', 0), ('MB', 0), ('KL', 0), ('RTN', 0), ('F', 127)
on conflict (prefix) do update set
  next_value = case
    when public.code_counters.prefix = 'F'
      then greatest(public.code_counters.next_value, 127)
    else 0
  end;

-- ── 6. Bootstrap RPCs (empty-string tokens) ─────────────────────────────────
create or replace function public.needs_setup()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select not exists (select 1 from public.profiles limit 1)
$fn$;

revoke all on function public.needs_setup() from public, anon, authenticated;
grant execute on function public.needs_setup() to anon, authenticated;

create or replace function public.create_first_admin(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_id uuid;
begin
  if exists (select 1 from public.profiles limit 1) then
    raise exception 'Setup already complete. Sign in and add members from the Members page.';
  end if;

  if btrim(coalesce(p_email, '')) = '' or btrim(coalesce(p_first_name, '')) = '' or btrim(coalesce(p_last_name, '')) = '' then
    raise exception 'Name and email are required.';
  end if;
  if coalesce(p_password, '') !~ '^(.{8,})$' then
    raise exception 'Password must be at least 8 characters.';
  end if;
  if exists (
    select 1 from auth.users u where lower(u.email) = lower(btrim(p_email))
  ) then
    raise exception 'A member with this email already exists.';
  end if;

  v_id := gen_random_uuid();

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
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    btrim(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    null, '',
    '', now(),
    '', '', '', '',
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'first_name', btrim(p_first_name),
      'last_name', btrim(p_last_name),
      'role', 'Admin',
      'hub_id', null
    ),
    false, now(), now(),
    null, null, '', '', null,
    0, null, null, null,
    false, false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_id,
    jsonb_build_object(
      'sub', v_id::text,
      'email', btrim(p_email),
      'email_verified', true,
      'provider', 'email',
      'providers', array['email']::text[]
    ),
    'email',
    v_id::text,
    now(), now(), now()
  );

  if not exists (select 1 from public.profiles where id = v_id) then
    insert into public.profiles (id, member_code, first_name, last_name, email, role, hub_id, status)
    values (
      v_id,
      public.next_code('MB', 3),
      btrim(p_first_name),
      btrim(p_last_name),
      btrim(p_email),
      'Admin',
      null,
      'Active'
    );
  end if;

  return jsonb_build_object('id', v_id);
end
$fn$;

revoke all on function public.create_first_admin(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_first_admin(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification
select
  (select count(*) from public.profiles) as profiles,
  (select count(*) from auth.users) as auth_users,
  (select count(*) from auth.users where confirmation_token is null) as null_confirmation_tokens,
  (select count(*) from public.delivery_groups) as delivery_groups,
  (select count(*) from public.farmers) as farmers,
  public.needs_setup() as needs_setup;
