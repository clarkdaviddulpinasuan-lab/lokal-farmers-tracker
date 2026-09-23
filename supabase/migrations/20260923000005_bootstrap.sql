-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — 000005_bootstrap.sql
-- First-admin bootstrap: no pre-seeded members. Login page can create the
-- first Admin account only while public.profiles is empty.
-- ═══════════════════════════════════════════════════════════════════════════

-- True when no member profiles exist (anon-safe setup probe).
create or replace function public.needs_setup()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (select 1 from public.profiles limit 1)
$$;

revoke all on function public.needs_setup() from public, anon, authenticated;
grant execute on function public.needs_setup() to anon, authenticated;

-- Create the first Admin. Allowed only while there are no profiles.
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
as $$
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

  insert into public.code_counters (prefix, next_value) values ('MB', 1)
  on conflict (prefix) do update set next_value = greatest(public.code_counters.next_value, 1);

  return jsonb_build_object('id', v_id);
end
$$;

revoke all on function public.create_first_admin(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_first_admin(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
