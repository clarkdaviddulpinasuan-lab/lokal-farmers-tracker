-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — FULL SUPABASE SETUP (run once in SQL Editor)
-- Concat of migrations 000001-000005. Re-run uses drop/if-exists patterns.
-- Never deletes public.profiles / auth.users (FK: delivery_groups etc).
-- Create first Admin on the login page (needs_setup / create_first_admin).
-- auth.users token columns use '' (empty string) so password grant works.
-- ═══════════════════════════════════════════════════════════════════════════
-- ────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — 000001_init_schema.sql
-- Schema, constraints, triggers, and Row Level Security.
-- Roles: Admin · Staff A (Hub A) · Staff B (Hub B)
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── Clean partial re-runs ───────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'audit_logs', 'notifications', 'preorders', 'settlements', 'return_items',
    'return_requests', 'return_records', 'sales', 'farmer_allocations',
    'order_items', 'orders', 'batches', 'deliveries', 'delivery_groups',
    'products', 'farmers', 'profiles', 'hubs', 'code_counters'
  ] loop
    execute format('drop table if exists public.%I cascade', t);
  end loop;
end
$$;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.hubs (
  id text primary key,
  hub_code text not null unique,
  name text not null,
  municipality text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  member_code text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null,
  role text not null check (role in ('Admin', 'Staff A', 'Staff B')),
  hub_id text references public.hubs (id),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farmers (
  id uuid primary key default gen_random_uuid(),
  farmer_code text not null unique,
  first_name text not null,
  last_name text not null,
  age int not null default 0 check (age >= 0),
  gender text not null default '',
  address text not null default '',
  barangay text not null default '',
  municipality text not null default '',
  phone text not null default '',
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  default_unit text not null default 'kg',
  emoji text not null default '📦',
  created_at timestamptz not null default now()
);

create unique index products_name_lower_idx on public.products (lower(name));

create table public.delivery_groups (
  id uuid primary key default gen_random_uuid(),
  group_code text not null unique,
  origin_hub_id text not null references public.hubs (id),
  status text not null default 'Pending' check (status in ('Pending', 'On the Way', 'Received')),
  created_by uuid not null references public.profiles (id),
  sent_by uuid references public.profiles (id),
  sent_at timestamptz,
  received_by uuid references public.profiles (id),
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_code text not null unique,
  farmer_id uuid not null references public.farmers (id),
  group_id uuid references public.delivery_groups (id) on delete cascade,
  delivery_date timestamptz not null default now(),
  collection_location text not null default '',
  received_by text not null default '',
  status text not null default 'Draft'
    check (status in ('Draft', 'On the Way', 'Received', 'Sales Recorded', 'Completed', 'Cancelled')),
  origin_hub_id text not null references public.hubs (id),
  opened_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index deliveries_group_idx on public.deliveries (group_id);
create index deliveries_farmer_idx on public.deliveries (farmer_id);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  product_id uuid not null references public.products (id),
  farmer_id uuid not null references public.farmers (id),
  original_quantity numeric not null check (original_quantity > 0),
  quantity_sold numeric not null default 0 check (quantity_sold >= 0),
  quantity_returned numeric not null default 0 check (quantity_returned >= 0),
  quantity_wasted numeric not null default 0 check (quantity_wasted >= 0),
  unit text not null default 'kg',
  quality_grade text not null default 'Grade A',
  farmer_price numeric not null default 0 check (farmer_price >= 0),
  lab_fee numeric not null default 0 check (lab_fee >= 0),
  market_price numeric not null default 0 check (market_price >= 0),
  status text not null default 'Pending',
  received_at timestamptz not null default now()
);

create index batches_delivery_idx on public.batches (delivery_id);
create index batches_product_idx on public.batches (product_id);
create index batches_farmer_idx on public.batches (farmer_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  buyer_name text not null,
  total_revenue numeric not null default 0 check (total_revenue >= 0),
  payment_method text not null check (payment_method in ('Cash', 'On credit')),
  status text not null default 'Confirmed' check (status in ('Confirmed', 'Cancelled')),
  recorded_by text not null default '',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity numeric not null check (quantity > 0),
  unit text not null default 'kg',
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric not null check (line_total >= 0)
);

create index order_items_order_idx on public.order_items (order_id);

create table public.farmer_allocations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  batch_id uuid not null references public.batches (id),
  farmer_id uuid not null references public.farmers (id),
  product_id uuid not null references public.products (id),
  allocated_quantity numeric not null check (allocated_quantity >= 0),
  farmer_payout numeric not null default 0,
  created_at timestamptz not null default now()
);

create index farmer_allocations_farmer_idx on public.farmer_allocations (farmer_id);
create index farmer_allocations_order_item_idx on public.farmer_allocations (order_item_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_code text not null unique,
  batch_id uuid not null references public.batches (id),
  product_id uuid not null references public.products (id),
  farmer_id uuid not null references public.farmers (id),
  quantity numeric not null check (quantity > 0),
  unit text not null default 'kg',
  unit_price numeric not null check (unit_price >= 0),
  buyer_name text not null default '',
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'On credit')),
  payment_settled boolean not null default false,
  sold_at timestamptz not null default now(),
  recorded_by text not null default '',
  order_id uuid references public.orders (id)
);

create index sales_batch_idx on public.sales (batch_id);
create index sales_farmer_idx on public.sales (farmer_id);
create index sales_order_idx on public.sales (order_id);

create table public.return_records (
  id uuid primary key default gen_random_uuid(),
  return_code text not null unique,
  batch_id uuid not null references public.batches (id),
  quantity numeric not null check (quantity > 0),
  unit text not null default 'kg',
  reason text not null default '',
  condition text not null default 'Good',
  returned_at timestamptz not null default now(),
  recorded_by text not null default ''
);

create index return_records_batch_idx on public.return_records (batch_id);

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  return_code text not null unique,
  order_id uuid not null references public.orders (id),
  return_type text not null check (return_type in ('Normal', 'Damaged')),
  reason text not null,
  notes text not null default '',
  status text not null default 'Pending Review'
    check (status in ('Pending Review', 'Approved', 'Rejected', 'Processed')),
  requested_by uuid not null references public.profiles (id),
  requested_by_name text not null default '',
  reviewed_by text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references public.return_requests (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity numeric not null check (quantity > 0),
  unit text not null default 'kg'
);

