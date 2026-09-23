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
