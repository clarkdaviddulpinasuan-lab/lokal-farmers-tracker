-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — 000004_seed_test_data.sql
-- TEST DATA ONLY — mirrors the original demo seed so the UI has content
-- after first login. Safe to re-run only on an empty database.
-- Test logins (password: lokal123):
--   admin@example.com  · Admin
--   staffa@example.com · Staff A (Hub A)
--   staffb@example.com · Staff B (Hub B)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Code counters (set to existing max so the next generated code is max+1) ─

insert into public.code_counters (prefix, next_value) values
  ('DLV', 140),
  ('GRP', 4),
  ('ORD', 1),
  ('SL', 281),
  ('RET', 1),
  ('ST', 184),
  ('F', 127),
  ('MB', 3),
  ('KL', 492),
  ('RTN', 0)
on conflict (prefix) do nothing;

-- ── Hubs ────────────────────────────────────────────────────────────────────

insert into public.hubs (id, hub_code, name, municipality, status, created_at) values
  ('hub-a', 'HB-001', 'Hub A', 'General Luna', 'Active', now() - interval '300 days'),
  ('hub-b', 'HB-002', 'Hub B', 'Santa Cruz', 'Active', now() - interval '300 days')
on conflict (id) do nothing;

-- ── Products ────────────────────────────────────────────────────────────────

insert into public.products (id, name, category, default_unit, emoji, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'Tomatoes', 'Vegetables', 'kg', '🍅', now() - interval '300 days'),
  ('a0000000-0000-4000-8000-000000000002', 'Eggplant', 'Vegetables', 'kg', '🍆', now() - interval '300 days'),
  ('a0000000-0000-4000-8000-000000000003', 'Banana', 'Fruits', 'kg', '🍌', now() - interval '300 days'),
  ('a0000000-0000-4000-8000-000000000004', 'Coconut', 'Fruits', 'pc', '🥥', now() - interval '300 days'),
  ('a0000000-0000-4000-8000-000000000005', 'Squash', 'Vegetables', 'kg', '🎃', now() - interval '300 days'),
  ('a0000000-0000-4000-8000-000000000006', 'Cassava', 'Root crops', 'kg', '🥔', now() - interval '300 days'),
  ('a0000000-0000-4000-8000-000000000007', 'Sweet Potato', 'Root crops', 'kg', '🍠', now() - interval '300 days')
on conflict (id) do nothing;

-- ── Farmers ─────────────────────────────────────────────────────────────────

insert into public.farmers (id, farmer_code, first_name, last_name, age, gender, address, barangay, municipality, phone, status, notes, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'F-00127', 'Juan', 'Dela Cruz', 47, 'Male', 'Purok 3', 'San Isidro', 'General Luna', '0917 555 0127', 'Active', 'Pioneer tomato grower in the area.', now() - interval '240 days'),
  ('b0000000-0000-4000-8000-000000000002', 'F-00118', 'Maria', 'Santos', 39, 'Female', 'Purok 1', 'San Roque', 'General Luna', '0918 555 0118', 'Active', null, now() - interval '210 days'),
  ('b0000000-0000-4000-8000-000000000003', 'F-00094', 'Pedro', 'Flores', 52, 'Male', 'Sitio Magsaysay', 'Baclaran', 'General Luna', '0920 555 0094', 'Active', null, now() - interval '190 days'),
  ('b0000000-0000-4000-8000-000000000004', 'F-00076', 'Ana', 'Ramirez', 35, 'Female', 'Purok 5', 'San Antonio', 'General Luna', '0916 555 0076', 'Active', null, now() - interval '160 days'),
  ('b0000000-0000-4000-8000-000000000005', 'F-00063', 'Ramon', 'Villanueva', 58, 'Male', 'Sitio Igang', 'Baclaran', 'General Luna', '0919 555 0063', 'Active', null, now() - interval '140 days'),
  ('b0000000-0000-4000-8000-000000000006', 'F-00058', 'Liza', 'Navarro', 31, 'Female', 'Purok 2', 'San Roque', 'General Luna', '0921 555 0058', 'Active', null, now() - interval '120 days'),
  ('b0000000-0000-4000-8000-000000000007', 'F-00041', 'Carlos', 'Mendoza', 44, 'Male', 'Purok 6', 'San Isidro', 'General Luna', '0915 555 0041', 'Active', null, now() - interval '95 days'),
  ('b0000000-0000-4000-8000-000000000008', 'F-00032', 'Fe', 'Bagayan', 49, 'Female', 'Sitio Dinalupa', 'San Antonio', 'General Luna', '0917 555 0032', 'Active', null, now() - interval '70 days')
