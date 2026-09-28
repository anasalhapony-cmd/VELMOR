-- =============================================================================
-- 0019 — Function/table privilege lockdown (Supabase default-privilege fix)
-- =============================================================================
-- On Supabase, `ALTER DEFAULT PRIVILEGES` grants EXECUTE on every new function
-- (and ALL on every new table) in `public` directly to anon/authenticated.
-- `revoke ... from public` does NOT remove those direct grants, so functions
-- created after 0013 (e.g. _transition_order_status, expire_stale_orders,
-- rate_limit_hit) would otherwise be callable by anyone holding the anon key.
--
-- This migration:
--   1. stops future objects from being auto-granted to anon/authenticated;
--   2. revokes EXECUTE on ALL public functions from anon/authenticated/public;
--   3. re-grants an explicit allowlist (storefront read RPCs, RLS helpers,
--      self-guarding admin RPCs);
--   4. revokes all privileges on server-only tables.
-- Idempotent. Re-run safely after adding functions: new ones stay locked until
-- explicitly granted.

-- 1. Future objects created by the migration role are NOT auto-exposed.
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 2. Clean slate for functions.
revoke execute on all functions in schema public from public, anon, authenticated;

-- 3a. RLS/policy helpers (evaluated inside policies for both roles).
grant execute on function
  is_admin(),
  is_owner(),
  is_senior_admin(),
  has_permission(text),
  get_setting(text),
  order_status_is_open(order_status)
to anon, authenticated;

-- 3b. Public catalogue RPCs (public data only).
--     NOTE: quote_order(_v2) and track_order are deliberately NOT granted to
--     anon: called directly they would bypass the API rate limits (phone
--     brute-force on tracking, stock/coupon probing on quotes). The storefront
--     reaches them only through rate-limited server routes (service_role).
grant execute on function
  search_products(text, int),
  list_products(jsonb, text, int, int),
  browse_facets()
to anon, authenticated;

-- 3c. Admin RPCs — each raises 42501 unless is_admin()/has_permission().
grant execute on function
  admin_update_order_status(uuid, order_status, text, boolean),
  log_admin_action(text, text, text, jsonb, jsonb, text),
  admin_adjust_inventory(uuid, int, inventory_reason, text),
  admin_dashboard_metrics(),
  admin_sales_series(int),
  admin_top_products(int),
  admin_orders_by_city(),
  admin_customers(text, int, int)
to authenticated;

-- 3d. Server-only (service_role) — order creation, stock, jobs, rate limits.
grant execute on all functions in schema public to service_role;

-- 4. Server-only tables: never reachable with the anon/authenticated key.
revoke all on table rate_limit_buckets from anon, authenticated;
