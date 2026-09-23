-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — REMOVE DEMO MEMBERS + INSTALL BOOTSTRAP
-- Paste into Supabase SQL Editor, run once.
--
-- Deletes the 3 seeded test members (and demo rows that reference them),
-- resets the MB counter, and installs needs_setup() / create_first_admin().
-- After this, open the app and create your own Admin account on the login page.
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

with demo_profiles as (
  select id from public.profiles
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
), demo_batches as (
  select id from public.batches
  where batch_code like 'KL-2026%'
)
delete from public.return_items
where return_request_id in (
  select id from public.return_requests where requested_by in (select id from demo_profiles)
);

with demo_profiles as (
  select id from public.profiles
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
delete from public.return_requests
where requested_by in (select id from demo_profiles);

with demo_profiles as (
  select id from public.profiles
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
delete from public.notifications
where target_member_id in (select id from demo_profiles);

delete from public.farmer_allocations
where batch_id in (select id from public.batches where batch_code like 'KL-2026%');

delete from public.sales
where batch_id in (select id from public.batches where batch_code like 'KL-2026%');

delete from public.return_records
where batch_id in (select id from public.batches where batch_code like 'KL-2026%');

delete from public.batches
where batch_code like 'KL-2026%';

with demo_profiles as (
  select id from public.profiles
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
update public.deliveries
set opened_by = null
where opened_by in (select id from demo_profiles);

with demo_profiles as (
  select id from public.profiles
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
delete from public.delivery_groups
where created_by in (select id from demo_profiles);

delete from public.deliveries
where group_id is null
  and (opened_by is null or opened_by not in (select id from public.profiles));

delete from public.order_items
where order_id in (select id from public.orders where order_code = 'ORD-001')
  and not exists (select 1 from public.farmer_allocations);

delete from public.orders
where order_code = 'ORD-001'
  and not exists (
    select 1 from public.farmer_allocations fa
    join public.order_items oi on oi.id = fa.order_item_id
    where oi.order_id = orders.id
  );

delete from public.audit_logs
where entity_type in ('Delivery', 'Batch', 'Sale', 'Settlement')
   or by_name in ('Admin User', 'Clark Suan', 'Maria Lopez');

with demo_users as (
  select id from auth.users
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
delete from auth.identities where user_id in (select id from demo_users);

with demo_profiles as (
  select id from public.profiles
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
delete from public.profiles where id in (select id from demo_profiles);

with demo_users as (
  select id from auth.users
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
     or id in (
       'c0000000-0000-4000-8000-000000000001'::uuid,
       'c0000000-0000-4000-8000-000000000002'::uuid,
       'c0000000-0000-4000-8000-000000000003'::uuid
     )
)
delete from auth.users where id in (select id from demo_users);

insert into public.code_counters (prefix, next_value) values ('MB', 0)
on conflict (prefix) do update set next_value = 0;

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
    null, null, null,
    null, null,
    null, null, null, null,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'first_name', btrim(p_first_name),
      'last_name', btrim(p_last_name),
      'role', 'Admin',
      'hub_id', null
    ),
    false, now(), now(),
    null, null, null, null, null,
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

select
  (select count(*) from public.profiles) as profiles,
  (select count(*) from auth.users where email like '%@example.com') as demo_auth_users,
  public.needs_setup() as needs_setup;