create index return_items_request_idx on public.return_items (return_request_id);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  settlement_code text not null unique,
  farmer_id uuid not null references public.farmers (id),
  period_start date not null,
  period_end date not null,
  items jsonb not null default '[]'::jsonb,
  total_sales numeric not null default 0,
  adjustments numeric not null default 0,
  payable numeric not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Paid', 'Cancelled')),
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz not null default now()
);

create index settlements_farmer_idx on public.settlements (farmer_id);

create table public.preorders (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  requested_date date not null,
  status text not null default 'Requested'
    check (status in ('Requested', 'Confirmed', 'Partially Fulfilled', 'Fulfilled', 'Cancelled')),
  items jsonb not null default '[]'::jsonb
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('delivery_incoming', 'delivery_received', 'return_request', 'return_approved', 'return_rejected', 'order_confirmed')),
  title text not null,
  message text not null,
  target_member_id uuid not null references public.profiles (id) on delete cascade,
  related_entity_type text not null default '',
  related_entity_id text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_target_idx on public.notifications (target_member_id, read);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  detail text not null default '',
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ── Grants (RLS gates access; grants merely permit the API to reach policies) ─

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant update on public.profiles, public.farmers, public.products, public.notifications to authenticated;
grant delete on public.notifications to authenticated;
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant update, delete on tables to authenticated;

-- ── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select * from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = any (p_roles)
      and status = 'Active'
  )
$$;

create or replace function public.require_role(p_roles text[])
returns void
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.has_role(p_roles) then
    raise exception 'You do not have permission to perform this action.';
  end if;
end
$$;

-- Atomic per-prefix code generator (GRP-001, DLV-00001, ORD-001, …)
create table public.code_counters (
  prefix text primary key,
  next_value bigint not null
);

revoke all on table public.code_counters from public, anon, authenticated;

create or replace function public.next_code(p_prefix text, p_pad int default 3)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v bigint;
begin
  insert into public.code_counters (prefix, next_value)
  values (p_prefix, 1)
  on conflict (prefix) do nothing;

  update public.code_counters
  set next_value = next_value + 1
  where prefix = p_prefix
  returning next_value into v;

  return p_prefix || '-' || lpad(v::text, greatest(p_pad, length(v::text)), '0');
end
$$;

revoke all on function public.next_code(text, int) from public, anon, authenticated;

-- Port of src/lib/store.ts recomputeBatchStatus
create or replace function public.recompute_batch_status(
  p_original numeric,
  p_sold numeric,
  p_returned numeric,
  p_wasted numeric,
  p_current text
)
returns text
language plpgsql
immutable
set search_path = public, extensions, pg_temp
as $$
declare
  v_remaining numeric := round(p_original - p_sold - p_returned - p_wasted, 2);
begin
  if v_remaining <= 0 then
    if p_returned >= p_original then
      return 'Returned';
    elsif p_returned > 0 or p_wasted > 0 then
      return 'Closed';
    end if;
    return 'Sold';
  end if;
  if p_sold > 0 then
    return 'Partially Sold';
  end if;
  return p_current;
end
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'Staff B');
  v_hub text := new.raw_user_meta_data ->> 'hub_id';
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
  if v_hub is not null and not exists (select 1 from public.hubs where id = v_hub) then
    select id into v_hub from public.hubs order by id limit 1;
  end if;

  insert into public.profiles (id, member_code, first_name, last_name, email, role, hub_id, status)
  values (
    new.id,
    public.next_code('MB', 3),
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
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep auth.users.email in sync when Admin edits a member's email.
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
end
$$;

drop trigger if exists profiles_sync_email on public.profiles;
create trigger profiles_sync_email
  before update on public.profiles
  for each row execute function public.sync_profile_email();

-- Business rules on profile changes (Admin-managed).
create or replace function public.profiles_rules()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if new.role in ('Staff A', 'Staff B') and new.hub_id is null then
    raise exception 'Staff members must be assigned to a hub.';
  end if;
  if new.role = 'Admin' then
    new.hub_id := null;
  end if;
  if tg_op = 'UPDATE'
    and new.id = auth.uid()
    and (new.role is distinct from old.role or new.status is distinct from old.status)
  then
    raise exception 'You cannot change your own role or status.';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_rules_trg on public.profiles;
create trigger profiles_rules_trg
  before insert or update on public.profiles
  for each row execute function public.profiles_rules();

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.hubs enable row level security;
alter table public.profiles enable row level security;
alter table public.farmers enable row level security;
alter table public.products enable row level security;
alter table public.delivery_groups enable row level security;
alter table public.deliveries enable row level security;
alter table public.batches enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.farmer_allocations enable row level security;
alter table public.sales enable row level security;
alter table public.return_records enable row level security;
alter table public.return_requests enable row level security;
alter table public.return_items enable row level security;
alter table public.settlements enable row level security;
alter table public.preorders enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- hubs
create policy hubs_select on public.hubs
  for select to authenticated using (true);
create policy hubs_admin_write on public.hubs
  for all to authenticated
  using (public.has_role(array['Admin']))
  with check (public.has_role(array['Admin']));

-- profiles: read own (or all if Admin); updates Admin-only; inserts happen
-- through the auth trigger / security-definer RPCs only (no insert policy).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_role(array['Admin']));
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.has_role(array['Admin']))
  with check (public.has_role(array['Admin']));

-- farmers
create policy farmers_select on public.farmers
  for select to authenticated using (true);
create policy farmers_staffa_insert on public.farmers
  for insert to authenticated
  with check (public.has_role(array['Admin', 'Staff A']));
create policy farmers_staffa_update on public.farmers
  for update to authenticated
  using (public.has_role(array['Admin', 'Staff A']))
  with check (public.has_role(array['Admin', 'Staff A']));

-- products
create policy products_select on public.products
  for select to authenticated using (true);
create policy products_staffa_insert on public.products
  for insert to authenticated
  with check (public.has_role(array['Admin', 'Staff A']));
create policy products_staffa_update on public.products
  for update to authenticated
  using (public.has_role(array['Admin', 'Staff A']))
  with check (public.has_role(array['Admin', 'Staff A']));

-- Operational tables: read for all authenticated; writes only through
-- security-definer RPCs (no insert/update policies = default deny).
create policy delivery_groups_select on public.delivery_groups
  for select to authenticated using (true);
create policy deliveries_select on public.deliveries
  for select to authenticated using (true);
create policy batches_select on public.batches
  for select to authenticated using (true);
