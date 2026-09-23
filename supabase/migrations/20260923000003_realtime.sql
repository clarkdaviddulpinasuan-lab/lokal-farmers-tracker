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