on conflict (id) do nothing;

-- ── Test member accounts ───────────────────────────────────────────────────
-- Never delete profiles/auth.users — delivery_groups and other tables
-- reference profile ids. Upsert / reset password in place instead.

delete from auth.identities
where user_id in (
  select id from auth.users
  where email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
);

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
) as x(id, email, meta)
where not exists (select 1 from auth.users u where u.email = x.email);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'provider', 'email',
    'providers', array['email']::text[]
  ),
  'email', u.id::text, now(), now(), now()
from auth.users u
where u.email in ('admin@example.com', 'staffa@example.com', 'staffb@example.com')
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- Profiles (auth trigger may create them; this fills any gap without member_code races)
insert into public.profiles (id, member_code, first_name, last_name, email, role, hub_id, status, created_at, updated_at)
select x.id, x.code, x.first_name, x.last_name, x.email, x.role, x.hub_id, 'Active', now(), now()
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'MB-001', 'Admin', 'User', 'admin@example.com', 'Admin', null::text),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'MB-002', 'Clark', 'Suan', 'staffa@example.com', 'Staff A', 'hub-a'),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'MB-003', 'Maria', 'Lopez', 'staffb@example.com', 'Staff B', 'hub-b')
) as x(id, code, first_name, last_name, email, role, hub_id)
where not exists (select 1 from public.profiles p where p.id = x.id)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- ── Delivery groups ─────────────────────────────────────────────────────────
-- GRP-001..003 Received · GRP-004 On the Way (Staff B can receive)

insert into public.delivery_groups (id, group_code, origin_hub_id, status, created_by, sent_by, sent_at, received_by, received_at, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'GRP-001', 'hub-a', 'Received',
    'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', now() - interval '4 days',
    'c0000000-0000-4000-8000-000000000003', now() - interval '4 days', now() - interval '5 days'),
  ('d0000000-0000-4000-8000-000000000002', 'GRP-002', 'hub-a', 'Received',
    'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', now() - interval '3 days',
    'c0000000-0000-4000-8000-000000000003', now() - interval '3 days', now() - interval '3 days'),
  ('d0000000-0000-4000-8000-000000000003', 'GRP-003', 'hub-a', 'Received',
    'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', now() - interval '1 day',
    'c0000000-0000-4000-8000-000000000003', now() - interval '1 day', now() - interval '4 days'),
  ('d0000000-0000-4000-8000-000000000004', 'GRP-004', 'hub-a', 'On the Way',
    'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', now() - interval '4 hours',
    null, null, now() - interval '12 hours')
on conflict (id) do nothing;

-- ── Deliveries ──────────────────────────────────────────────────────────────
-- d-10 stays Draft with no group (open draft demo); d-11 is in GRP-004.