create policy orders_select on public.orders
  for select to authenticated using (true);
create policy order_items_select on public.order_items
  for select to authenticated using (true);
create policy farmer_allocations_select on public.farmer_allocations
  for select to authenticated using (true);
create policy sales_select on public.sales
  for select to authenticated using (true);
create policy return_records_select on public.return_records
  for select to authenticated using (true);
create policy return_requests_select on public.return_requests
  for select to authenticated using (true);
create policy return_items_select on public.return_items
  for select to authenticated using (true);
create policy settlements_select on public.settlements
  for select to authenticated using (true);
create policy preorders_select on public.preorders
  for select to authenticated using (true);

-- notifications: only your own (Admin sees all)
create policy notifications_select on public.notifications
  for select to authenticated
  using (target_member_id = auth.uid() or public.has_role(array['Admin']));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (target_member_id = auth.uid())
  with check (target_member_id = auth.uid());
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (target_member_id = auth.uid());

-- audit: Admin only
create policy audit_select on public.audit_logs
  for select to authenticated
  using (public.has_role(array['Admin']));
-- ────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — 000002_rpc.sql
-- Security-definer RPCs: every multi-table write runs as one transaction with
-- server-side role checks. Clients never write operational tables directly.
-- ═══════════════════════════════════════════════════════════════════════════

