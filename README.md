# LokalLink — Farmer-to-Market Tracker

Full-stack demo for farmer-to-market operations: deliveries, batches, market sales, orders with farmer allocations, settlements, returns, and notifications. Backed by **Supabase** (Postgres, Auth, RLS, Realtime) with a React SPA.

## Stack

| Layer | Tech |
| --- | --- |
| UI | React 19, React Router 7, lucide-react |
| Build | Vite 8, TypeScript ~6.0, oxlint |
| Backend | Supabase (Postgres + RPC + RLS + Realtime + Auth) |
| Deploy | Vercel |

## Quick start (local)

```bash
npm install
cp .env.example .env   # fill in your Supabase project values
npm run dev
```

Scripts: `npm run dev` · `npm run build` · `npm run lint` · `npm run preview`

## Supabase setup

1. Create a Supabase project (or use an existing one).
2. Open **SQL Editor** and paste the entire contents of  
   [`supabase/lokalink_full_setup.sql`](supabase/lokalink_full_setup.sql)  
   (this concatenates migrations `000001`–`000005`: schema/RLS, RPCs, realtime, seed, bootstrap).
3. Run once as a single query. When prompted, choose **Run and enable RLS**.  
   Safe to re-run: init drops/recreates `public` tables first.
4. Existing project with the old demo members / ops data? Run  
   [`supabase/reset_demo_data.sql`](supabase/reset_demo_data.sql) once  
   (fixes auth NULL tokens → "Database error querying schema", deletes demo members + deliveries/batches/sales/orders, keeps hubs/products/farmers/preorders, reinstalls bootstrap).
5. Copy project URL + publishable key into `.env`:

```bash
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never commit `.env` or service-role keys to the browser bundle.

Individual migrations live under [`supabase/migrations/`](supabase/migrations/):

| File | Purpose |
| --- | --- |
| `20260923000001_init_schema.sql` | Tables, constraints, triggers, RLS |
| `20260923000002_rpc.sql` | All write RPCs (deliveries, sales, orders, settlements, …) |
| `20260923000003_realtime.sql` | Realtime publication |
| `20260923000004_seed_test_data.sql` | Hubs, products, farmers, preorders, counters (no members) |
| `20260923000005_bootstrap.sql` | `needs_setup()` / `create_first_admin()` |

After editing any migration, regenerate the combined file (header + five migrations with separators) so the SQL Editor copy stays in sync.

## First Admin & members

No demo members are seeded. On first visit the login page detects an empty `profiles` table (`needs_setup()`) and shows **Create first Admin** (also via the **Create an account** link).

After an Admin exists, **Create an account** is **invite-only**: it shows a message to ask the Admin to add you from **Members**, then sign in. There is no open public Staff signup.

RLS gates every table by profile role/hub; writes go through `SECURITY DEFINER` RPCs that call `require_role(...)`.

## Core workflows

- **Deliveries (Staff A / Admin):** create delivery group → send (`Pending → On the Way`) → Staff B receives (`Received`). Batches: `Pending → At Hub → Available`.
- **Market sale (Staff B):** only batches whose delivery group is **Received** are sellable (`isSellableBatch`).
- **Orders (Staff B):** equal-share farmer allocation, capped at remaining qty, remainder redistributed.
- **Settlements (Staff A / Admin):** generate pending sale rows → mark paid.
- **Returns:** submit → review/approve-reject → related sale/order updates.
- **Notifications:** created by RPC side effects; mark one/all read from the sidebar.

## Data flow

- On auth ready: `loadAll()` pulls profiles + domain tables; 300 ms debounced realtime refresh keeps the store live.
- Mutations are async RPC calls; on failure the UI surfaces the error (no fake success).
- Without Supabase env vars the app falls back to the in-memory demo store (`isSupabaseEnabled === false`).

## Deploy (Vercel)

1. Import the GitHub repo (framework: **Vite**).
2. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Build command `npm run build`, output `dist`.

## Security notes

- Browser only sees `VITE_*` publishable key + project URL.
- RLS enabled on all public tables; grants allow API reach, policies allow access.
- `.env` is gitignored; `.env.example` documents required keys.
