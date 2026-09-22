# VELMOR — Arabic-first luxury fragrance e-commerce

A production-oriented, Arabic-first (RTL) fragrance storefront **and admin dashboard** for a Libyan
market launch: online-only, home delivery, Cash on Delivery. Built on Next.js (App Router) +
Supabase (PostgreSQL) with server-authoritative pricing, atomic COD order creation, real inventory
with an audit ledger, RLS on every table, and a full admin CMS.

> All money is computed on the server. The client is never trusted for price, stock, discount,
> delivery fee, totals, order status, or permissions.

---

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions), **TypeScript** (strict)
- **Supabase**: PostgreSQL, Auth, Storage, RLS
- **Tailwind CSS** (brand design system), **Framer Motion**, **Zustand**, **React Hook Form + Zod**, **Lucide**

## Requirements

- Node.js **≥ 20.9**
- A **Supabase** project (free tier is fine to start)
- (Deploy) A **Vercel** account

---

## 1. Install

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
```

### Environment variables (`.env.local`)

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon public key |
| `NEXT_PUBLIC_SITE_URL` | metadata / SEO | e.g. `https://velmor.ly` |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypasses RLS — never expose to the browser |
| `DATABASE_URL` | migration/seed scripts only | Project Settings → Database → Connection string (URI) |
| `GUEST_COOKIE_SECRET` | guest cookie | `openssl rand -hex 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | `db:create-admin` only | first owner bootstrap |

---

## 2. Database: migrate + seed

The schema lives in `supabase/migrations/` (ordered, reproducible). Apply it to your Supabase DB:

```bash
npm run db:migrate      # applies 0001 … 0015 (tracked in schema_migrations; safe to re-run)
npm run db:seed         # optional: clearly-marked DEV sample data (replace before launch)
```

> **Migration `0013` (grants hardening) is mandatory on Supabase** — it revokes broad table access
> from `anon`/`authenticated` and hides exact stock counts from the public.

`0015` adds the admin RPCs (audit logging, guarded inventory adjust, dashboard/analytics aggregates).

## 3. Create the first admin (owner)

Admins are Supabase Auth users linked to an `admin_users` row. Bootstrap the owner:

```bash
ADMIN_EMAIL=owner@velmor.ly ADMIN_PASSWORD='a-strong-password' ADMIN_NAME='Owner' \
  npm run db:create-admin