-- Internal sequence helper used by next_code / batch codes.
create or replace function public.next_seq(p_prefix text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v bigint;
begin
  insert into public.code_counters (prefix, next_value)
  values (p_prefix, 1)
  on conflict (prefix) do nothing;

  update public.code_counters
  set next_value = next_value + 1
  where prefix = p_prefix
  returning next_value into v;

  return v;
end
$$;

revoke all on function public.next_seq(text) from public, anon, authenticated;

create or replace function public.next_code(p_prefix text, p_pad int default 3)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v bigint := public.next_seq(p_prefix);
begin
  return p_prefix || '-' || lpad(v::text, greatest(p_pad, length(v::text)), '0');
end
$$;

revoke all on function public.next_code(text, int) from public, anon, authenticated;

-- Internal notification writer (callable only from other definer functions).
create or replace function public.push_notification(
  p_type text,
  p_title text,
  p_message text,
  p_target uuid,
  p_entity_type text,
  p_entity_id text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.notifications (type, title, message, target_member_id, related_entity_type, related_entity_id)
  values (p_type, p_title, p_message, p_target, p_entity_type, p_entity_id);
end
$$;

revoke all on function public.push_notification(text, text, text, uuid, text, text) from public, anon, authenticated;

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_name text;
begin
  select coalesce(first_name || ' ' || last_name, 'System') into v_name
  from public.profiles where id = auth.uid();

  insert into public.audit_logs (action, entity_type, entity_id, detail, by_name)
  values (p_action, p_entity_type, p_entity_id, p_detail, coalesce(v_name, 'System'));
end
$$;

revoke all on function public.write_audit(text, text, text, text) from public, anon, authenticated;

-- Profile name of the calling user.
create or replace function public.current_member_name()
returns text
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select coalesce(first_name || ' ' || last_name, 'System')
  from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_member_name() from public, anon, authenticated;

-- All profiles for name/role display (staff can see colleagues; no write access).
create or replace function public.list_profiles()
returns setof public.profiles
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select * from public.profiles order by created_at
$$;

grant execute on function public.list_profiles() to authenticated;

-- ── Delivery flow (Staff A) ────────────────────────────────────────────────
-- Creates (or appends to) a Pending delivery group with one delivery per
-- farmer and one batch per product line. Draft → On the Way → Received.

create or replace function public.create_delivery_group(
  p_items jsonb,
  p_collection_location text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_profile public.profiles;
  v_origin text;
  v_group_id uuid;
  v_group_code text;
  v_delivery_map jsonb := '{}'::jsonb;
  v_delivery_id uuid;
  v_item jsonb;
  v_farmer public.farmers%rowtype;
  v_product public.products%rowtype;
  v_qty numeric;
  v_farmer_price numeric;
  v_lab_fee numeric;
  v_market_price numeric;
  v_unit text;
  v_grade text;
  v_batch_code text;
  v_seq bigint;
  v_name text;
begin
  perform public.require_role(array['Admin', 'Staff A']);
  select * into v_profile from public.profiles where id = auth.uid();
  v_name := v_profile.first_name || ' ' || v_profile.last_name;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product entry.';
  end if;

  v_origin := coalesce(v_profile.hub_id, 'hub-a');

  -- Append to the latest open (Pending) draft group at this hub, if any.
  select id, group_code into v_group_id, v_group_code
  from public.delivery_groups
  where origin_hub_id = v_origin and status = 'Pending'
  order by created_at desc
  limit 1;

  if v_group_id is null then
    v_group_id := gen_random_uuid();
    v_group_code := public.next_code('GRP', 3);
    insert into public.delivery_groups (id, group_code, origin_hub_id, status, created_by)
    values (v_group_id, v_group_code, v_origin, 'Pending', v_profile.id);
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_item ->> 'farmer_id' is null or v_item ->> 'farmer_id' = '' then
      raise exception 'Each farmer entry needs a farmer selected.';
    end if;
    if v_item ->> 'product_id' is null or v_item ->> 'product_id' = '' then
      raise exception 'Each product entry needs a product selected.';
    end if;

    v_qty := nullif(v_item ->> 'quantity', '')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be greater than zero for every product.';
    end if;

    select * into v_farmer from public.farmers where id = (v_item ->> 'farmer_id')::uuid and status = 'Active';
    if not found then
      raise exception 'Choose an active farmer.';
    end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found then
      raise exception 'Product not found.';
    end if;

    v_farmer_price := coalesce(nullif(v_item ->> 'farmer_price', '')::numeric, 0);
    v_lab_fee := coalesce(nullif(v_item ->> 'lab_fee', '')::numeric, 0);
    v_market_price := coalesce(nullif(v_item ->> 'market_price', '')::numeric, v_farmer_price + v_lab_fee);
    v_unit := coalesce(nullif(v_item ->> 'unit', ''), v_product.default_unit);
    v_grade := coalesce(nullif(v_item ->> 'quality_grade', ''), 'Grade A');

    if v_farmer_price < 0 or v_lab_fee < 0 or v_market_price < 0 then
      raise exception 'Prices must be zero or greater.';
    end if;

    -- One delivery per farmer within this submission.
    v_delivery_id := nullif(v_delivery_map ->> (v_item ->> 'farmer_id'), '')::uuid;
    if v_delivery_id is null then
      v_delivery_id := gen_random_uuid();
      insert into public.deliveries (
        id, delivery_code, farmer_id, group_id, delivery_date,
        collection_location, received_by, status, origin_hub_id, opened_by
      ) values (
        v_delivery_id, public.next_code('DLV', 5), (v_item ->> 'farmer_id')::uuid, v_group_id, now(),
        coalesce(p_collection_location, ''), '', 'Draft', v_origin, v_profile.id
      );
      v_delivery_map := v_delivery_map || jsonb_build_object(v_item ->> 'farmer_id', v_delivery_id);

      insert into public.audit_logs (action, entity_type, entity_id, detail, by_name)
      values (
        'Delivery created', 'Delivery', v_delivery_id::text,
        format('%s %s %s from %s %s', v_qty, v_unit, v_product.name, v_farmer.first_name, v_farmer.last_name),
        v_name
      );
    end if;

    v_seq := public.next_seq('KL');
    v_batch_code := 'KL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq::text, 5, '0');

    insert into public.batches (
      id, batch_code, delivery_id, product_id, farmer_id,
      original_quantity, quantity_sold, quantity_returned, quantity_wasted,
      unit, quality_grade, farmer_price, lab_fee, market_price, status, received_at
    ) values (
      gen_random_uuid(), v_batch_code, v_delivery_id, v_product.id, v_farmer.id,
      v_qty, 0, 0, 0,
      v_unit, v_grade, v_farmer_price, v_lab_fee, v_market_price, 'Pending', now()
    );

    insert into public.audit_logs (action, entity_type, entity_id, detail, by_name)
    values (
      'Consignment created', 'Batch', v_delivery_id::text,
      format('%s · potential ₱%s', v_batch_code, round(v_qty * v_market_price, 2)),
      v_name
    );
  end loop;

  return jsonb_build_object('group_id', v_group_id, 'group_code', v_group_code);
end
$$;

-- Staff A sends the group → On the Way + notify Staff B.
create or replace function public.send_delivery_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_group public.delivery_groups%rowtype;
  v_hub_name text;
  v_name text;
begin
  perform public.require_role(array['Admin', 'Staff A']);

  select * into v_group from public.delivery_groups where id = p_group_id;
  if not found then
    raise exception 'Delivery group not found.';
  end if;
  if v_group.status <> 'Pending' then
    raise exception 'Only pending groups can be sent.';
  end if;

  update public.delivery_groups
  set status = 'On the Way', sent_by = auth.uid(), sent_at = now()
  where id = p_group_id;

  update public.deliveries set status = 'On the Way' where group_id = p_group_id;

  update public.batches b
  set status = 'At Hub'
  from public.deliveries d
  where d.id = b.delivery_id and d.group_id = p_group_id;

  select name into v_hub_name from public.hubs where id = v_group.origin_hub_id;
  select coalesce(first_name || ' ' || last_name, 'System') into v_name from public.profiles where id = auth.uid();

  perform public.write_audit('Delivery group sent', 'DeliveryGroup', p_group_id::text, v_group.group_code);

  insert into public.notifications (type, title, message, target_member_id, related_entity_type, related_entity_id)
  select
    'delivery_incoming',
    'Delivery incoming',
    format('Group %s is on the way from %s', v_group.group_code, coalesce(v_hub_name, 'Hub A')),
    p.id,
    'DeliveryGroup',
    p_group_id::text
  from public.profiles p
  where p.role = 'Staff B' and p.status = 'Active';
end
$$;

-- Staff B receives the group → Received + activate market inventory + notify Staff A.
create or replace function public.receive_delivery_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_group public.delivery_groups%rowtype;
  v_receiver public.profiles%rowtype;
  v_hub_name text;
  v_name text;
begin
  perform public.require_role(array['Admin', 'Staff B']);

  select * into v_group from public.delivery_groups where id = p_group_id;
  if not found then
    raise exception 'Delivery group not found.';
  end if;
  if v_group.status <> 'On the Way' then
    raise exception 'Only groups on the way can be received.';
  end if;

  select * into v_receiver from public.profiles where id = auth.uid();
  v_name := v_receiver.first_name || ' ' || v_receiver.last_name;
  select name into v_hub_name from public.hubs where id = v_receiver.hub_id;

  update public.delivery_groups
  set status = 'Received', received_by = auth.uid(), received_at = now()
  where id = p_group_id;

  update public.deliveries
  set status = 'Received', received_by = v_name
  where group_id = p_group_id;

  update public.batches b
  set status = 'Available'
  from public.deliveries d
  where d.id = b.delivery_id and d.group_id = p_group_id;

  perform public.write_audit('Delivery group received', 'DeliveryGroup', p_group_id::text, v_group.group_code);

  if v_group.created_by is not null then
    perform public.push_notification(
      'delivery_received',
      'Delivery received',
      format('Group %s has been received at %s', v_group.group_code, coalesce(v_hub_name, 'the receiving hub')),
      v_group.created_by,
      'DeliveryGroup',
      p_group_id::text
    );
  end if;
end
$$;

-- ── Market sale against a received batch (Staff B) ─────────────────────────

create or replace function public.record_sale(
  p_batch_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
  p_buyer_name text,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_batch public.batches%rowtype;
  v_delivery_status text;
  v_group_status text;
  v_remaining numeric;
  v_sale_id uuid;
  v_sale_code text;
  v_name text;
begin
  perform public.require_role(array['Admin', 'Staff B']);
  v_name := public.current_member_name();

  select b.*
  into v_batch
  from public.batches b
  where b.id = p_batch_id;

  if not found then
    raise exception 'Batch not found.';
  end if;

  select d.status, coalesce(g.status, '')
  into v_delivery_status, v_group_status
  from public.deliveries d
  left join public.delivery_groups g on g.id = d.group_id
  where d.id = v_batch.delivery_id;

  if not found then
    raise exception 'Delivery for this batch was not found.';
  end if;
  if v_group_status <> 'Received' and v_delivery_status not in ('Received', 'Sales Recorded', 'Completed') then
    raise exception 'This delivery has not been received yet.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Sale quantity must be greater than zero.';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'Selling price must be zero or greater.';
  end if;
  if p_buyer_name is null or btrim(p_buyer_name) = '' then
    raise exception 'Buyer name is required.';
  end if;
  if p_payment_method not in ('Cash', 'On credit') then
    raise exception 'Choose a valid payment method.';
  end if;

  v_remaining := round(v_batch.original_quantity - v_batch.quantity_sold - v_batch.quantity_returned - v_batch.quantity_wasted, 2);
  if p_quantity > v_remaining then
    raise exception 'Sale cannot exceed available quantity (% %).', v_remaining, v_batch.unit;
  end if;

  v_sale_id := gen_random_uuid();
  v_sale_code := public.next_code('SL', 5);

  insert into public.sales (
    id, sale_code, batch_id, product_id, farmer_id, quantity, unit, unit_price,
    buyer_name, payment_method, payment_settled, sold_at, recorded_by, order_id
  ) values (
    v_sale_id, v_sale_code, v_batch.id, v_batch.product_id, v_batch.farmer_id,
    p_quantity, v_batch.unit, p_unit_price,
    btrim(p_buyer_name), p_payment_method, false, now(), v_name, null
  );

  update public.batches
  set quantity_sold = quantity_sold + p_quantity,
      status = public.recompute_batch_status(
        original_quantity, quantity_sold + p_quantity, quantity_returned, quantity_wasted, status
      )
  where id = p_batch.id;

  perform public.write_audit(
    'Sale recorded', 'Sale', v_sale_id::text,
    format('%s %s sold to %s', p_quantity, v_batch.unit, btrim(p_buyer_name))
  );

  return jsonb_build_object(
    'id', v_sale_id,
    'sale_code', v_sale_code,
    'quantity', p_quantity,
    'unit', v_batch.unit,
    'buyer_name', btrim(p_buyer_name),
    'unit_price', p_unit_price,
    'farmer_price', v_batch.farmer_price,
    'lab_fee', v_batch.lab_fee
  );
end
$$;

-- Direct unsold/damaged return against a remaining batch (Staff A).
create or replace function public.record_return(
  p_batch_id uuid,
  p_quantity numeric,
  p_reason text,
  p_condition text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_batch public.batches%rowtype;
  v_remaining numeric;
  v_return_id uuid;
  v_return_code text;
  v_name text;
begin
  perform public.require_role(array['Admin', 'Staff A']);
  v_name := public.current_member_name();

  select * into v_batch from public.batches where id = p_batch_id;
  if not found then
    raise exception 'Batch not found.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Return quantity must be greater than zero.';
  end if;

  v_remaining := round(v_batch.original_quantity - v_batch.quantity_sold - v_batch.quantity_returned - v_batch.quantity_wasted, 2);
  if p_quantity > v_remaining then
    raise exception 'Return cannot exceed remaining quantity (% %).', v_remaining, v_batch.unit;
  end if;

  v_return_id := gen_random_uuid();
  v_return_code := public.next_code('RTN', 3);

  insert into public.return_records (id, return_code, batch_id, quantity, unit, reason, condition, returned_at, recorded_by)
  values (v_return_id, v_return_code, p_batch_id, p_quantity, v_batch.unit, coalesce(p_reason, ''), coalesce(p_condition, 'Good'), now(), v_name);

  update public.batches
  set quantity_returned = quantity_returned + p_quantity,
      status = public.recompute_batch_status(
        original_quantity, quantity_sold, quantity_returned + p_quantity, quantity_wasted, status
      )
  where id = p_batch_id;

  perform public.write_audit(
    'Return recorded', 'Return', v_return_id::text,
    format('%s %s returned (%s)', p_quantity, v_batch.unit, coalesce(p_reason, ''))
  );

  return jsonb_build_object('id', v_return_id, 'return_code', v_return_code);
end
$$;

-- ── Order creation with equal-share capped farmer allocation (Staff B) ─────
-- 1. Group farmers supplying the same product.
-- 2. Divide sold quantity equally among eligible batches.
-- 3. Cap each allocation at that batch's remaining quantity.
-- 4. Redistribute the remainder to batches with room, until fully allocated.

create or replace function public.create_order(
  p_buyer_name text,
  p_payment_method text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_code text;
  v_total numeric := 0;
  v_name text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_item_id uuid;
  v_batch_ids uuid[];
  v_rem numeric[];
  v_alloc numeric[];
  v_n int;
  v_equal numeric;
  v_left numeric;
  v_available numeric;
  v_batch public.batches%rowtype;
  v_next_sold numeric;
  v_payout numeric;
  v_i int;
  v_sale_code text;
begin
  perform public.require_role(array['Admin', 'Staff B']);
  v_name := public.current_member_name();

  if p_buyer_name is null or btrim(p_buyer_name) = '' then
    raise exception 'Buyer name is required.';
  end if;
  if p_payment_method not in ('Cash', 'On credit') then
    raise exception 'Choose a valid payment method.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.';
  end if;

  v_order_id := gen_random_uuid();
  v_order_code := public.next_code('ORD', 3);

  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_item ->> 'product_id' is null or v_item ->> 'product_id' = '' then
      raise exception 'Choose a product for every order line.';
    end if;

    v_qty := nullif(v_item ->> 'quantity', '')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Order quantity must be greater than zero.';
    end if;

    v_unit_price := coalesce(nullif(v_item ->> 'unit_price', '')::numeric, 0);
    if v_unit_price < 0 then
      raise exception 'Unit price must be zero or greater.';
    end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found then
      raise exception 'Product not found.';
    end if;

    -- Eligible batches: received at market, with remaining stock.
    select
      array_agg(b.id order by b.received_at, b.id),
      array_agg(round(b.original_quantity - b.quantity_sold - b.quantity_returned - b.quantity_wasted, 2) order by b.received_at, b.id)
    into v_batch_ids, v_rem
    from public.batches b
    join public.deliveries d on d.id = b.delivery_id
    join public.delivery_groups g on g.id = d.group_id
    where b.product_id = v_product.id
      and g.status = 'Received'
      and round(b.original_quantity - b.quantity_sold - b.quantity_returned - b.quantity_wasted, 2) > 0;

    v_available := 0;
    if v_rem is not null then
      select coalesce(sum(x), 0) into v_available from unnest(v_rem) as x;
    end if;

    if v_available <= 0 then
      raise exception 'Insufficient inventory for %. Available: 0, requested: %.', v_product.name, v_qty;
    end if;
    if v_qty > v_available then
      raise exception 'Insufficient inventory for %. Available: %, requested: %.', v_product.name, v_available, v_qty;
    end if;

    -- Equal division, then capped redistribution.
    v_n := coalesce(array_length(v_batch_ids, 1), 0);
    v_equal := v_qty / v_n;
    v_left := v_qty;
    v_alloc := array[]::numeric[];

    for v_i in 1 .. v_n loop
      v_alloc := v_alloc || least(round(v_equal, 2), v_rem[v_i]);
      v_left := v_left - least(round(v_equal, 2), v_rem[v_i]);
    end loop;
    v_left := round(v_left, 2);

    if v_left > 0 then
      for v_i in 1 .. v_n loop
        exit when v_left <= 0;
        declare
          v_room numeric := round(v_rem[v_i] - v_alloc[v_i], 2);
          v_add numeric;
        begin
          v_add := least(v_left, v_room);
          if v_add > 0 then
            v_alloc[v_i] := round(v_alloc[v_i] + v_add, 2);
            v_left := round(v_left - v_add, 2);
          end if;
        end;
      end loop;
    end if;

    if round(v_left, 2) > 0 then
      raise exception 'Could not allocate the full order quantity for %.', v_product.name;
    end if;

    v_line_total := round(v_qty * v_unit_price, 2);
    v_total := v_total + v_line_total;

    v_item_id := gen_random_uuid();
    insert into public.order_items (id, order_id, product_id, quantity, unit, unit_price, line_total)
    values (v_item_id, v_order_id, v_product.id, v_qty, v_product.default_unit, v_unit_price, v_line_total);

    for v_i in 1 .. v_n loop
      if v_alloc[v_i] > 0 then
        select * into v_batch from public.batches where id = v_batch_ids[v_i];

        v_next_sold := round(v_batch.quantity_sold + v_alloc[v_i], 2);
        update public.batches
        set quantity_sold = v_next_sold,
            status = public.recompute_batch_status(
              original_quantity, v_next_sold, quantity_returned, quantity_wasted, status
            )
        where id = v_batch.id;

        v_payout := round(v_alloc[v_i] * v_batch.farmer_price, 2);

        insert into public.farmer_allocations (
          id, order_item_id, batch_id, farmer_id, product_id, allocated_quantity, farmer_payout, created_at
        ) values (
          gen_random_uuid(), v_item_id, v_batch.id, v_batch.farmer_id, v_batch.product_id, v_alloc[v_i], v_payout, now()
        );

        v_sale_code := public.next_code('SL', 5);
        insert into public.sales (
          id, sale_code, batch_id, product_id, farmer_id, quantity, unit, unit_price,
          buyer_name, payment_method, payment_settled, sold_at, recorded_by, order_id
        ) values (
          gen_random_uuid(), v_sale_code, v_batch.id, v_batch.product_id, v_batch.farmer_id,
          v_alloc[v_i], v_batch.unit, v_batch.market_price,
          btrim(p_buyer_name), p_payment_method, false, now(), v_name, v_order_id
        );
      end if;
    end loop;
  end loop;

  v_total := round(v_total, 2);

  insert into public.orders (id, order_code, buyer_name, total_revenue, payment_method, status, recorded_by, created_at)
  values (v_order_id, v_order_code, btrim(p_buyer_name), v_total, p_payment_method, 'Confirmed', v_name, now());

  perform public.write_audit(
    'Order created', 'Order', v_order_id::text,
    format('%s · ₱%s from %s', v_order_code, v_total, btrim(p_buyer_name))
  );

  insert into public.notifications (type, title, message, target_member_id, related_entity_type, related_entity_id)
  select
    'order_confirmed',
    'New order created',
    format('Order %s by %s (₱%s)', v_order_code, btrim(p_buyer_name), v_total),
    p.id,
    'Order',
    v_order_id::text
  from public.profiles p
  where p.role in ('Staff A', 'Admin') and p.status = 'Active';

  return jsonb_build_object('id', v_order_id, 'order_code', v_order_code, 'total_revenue', v_total);
end
$$;

-- ── Return request workflow ────────────────────────────────────────────────
-- Staff B submits → Pending Review → Staff A approves/rejects.

create or replace function public.create_return_request(
  p_order_id uuid,
  p_items jsonb,
  p_return_type text,
  p_reason text,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_rr_id uuid;
  v_rr_code text;
  v_name text;
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_ordered numeric;
  v_already_returned numeric;
begin
  perform public.require_role(array['Admin', 'Staff B']);
  select * into v_profile from public.profiles where id = auth.uid();
  v_name := v_profile.first_name || ' ' || v_profile.last_name;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found.';
  end if;
  if p_return_type not in ('Normal', 'Damaged') then
    raise exception 'Choose a valid return type.';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Reason is required.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product with a valid quantity.';
  end if;

  v_rr_id := gen_random_uuid();
  v_rr_code := public.next_code('RET', 3);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := nullif(v_item ->> 'quantity', '')::numeric;
    if v_qty is null or v_qty <= 0 then
      continue;
    end if;
    if v_item ->> 'product_id' is null or v_item ->> 'product_id' = '' then
      raise exception 'Choose a product for every return line.';
    end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found then
      raise exception 'Product not found.';
    end if;

    select coalesce(oi.quantity, 0) into v_ordered
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id = v_product.id
    limit 1;
    if coalesce(v_ordered, 0) <= 0 then
      raise exception '% is not part of this order.', v_product.name;
    end if;

    select coalesce(sum(ri.quantity), 0) into v_already_returned
    from public.return_items ri
    join public.return_requests r on r.id = ri.return_request_id
    where r.order_id = p_order_id
      and ri.product_id = v_product.id
      and r.status <> 'Rejected';

    if v_qty > v_ordered - v_already_returned then
      raise exception 'Return quantity for % exceeds the returnable quantity (% remaining).',
        v_product.name, v_ordered - v_already_returned;
    end if;

    insert into public.return_items (id, return_request_id, product_id, quantity, unit)
    values (gen_random_uuid(), v_rr_id, v_product.id, v_qty, v_product.default_unit);
  end loop;

  if not exists (select 1 from public.return_items where return_request_id = v_rr_id) then
    raise exception 'Add at least one product with a valid quantity.';
  end if;

  insert into public.return_requests (
    id, return_code, order_id, return_type, reason, notes, status, requested_by, requested_by_name, created_at
  ) values (
    v_rr_id, v_rr_code, p_order_id, p_return_type, btrim(p_reason), coalesce(p_notes, ''),
    'Pending Review', v_profile.id, v_name, now()
  );

  perform public.write_audit(
    'Return requested', 'ReturnRequest', v_rr_id::text,
    format('%s · %s · %s', v_rr_code, p_return_type, btrim(p_reason))
  );

  insert into public.notifications (type, title, message, target_member_id, related_entity_type, related_entity_id)
  select
    'return_request',
    'Return request submitted',
    format('%s for order %s — %s return', v_rr_code, v_order.order_code, p_return_type),
    p.id,
    'ReturnRequest',
    v_rr_id::text
  from public.profiles p
  where p.role in ('Staff A', 'Admin') and p.status = 'Active';

  return jsonb_build_object('id', v_rr_id, 'return_code', v_rr_code);
end
$$;

create or replace function public.review_return_request(
  p_return_id uuid,
  p_decision text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_rr public.return_requests%rowtype;
  v_order public.orders%rowtype;
  v_name text;
  v_item record;
  v_batch record;
  v_remaining numeric;
  v_add numeric;
  v_placed boolean;
begin
  perform public.require_role(array['Admin', 'Staff A']);
  v_name := public.current_member_name();

  select * into v_rr from public.return_requests where id = p_return_id;
  if not found then
    raise exception 'Return request not found.';
  end if;
  if v_rr.status <> 'Pending Review' then
    raise exception 'This return request has already been reviewed.';
  end if;
  if p_decision not in ('Approved', 'Rejected') then
    raise exception 'Choose a valid decision.';
  end if;

  if p_decision = 'Approved' then
    select * into v_order from public.orders where id = v_rr.order_id;

    for v_item in
      select ri.* from public.return_items ri where ri.return_request_id = p_return_id
    loop
      v_remaining := v_item.quantity;
      v_placed := false;

      for v_batch in
        select b.*
        from public.batches b
        where exists (
          select 1 from public.sales s
          where s.batch_id = b.id
            and s.order_id = v_rr.order_id
            and s.product_id = v_item.product_id
        )
        order by b.received_at, b.id
      loop
        exit when v_remaining <= 0;

        v_add := least(v_remaining, round(v_batch.quantity_sold - v_batch.quantity_returned, 2));
        if v_add > 0 then
          update public.batches
          set quantity_returned = quantity_returned + v_add,
              status = public.recompute_batch_status(
                original_quantity, quantity_sold, quantity_returned + v_add, quantity_wasted, status
              )
          where id = v_batch.id;

          insert into public.return_records (return_code, batch_id, quantity, unit, reason, condition, returned_at, recorded_by)
          values (
            public.next_code('RTN', 3), v_batch.id, v_add, v_batch.unit,
            v_rr.reason,
            case when v_rr.return_type = 'Damaged' then 'Damaged' else 'Good' end,
            now(), v_name
          );

          v_remaining := round(v_remaining - v_add, 2);
          v_placed := true;
        end if;
      end loop;

      if not v_placed then
        raise exception 'No sold quantity available to return for this product (order %).',
          coalesce(v_order.order_code, '');
      end if;
    end loop;
  end if;

  update public.return_requests
  set status = p_decision,
      reviewed_by = v_name,
      review_note = nullif(p_review_note, ''),
      reviewed_at = now()
  where id = p_return_id;

  perform public.write_audit(
    'Return ' || lower(p_decision), 'ReturnRequest', p_return_id::text,
    v_rr.return_code || case when coalesce(p_review_note, '') <> '' then ' · ' || p_review_note else '' end
  );

  if v_rr.requested_by is not null then
    perform public.push_notification(
      case when p_decision = 'Approved' then 'return_approved' else 'return_rejected' end,
      'Return ' || lower(p_decision),
      v_rr.return_code || ' has been ' || lower(p_decision) ||
        case when coalesce(p_review_note, '') <> '' then ' — ' || p_review_note else '' end,
      v_rr.requested_by,
      'ReturnRequest',
      p_return_id::text
    );
  end if;
end
$$;

-- ── Farmer settlements (Staff A / Admin) ───────────────────────────────────

create or replace function public.generate_settlement(p_farmer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_count int;
  v_items jsonb;
  v_payable numeric;
  v_id uuid;
  v_code text;
begin
  perform public.require_role(array['Admin', 'Staff A']);

  select count(*) into v_count
  from public.sales s
  where s.farmer_id = p_farmer_id and s.payment_settled = false;

  if v_count = 0 then
    return null;
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'saleId', s.id,
      'batchCode', b.batch_code,
      'productName', pr.name,
      'quantity', s.quantity,
      'farmerPrice', b.farmer_price,
      'farmerAmount', round(s.quantity * b.farmer_price, 2)
    ) order by s.sold_at), '[]'::jsonb),
    coalesce(sum(round(s.quantity * b.farmer_price, 2)), 0)
  into v_items, v_payable
  from public.sales s
  join public.batches b on b.id = s.batch_id
  join public.products pr on pr.id = s.product_id
  where s.farmer_id = p_farmer_id and s.payment_settled = false;

  v_id := gen_random_uuid();
  v_code := public.next_code('ST', 3);

  insert into public.settlements (
    id, settlement_code, farmer_id, period_start, period_end, items,
    total_sales, adjustments, payable, status, created_at
  ) values (
    v_id, v_code, p_farmer_id, current_date - 7, current_date, v_items,
    round(v_payable, 2), 0, round(v_payable, 2), 'Approved', now()
  );

  perform public.write_audit('Settlement generated', 'Settlement', v_id::text, v_code || ' · ₱' || round(v_payable, 2));

  return jsonb_build_object('id', v_id, 'settlement_code', v_code, 'payable', round(v_payable, 2));
end
$$;

create or replace function public.mark_paid(p_settlement_id uuid, p_method text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_settlement public.settlements%rowtype;
  v_sale_ids uuid[];
begin
  perform public.require_role(array['Admin', 'Staff A']);

  select * into v_settlement from public.settlements where id = p_settlement_id;
  if not found then
    raise exception 'Settlement not found.';
  end if;
  if v_settlement.status in ('Paid', 'Cancelled') then
    raise exception 'This settlement has already been processed.';
  end if;

  select array_agg((value ->> 'saleId')::uuid) into v_sale_ids
  from jsonb_array_elements(v_settlement.items) as value;

  update public.settlements
  set status = 'Paid', paid_at = now(), payment_method = coalesce(p_method, 'Cash')
  where id = p_settlement_id;

  if v_sale_ids is not null then
    update public.sales set payment_settled = true where id = any (v_sale_ids);
  end if;

  perform public.write_audit(
    'Settlement paid', 'Settlement', p_settlement_id::text,
    v_settlement.settlement_code || ' marked as paid · ' || coalesce(p_method, 'Cash')
  );
end
$$;

-- ── Farmer / product creation (Staff A / Admin) ────────────────────────────

create or replace function public.add_farmer(
  p_first_name text,
  p_last_name text,
  p_age int default 0,
  p_gender text default '',
  p_address text default '',
  p_barangay text default '',
  p_municipality text default '',
  p_phone text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_code text;
begin
  perform public.require_role(array['Admin', 'Staff A']);

  if btrim(coalesce(p_first_name, '')) = '' or btrim(coalesce(p_last_name, '')) = '' then
    raise exception 'Full name is required.';
  end if;

  v_id := gen_random_uuid();
  v_code := public.next_code('F', 5);

  insert into public.farmers (
    id, farmer_code, first_name, last_name, age, gender, address, barangay, municipality, phone, status, created_at
  ) values (
    v_id, v_code, btrim(p_first_name), btrim(p_last_name), coalesce(p_age, 0), coalesce(p_gender, ''),
    coalesce(p_address, ''), coalesce(p_barangay, ''), coalesce(p_municipality, ''), coalesce(p_phone, ''),
    'Active', now()
  );

  perform public.write_audit(
    'Farmer created', 'Farmer', v_id::text,
    btrim(p_first_name) || ' ' || btrim(p_last_name) || ' (' || v_code || ')'
  );

  return jsonb_build_object('id', v_id, 'farmer_code', v_code);
end
$$;

create or replace function public.add_product(
  p_name text,
  p_category text,
  p_default_unit text,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.require_role(array['Admin', 'Staff A']);

  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'Product name is required.';
  end if;
  if exists (select 1 from public.products where lower(name) = lower(btrim(p_name))) then
    raise exception 'A product with this name already exists.';
  end if;

  v_id := gen_random_uuid();
  insert into public.products (id, name, category, default_unit, emoji, created_at)
  values (v_id, btrim(p_name), coalesce(p_category, 'Other'), coalesce(p_default_unit, 'kg'), coalesce(p_emoji, '📦'), now());

  perform public.write_audit(
    'Product created', 'Product', v_id::text,
    coalesce(p_emoji, ' ') || ' ' || btrim(p_name) || ' (' || coalesce(p_category, 'Other') || ')'
  );

  return jsonb_build_object('id', v_id);
end
$$;

-- ── Admin: create a member account (auth user + profile) ───────────────────

create or replace function public.admin_create_member(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_hub_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.require_role(array['Admin']);

  if btrim(coalesce(p_email, '')) = '' or btrim(coalesce(p_first_name, '')) = '' or btrim(coalesce(p_last_name, '')) = '' then
    raise exception 'Name and email are required.';
  end if;
  if coalesce(p_password, '') !~ '^(.{8,})$' then
    raise exception 'Password must be at least 8 characters.';
  end if;
  if p_role not in ('Admin', 'Staff A', 'Staff B') then
    raise exception 'Choose a valid role.';
  end if;
  if p_role in ('Staff A', 'Staff B') and coalesce(p_hub_id, '') = '' then
    raise exception 'Staff members must be assigned to a hub.';
  end if;
  if p_role = 'Admin' then
    p_hub_id := null;
  elsif not exists (select 1 from public.hubs where id = p_hub_id) then
    raise exception 'Hub not found.';
  end if;
  if exists (
    select 1 from auth.users u
    where lower(u.email) = lower(btrim(p_email))
       or exists (select 1 from public.profiles pr where lower(pr.email) = lower(btrim(p_email)))
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
      'role', p_role,
      'hub_id', p_hub_id
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

  perform public.write_audit(
    'Member created', 'Member', v_id::text,
    btrim(p_first_name) || ' ' || btrim(p_last_name) || ' (' || p_role || ')'
  );

  return jsonb_build_object('id', v_id);
end
$$;

-- Execute grants (PostgREST needs them; role checks happen inside each RPC).
grant execute on function public.create_delivery_group(jsonb, text) to authenticated;
grant execute on function public.send_delivery_group(uuid) to authenticated;
grant execute on function public.receive_delivery_group(uuid) to authenticated;
grant execute on function public.record_sale(uuid, numeric, numeric, text, text) to authenticated;
grant execute on function public.record_return(uuid, numeric, text, text) to authenticated;
grant execute on function public.create_order(text, text, jsonb) to authenticated;
grant execute on function public.create_return_request(uuid, jsonb, text, text, text) to authenticated;
grant execute on function public.review_return_request(uuid, text, text) to authenticated;
grant execute on function public.generate_settlement(uuid) to authenticated;
grant execute on function public.mark_paid(uuid, text) to authenticated;
grant execute on function public.add_farmer(text, text, int, text, text, text, text, text) to authenticated;
grant execute on function public.add_product(text, text, text, text) to authenticated;
grant execute on function public.admin_create_member(text, text, text, text, text, text) to authenticated;
grant execute on function public.has_role(text[]) to authenticated;
grant execute on function public.require_role(text[]) to authenticated;
grant execute on function public.current_profile() to authenticated;
grant execute on function public.current_member_name() to authenticated;
grant execute on function public.recompute_batch_status(numeric, numeric, numeric, numeric, text) to authenticated;
-- ────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- LokalLink — 000003_realtime.sql
-- Enable Postgres Changes on every table the client refreshes from.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array[
    'hubs', 'profiles', 'farmers', 'products',
    'delivery_groups', 'deliveries', 'batches',
    'orders', 'order_items', 'farmer_allocations',
    'sales', 'return_records', 'return_requests', 'return_items',
    'settlements', 'preorders', 'notifications', 'audit_logs'
  ] loop
    begin
      execute format('alter table public.%I replica identity full', t);
    exception when others then
      null;
    end;
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then
      null;
    end;
  end loop;
end
$$;
-- ────────────────────────────────────────────────────────────────────────
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
-- ────────────────────────────────────────────────────────────────────────
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

  insert into public.code_counters (prefix, next_value) values ('MB', 1)
  on conflict (prefix) do update set next_value = greatest(public.code_counters.next_value, 1);

  return jsonb_build_object('id', v_id);
end
$$;

revoke all on function public.create_first_admin(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_first_admin(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