insert into public.deliveries (id, delivery_code, farmer_id, group_id, delivery_date, collection_location, received_by, status, origin_hub_id, opened_by, created_at) values
  ('e0000000-0000-4000-8000-000000000001', 'DLV-00130', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', now() - interval '5 days', 'San Isidro pickup point', 'Maria Lopez', 'Received', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '5 days'),
  ('e0000000-0000-4000-8000-000000000002', 'DLV-00131', 'b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', now() - interval '4 days', 'San Roque pickup point', 'Maria Lopez', 'Received', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '4 days'),
  ('e0000000-0000-4000-8000-000000000003', 'DLV-00132', 'b0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', now() - interval '3 days', 'Baclaran pickup point', 'Joey Reyes', 'Completed', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000004', 'DLV-00133', 'b0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', now() - interval '3 days', 'San Antonio point', 'Joey Reyes', 'Completed', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000005', 'DLV-00134', 'b0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', now() - interval '4 days', 'Baclaran pickup point', 'Maria Lopez', 'Received', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '4 days'),
  ('e0000000-0000-4000-8000-000000000006', 'DLV-00135', 'b0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', now() - interval '2 days', 'San Roque pickup point', 'Maria Lopez', 'Received', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000007', 'DLV-00136', 'b0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', now() - interval '3 days', 'San Isidro pickup point', 'Joey Reyes', 'Completed', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000008', 'DLV-00137', 'b0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000003', now() - interval '2 days', 'San Antonio point', 'Maria Lopez', 'Received', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000009', 'DLV-00138', 'b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', now() - interval '1 day', 'San Roque pickup point', 'Maria Lopez', 'Received', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '1 day'),
  ('e0000000-0000-4000-8000-000000000010', 'DLV-00139', 'b0000000-0000-4000-8000-000000000006', null, now() - interval '1 day', 'San Roque pickup point', '', 'Draft', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '1 day'),
  ('e0000000-0000-4000-8000-000000000011', 'DLV-00140', 'b0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000004', now() - interval '4 hours', 'Baclaran pickup point', '', 'On the Way', 'hub-a', 'c0000000-0000-4000-8000-000000000002', now() - interval '12 hours')
on conflict (id) do nothing;

-- ── Batches ─────────────────────────────────────────────────────────────────
-- Received groups → Available / Partially Sold · On the Way → At Hub · Draft → Pending

insert into public.batches (id, batch_code, delivery_id, product_id, farmer_id, original_quantity, quantity_sold, quantity_returned, quantity_wasted, unit, quality_grade, farmer_price, lab_fee, market_price, status, received_at) values
  ('f0000000-0000-4000-8000-000000000001', 'KL-20260916-00481', 'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 24.5, 22.5, 0, 0, 'kg', 'Grade A', 80, 20, 100, 'Partially Sold', now() - interval '5 days'),
  ('f0000000-0000-4000-8000-000000000002', 'KL-20260917-00482', 'e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 38, 11, 0, 0, 'kg', 'Grade A', 70, 10, 95, 'Partially Sold', now() - interval '4 days'),
  ('f0000000-0000-4000-8000-000000000003', 'KL-20260918-00483', 'e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 20, 10, 0, 0, 'kg', 'Grade B', 90, 10, 100, 'Partially Sold', now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000004', 'KL-20260918-00484', 'e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 31, 0, 0, 0, 'pc', 'Grade A', 45, 5, 60, 'Available', now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000005', 'KL-20260917-00485', 'e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 40, 12, 0, 0, 'kg', 'Grade A', 40, 8, 60, 'Partially Sold', now() - interval '4 days'),
  ('f0000000-0000-4000-8000-000000000006', 'KL-20260919-00486', 'e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000006', 25, 0, 0, 0, 'kg', 'Grade B', 35, 5, 50, 'Available', now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000007', 'KL-20260918-00487', 'e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 18, 6, 0, 0, 'kg', 'Grade A', 60, 10, 85, 'Partially Sold', now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000008', 'KL-20260919-00488', 'e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000008', 30, 9, 0, 0, 'kg', 'Grade A', 85, 15, 130, 'Partially Sold', now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000009', 'KL-20260920-00489', 'e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 18, 15, 0, 0, 'kg', 'Grade A', 80, 16, 100, 'Partially Sold', now() - interval '1 day'),
  ('f0000000-0000-4000-8000-000000000010', 'KL-20260920-00490', 'e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000006', 12, 0, 0, 0, 'kg', 'Grade B', 74, 14, 96, 'Pending', now() - interval '1 day'),
  ('f0000000-0000-4000-8000-000000000011', 'KL-20260921-00491', 'e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000005', 22, 0, 0, 0, 'kg', 'Grade A', 68, 12, 92, 'At Hub', now() - interval '4 hours'),
  ('f0000000-0000-4000-8000-000000000012', 'KL-20260921-00492', 'e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 24, 0, 0, 0, 'pc', 'Grade A', 45, 5, 60, 'At Hub', now() - interval '5 hours')
on conflict (id) do nothing;

-- ── Order ORD-001 (Harana Kitchen) ──────────────────────────────────────────
-- Allocation (equal-share, capped): tomatoes 12.5 b-0481 + 2.5 b-0489 · eggplant 10 b-0483

insert into public.orders (id, order_code, buyer_name, total_revenue, payment_method, status, recorded_by, created_at) values
  ('30000000-0000-4000-8000-000000000001', 'ORD-001', 'Harana Kitchen', 2500, 'Cash', 'Confirmed', 'Maria Lopez', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, quantity, unit, unit_price, line_total) values
  ('30000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 15, 'kg', 100, 1500),
  ('30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 10, 'kg', 100, 1000)
on conflict (id) do nothing;

insert into public.farmer_allocations (id, order_item_id, batch_id, farmer_id, product_id, allocated_quantity, farmer_payout, created_at) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 12.5, 1000, now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 2.5, 200, now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 10, 900, now() - interval '2 days')
on conflict (id) do nothing;

-- ── Sales (direct + order-linked) ───────────────────────────────────────────

insert into public.sales (id, sale_code, batch_id, product_id, farmer_id, quantity, unit, unit_price, buyer_name, payment_method, payment_settled, sold_at, recorded_by, order_id) values
  ('00000000-0000-4000-8000-000000000001', 'SL-00260', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 6, 'kg', 95, 'Harana Kitchen', 'Cash', true, now() - interval '4 days', 'Maria Lopez', null),
  ('00000000-0000-4000-8000-000000000002', 'SL-00264', 'f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 12, 'kg', 60, 'Mom''s Kitchen', 'Cash', false, now() - interval '3 days', 'Joey Reyes', null),
  ('00000000-0000-4000-8000-000000000003', 'SL-00270', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 5, 'kg', 95, 'Walk-in customer', 'Cash', false, now() - interval '2 days', 'Maria Lopez', null),
  ('00000000-0000-4000-8000-000000000004', 'SL-00271', 'f0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 5, 'kg', 100, 'Bravo Restaurant', 'Cash', false, now() - interval '3 days', 'Maria Lopez', null),
  ('00000000-0000-4000-8000-000000000005', 'SL-00275', 'f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 6, 'kg', 85, 'Bravo Restaurant', 'Cash', false, now() - interval '2 days', 'Joey Reyes', null),
  ('00000000-0000-4000-8000-000000000006', 'SL-00276', 'f0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000008', 9, 'kg', 130, 'Harana Kitchen', 'Cash', false, now() - interval '1 day', 'Maria Lopez', null),
  ('00000000-0000-4000-8000-000000000007', 'SL-00280', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 10, 'kg', 100, 'Harana Kitchen', 'On credit', false, now() - interval '2 days', 'Maria Lopez', null),
  ('00000000-0000-4000-8000-000000000008', 'SL-00281', 'f0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 7.5, 'kg', 100, 'Walk-in customer', 'Cash', false, now() - interval '1 day', 'Maria Lopez', null),
  ('00000000-0000-4000-8000-000000000009', 'SL-00265', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 12.5, 'kg', 100, 'Harana Kitchen', 'Cash', false, now() - interval '2 days', 'Maria Lopez', '30000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000010', 'SL-00266', 'f0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 2.5, 'kg', 100, 'Harana Kitchen', 'Cash', false, now() - interval '2 days', 'Maria Lopez', '30000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000011', 'SL-00267', 'f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 10, 'kg', 100, 'Harana Kitchen', 'Cash', false, now() - interval '2 days', 'Maria Lopez', '30000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

-- ── Settlements ─────────────────────────────────────────────────────────────

insert into public.settlements (id, settlement_code, farmer_id, period_start, period_end, items, total_sales, adjustments, payable, status, paid_at, payment_method, created_at) values
  ('10000000-0000-4000-8000-000000000001', 'ST-00182', 'b0000000-0000-4000-8000-000000000002',
    (current_date - 7), current_date,
    '[{"saleId": "00000000-0000-4000-8000-000000000001", "batchCode": "KL-20260917-00482", "productName": "Banana", "quantity": 6, "farmerPrice": 70, "farmerAmount": 420}]'::jsonb,
    420, 0, 420, 'Paid', now(), 'Cash', now() - interval '1 day'),
  ('10000000-0000-4000-8000-000000000002', 'ST-00184', 'b0000000-0000-4000-8000-000000000005',
    (current_date - 7), current_date,
    '[{"saleId": "00000000-0000-4000-8000-000000000002", "batchCode": "KL-20260917-00485", "productName": "Squash", "quantity": 12, "farmerPrice": 40, "farmerAmount": 480}]'::jsonb,
    480, 0, 480, 'Approved', null, null, date_trunc('day', now()))
on conflict (id) do nothing;

-- ── Return request RET-001 (Pending Review) ─────────────────────────────────

insert into public.return_requests (id, return_code, order_id, return_type, reason, notes, status, requested_by, requested_by_name, created_at) values
  ('50000000-0000-4000-8000-000000000001', 'RET-001', '30000000-0000-4000-8000-000000000001', 'Normal',
    'Customer returned 2 kg tomatoes — quality issue', 'Tomatoes were slightly overripe',
    'Pending Review', 'c0000000-0000-4000-8000-000000000003', 'Maria Lopez', now() - interval '3 hours')
on conflict (id) do nothing;

insert into public.return_items (id, return_request_id, product_id, quantity, unit) values
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 2, 'kg')
on conflict (id) do nothing;

-- ── Preorders ───────────────────────────────────────────────────────────────

insert into public.preorders (id, buyer_name, requested_date, status, items) values
  ('20000000-0000-4000-8000-000000000001', 'Harana Kitchen', (current_date + 1), 'Confirmed',
    '[{"productId": "a0000000-0000-4000-8000-000000000001", "requested": 20}, {"productId": "a0000000-0000-4000-8000-000000000002", "requested": 10}]'::jsonb),
  ('20000000-0000-4000-8000-000000000002', 'Bravo Restaurant', (current_date + 1), 'Confirmed',
    '[{"productId": "a0000000-0000-4000-8000-000000000003", "requested": 15}]'::jsonb),
  ('20000000-0000-4000-8000-000000000003', 'Harana Kitchen', (current_date - 3), 'Requested',
    '[{"productId": "a0000000-0000-4000-8000-000000000001", "requested": 15}, {"productId": "a0000000-0000-4000-8000-000000000005", "requested": 8}]'::jsonb),
  ('20000000-0000-4000-8000-000000000004', 'Mom''s Kitchen', (current_date - 2), 'Requested',
    '[{"productId": "a0000000-0000-4000-8000-000000000002", "requested": 12}, {"productId": "a0000000-0000-4000-8000-000000000003", "requested": 10}]'::jsonb),
  ('20000000-0000-4000-8000-000000000005', 'Casa del Sol', (current_date - 1), 'Requested',
    '[{"productId": "a0000000-0000-4000-8000-000000000004", "requested": 18}]'::jsonb)
on conflict (id) do nothing;

-- ── Notifications ───────────────────────────────────────────────────────────

insert into public.notifications (id, type, title, message, target_member_id, related_entity_type, related_entity_id, read, created_at) values
  ('60000000-0000-4000-8000-000000000001', 'delivery_received', 'Delivery received', 'Delivery group GRP-001 has been received at Hub B', 'c0000000-0000-4000-8000-000000000002', 'DeliveryGroup', 'd0000000-0000-4000-8000-000000000001', true, now() - interval '4 days'),
  ('60000000-0000-4000-8000-000000000002', 'order_confirmed', 'Order created', 'Order ORD-001 created by Maria Lopez', 'c0000000-0000-4000-8000-000000000002', 'Order', '30000000-0000-4000-8000-000000000001', true, now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000003', 'return_request', 'Return request', 'Return request RET-001 submitted for order ORD-001', 'c0000000-0000-4000-8000-000000000002', 'ReturnRequest', '50000000-0000-4000-8000-000000000001', false, now() - interval '3 hours')
on conflict (id) do nothing;

-- ── Audit log ───────────────────────────────────────────────────────────────

insert into public.audit_logs (id, action, entity_type, entity_id, detail, by_name, created_at) values
  ('70000000-0000-4000-8000-000000000001', 'Delivery created', 'Delivery', 'e0000000-0000-4000-8000-000000000001', '24.5 kg tomatoes from Juan Dela Cruz', 'Clark Suan', now() - interval '5 days'),
  ('70000000-0000-4000-8000-000000000002', 'Price confirmed', 'Batch', 'f0000000-0000-4000-8000-000000000001', 'Farmer ₱80 / LokalLab ₱20 / Market ₱100 per kg', 'Clark Suan', now() - interval '5 days'),
  ('70000000-0000-4000-8000-000000000003', 'Transferred to Hub B', 'Batch', 'f0000000-0000-4000-8000-000000000001', 'KL-20260916-00481', 'Clark Suan', now() - interval '4 days'),
  ('70000000-0000-4000-8000-000000000004', 'Sale recorded', 'Sale', '00000000-0000-4000-8000-000000000004', '5 kg sold to Bravo Restaurant', 'Maria Lopez', now() - interval '3 days'),
  ('70000000-0000-4000-8000-000000000005', 'Sale recorded', 'Sale', '00000000-0000-4000-8000-000000000007', '10 kg sold to Harana Kitchen', 'Maria Lopez', now() - interval '2 days'),
  ('70000000-0000-4000-8000-000000000006', 'Sale recorded', 'Sale', '00000000-0000-4000-8000-000000000008', '7.5 kg sold to Walk-in customer', 'Maria Lopez', now() - interval '1 day'),
  ('70000000-0000-4000-8000-000000000007', 'Settlement paid', 'Settlement', '10000000-0000-4000-8000-000000000001', 'ST-00182 marked as paid', 'Admin User', now())
on conflict (id) do nothing;