```

Then sign in at **`/admin/login`**.

## 4. Storage bucket for product images

The admin image uploader (`/api/admin/upload`) stores files in a Supabase Storage bucket named
**`product-images`**. Create it once:

- Supabase → Storage → **New bucket** → name `product-images`, **Public** = on.
- Public read is enough for the storefront; uploads happen server-side with the service role, so no
  extra write policy is required. (You can also add product images by external URL from the editor.)

---

## 5. Verify

```bash
npm run verify     # tsc --noEmit  +  unit tests  +  next build
```

Individual checks:

```bash
npm run typecheck          # strict TypeScript over the whole app (real types)
npm run test               # unit tests (money, phone, finder, order-status, admin permissions)
npm run build              # production build
npm run typecheck:offline  # optional: type-check the admin against stubs WITHOUT node_modules
```

### Database integration tests (require a local Postgres)

`tests/db/assertions.sql` + `tests/db/*` verify business logic and RLS on a real Postgres, including a
concurrent "last unit" race (no oversell). See `scripts/run-db-tests.sh`. These run against a local
Postgres using `scripts/_local_supabase_shim.sql` (which recreates the objects Supabase provides).

---

## 6. Deploy (Vercel + Supabase)

1. Push the repo to GitHub and **import it into Vercel**.
2. Add all environment variables from `.env.local` to the Vercel project (Production + Preview).
   Set `NEXT_PUBLIC_SITE_URL` to your real domain.
3. Ensure the database is migrated (`npm run db:migrate` against the production `DATABASE_URL`) and the
   `product-images` bucket exists.
4. Deploy. Add your domain in Vercel → Domains.

### Production checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set **only** as a server env var (never `NEXT_PUBLIC_`).
- [ ] All migrations applied (esp. `0013` hardening); RLS enabled on every table.
- [ ] `product-images` bucket created.
- [ ] Owner account created; extra staff added with least-privilege roles.
- [ ] Dev seed **removed/replaced** with real products, prices, delivery zones, and page copy.
- [ ] `announcement`, WhatsApp number, and policies reviewed in **Admin → Settings / CMS**.
- [ ] `npm run verify` passes on CI.
- [ ] CSP verified in production (see note below).

---

## Admin dashboard (`/admin`)

Role-based (owner / manager / staff) with granular permissions. Sections:

- **Overview & Analytics** — KPIs, realised vs ordered revenue (COD), best sellers, orders by city, funnel.
- **Orders** — search/filter, detail, guarded status state-machine, internal notes, WhatsApp action.
- **Customers** — derived from orders (by phone).
- **Products** — multi-section editor: info, fragrance profile, variants, notes (pyramid), images (upload
  or URL), categories/collections, SEO, visibility. Archive (soft-delete) preserves order history.
- **Inventory** — stock adjustments through a single ledgered choke point; full movement history.
- **Taxonomy** — brands, categories (hierarchical), collections, fragrance families, notes.
- **Coupons** (scope by product/category/brand) & **Promotions**.
- **Reviews** moderation (pending/approved/rejected; ratings roll up from approved only).
- **Delivery zones**, **CMS** (homepage sections, pages with §112 approval gate, FAQ, content blocks),
  **Settings** (grouped, incl. Perfume Finder weights, feature toggles, maintenance mode).
- **Audit log** (append-only) and **Admin accounts** (owner-only).

Every admin mutation is authorized server-side (RLS + `is_admin()`/`has_permission()`), and important
changes are written to the audit log via the `log_admin_action` RPC.

---

## Security model (summary)

- **RLS on every table.** Public can read only safe, active catalog rows; exact stock is never exposed
  (a `stock_status` bucket is shown instead). All customer writes go through `SECURITY DEFINER` RPCs.
- **Server-authoritative money.** `create_order` locks each variant, revalidates price + stock,
  decrements inventory atomically, snapshots line items, and is idempotent by key.
- **Order privacy.** Tracking requires order number **and** phone; public order numbers are random.
- **Uploads** are validated by magic-bytes (not extension/MIME), size-limited, and stored under the
  product id.
- **CSP with per-request nonce** is applied in `middleware.ts`.

### CSP note (verify in production)

A nonce-based `Content-Security-Policy` is set per request. It intentionally omits `'strict-dynamic'`
so statically-rendered pages keep working, allows inline styles (Tailwind/Framer) and `https:` images
(Supabase Storage / admin URLs), and permits `unsafe-eval` in **development only** (React Fast Refresh).
Validate it against your final asset origins after the first production build; if you add third-party
scripts (analytics, etc.), extend `script-src`/`connect-src` in `buildCsp()`.

---

## Project structure

```
app/(store)/        storefront (home, products, product, cart, checkout, track, wishlist, finder, cms pages)
app/admin/          admin: login + (dashboard)/… (all management screens)
app/api/            checkout, quote, coupons, reviews, wishlist, search, track, analytics, admin/upload
components/         ui, layout, home, product, cart, checkout, reviews, wishlist, finder, admin
lib/                supabase clients, orders, pricing, inventory, coupons, delivery, finder, admin, security, seo, utils, validation
supabase/migrations 0001–0015 (schema, RLS, functions, grants, admin RPCs)
supabase/seed       dev seed data (clearly marked)
tests/              unit tests, db assertions, offline typecheck stubs
```

## Notes on this build

- The database is the source of truth; `types/database.ts` is a hand-authored mirror of the schema.
- `tests/typecheck/app-stubs.d.ts` + `tsconfig.stubs.json` allow type-checking the admin **offline**
  (no `node_modules`) by stubbing external packages. The **authoritative** check is `npm run verify`
  with real types after `npm install`.
