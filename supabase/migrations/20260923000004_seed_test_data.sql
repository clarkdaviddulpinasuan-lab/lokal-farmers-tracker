-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — 000004_seed_test_data.sql
-- Reference data only: hubs, products, farmers, preorders, code counters.
-- No member accounts — create the first Admin on the login page
-- (needs_setup / create_first_admin). Safe to re-run (on conflict do nothing).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Code counters ───────────────────────────────────────────────────────────

insert into public.code_counters (prefix, next_value) values
  ('DLV', 0),
  ('GRP', 0),
  ('ORD', 0),
  ('SL', 0),
  ('RET', 0),
  ('ST', 0),
  ('F', 127),
  ('MB', 0),
  ('KL', 0),
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

notify pgrst, 'reload schema';
