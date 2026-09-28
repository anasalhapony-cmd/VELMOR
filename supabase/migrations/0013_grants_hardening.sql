-- =============================================================================
-- 0013 — Privilege hardening (grants) + public stock bucket
-- =============================================================================
-- Defence in depth on top of RLS: anon (the public/customer role) gets SELECT
-- only, and CANNOT read exact stock counts. All writes and privileged reads go
-- through server routes (service_role) or SECURITY DEFINER functions.

-- Public availability bucket, so customers never see exact quantities.
alter table product_variants
  add column stock_status text generated always as (
    case
      when stock_quantity <= 0  then 'OUT_OF_STOCK'
      when stock_quantity <= 10 then 'LOW_STOCK'
      else 'IN_STOCK'
    end
  ) stored;

-- ---- reset table privileges ----------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public;

grant usage on schema public to anon, authenticated, service_role;

-- ---- anon: SELECT on public catalog only ----------------------------------
grant select on
  brands, categories, collections, fragrance_families, fragrance_notes,
  delivery_zones, products, product_images, product_categories,
  product_collections, product_notes, reviews, homepage_sections, cms_blocks,
  pages, faqs, promotions, site_settings
to anon, authenticated;

-- Variants: anon gets a column subset that EXCLUDES stock_quantity / barcode /
-- weight. Exact counts are never exposed to customers (stock_status only).
grant select (id, product_id, size, unit, price, compare_at_price, active,
              position, stock_status, created_at, updated_at)
on product_variants to anon;

-- ---- authenticated (admins) : full CRUD; RLS restricts to is_admin() -------
-- NOTE: only admins authenticate at launch (no customer accounts). When
-- customer accounts are introduced, add column/row restrictions for non-admin
-- authenticated users (see docs/SECURITY.md).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---- service_role : trusted server key (bypasses RLS) ---------------------
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---- function execute grants ----------------------------------------------
-- Policy helpers must be callable by the public roles (used inside RLS).
grant execute on function is_admin(), has_permission(text), is_owner(),
  get_setting(text) to anon, authenticated;

-- Safe, read-only (or self-guarding) RPCs for the storefront.
grant execute on function
  quote_order(jsonb, uuid, text, text),
  search_products(text, int),
  track_order(text, text)
to anon, authenticated;

-- Admin RPC (guards internally via is_admin()+has_permission()).
grant execute on function admin_update_order_status(uuid, order_status, text, boolean)
  to authenticated;

-- Privileged mutations — server (service_role) only.
grant execute on function
  create_order(jsonb, text),
  adjust_inventory(uuid, int, inventory_reason, uuid, uuid, text),
  quote_order(jsonb, uuid, text, text),
  search_products(text, int),
  track_order(text, text),
  admin_update_order_status(uuid, order_status, text, boolean),
  get_order_public(uuid)
to service_role;
