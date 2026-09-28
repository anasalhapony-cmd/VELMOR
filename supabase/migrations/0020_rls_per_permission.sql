set client_min_messages = warning;
-- =============================================================================
-- 0020 — Row-level security per permission (defence in depth for staff roles)
-- =============================================================================
-- Until now every active admin matched a blanket `for all using (is_admin())`
-- policy, so a `staff`/`manager` account holding only e.g. `manage_orders`
-- could bypass the dashboard by calling the REST API with its own session JWT
-- and edit prices, coupons or settings. The app-layer checks were the only
-- gate. This migration makes the DATABASE enforce the same permission model:
--
--   * SELECT  : admins with a relevant permission (PII tables need view_orders)
--   * WRITE   : only the permission that owns the table (manage_products, …)
--   * LEDGERS : orders/order_items/history/inventory/coupon usage/idempotency/
--               analytics/notifications are NOT writable with a user JWT at
--               all — only via SECURITY DEFINER RPCs that enforce the state
--               machine (the one exception: orders.internal_note, column-level)
--   * PRICES  : changing a variant price needs manage_prices
--   * STOCK   : stock/reserved quantities change only through the ledger RPCs
-- Owners and admins keep full access through has_permission().

-- ---------------------------------------------------------------------------
-- 1. Drop the blanket admin policies from 0012
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'site_settings','brands','categories','collections','fragrance_families',
    'fragrance_notes','delivery_zones','products','product_variants','product_images',
    'product_categories','product_collections','product_notes','inventory_movements',
    'orders','order_items','order_status_history','idempotency_keys','coupons',
    'coupon_products','coupon_categories','coupon_brands','coupon_usage','promotions',
    'reviews','wishlist_items','homepage_sections','cms_blocks','pages','faqs',
    'analytics_events','notification_logs'
  ] loop
    execute format('drop policy if exists %I on %I;', t || '_admin_all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Read policies
-- ---------------------------------------------------------------------------
-- Catalogue / content / config: any active admin may read (dashboard needs it).
do $$
declare t text;
begin
  foreach t in array array[
    'site_settings','brands','categories','collections','fragrance_families',
    'fragrance_notes','delivery_zones','products','product_variants','product_images',
    'product_categories','product_collections','product_notes','inventory_movements',
    'coupons','coupon_products','coupon_categories','coupon_brands','promotions',
    'reviews','homepage_sections','cms_blocks','pages','faqs'
  ] loop
    execute format('drop policy if exists %I on %I;', t || '_admin_read', t);
    execute format(
      'create policy %I on %I for select to authenticated using (is_admin());',
      t || '_admin_read', t);
  end loop;
end $$;

-- Customer PII & order ledgers: order permissions only.
do $$
declare t text;
begin
  foreach t in array array['orders','order_items','order_status_history','coupon_usage','notification_logs'] loop
    execute format('drop policy if exists %I on %I;', t || '_admin_read', t);
    execute format(
      'create policy %I on %I for select to authenticated
         using (is_admin() and (has_permission(''view_orders'') or has_permission(''manage_orders'')));',
      t || '_admin_read', t);
  end loop;
end $$;

drop policy if exists analytics_events_admin_read on analytics_events;
create policy analytics_events_admin_read on analytics_events for select to authenticated
  using (is_admin() and has_permission('view_analytics'));

drop policy if exists wishlist_items_admin_read on wishlist_items;
create policy wishlist_items_admin_read on wishlist_items for select to authenticated
  using (is_admin() and has_permission('view_analytics'));
-- idempotency_keys: no user-facing policy at all (service_role only).

-- ---------------------------------------------------------------------------
-- 3. Write policies — one owning permission per table
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('site_settings',       'manage_settings'),
      ('brands',              'manage_products'),
      ('categories',          'manage_products'),
      ('collections',         'manage_products'),
      ('fragrance_families',  'manage_products'),
      ('fragrance_notes',     'manage_products'),
      ('products',            'manage_products'),
      ('product_variants',    'manage_products'),
      ('product_images',      'manage_products'),
      ('product_categories',  'manage_products'),
      ('product_collections', 'manage_products'),
      ('product_notes',       'manage_products'),
      ('delivery_zones',      'manage_delivery'),
      ('coupons',             'manage_coupons'),
      ('coupon_products',     'manage_coupons'),
      ('coupon_categories',   'manage_coupons'),
      ('coupon_brands',       'manage_coupons'),
      ('promotions',          'manage_coupons'),
      ('reviews',             'manage_reviews'),
      ('homepage_sections',   'manage_cms'),
      ('cms_blocks',          'manage_cms'),
      ('pages',               'manage_cms'),
      ('faqs',                'manage_cms')
    ) as m(tbl, perm)
  loop
    execute format('drop policy if exists %I on %I;', r.tbl || '_admin_ins', r.tbl);
    execute format('drop policy if exists %I on %I;', r.tbl || '_admin_upd', r.tbl);
    execute format('drop policy if exists %I on %I;', r.tbl || '_admin_del', r.tbl);
    execute format(
      'create policy %I on %I for insert to authenticated with check (is_admin() and has_permission(%L));',
      r.tbl || '_admin_ins', r.tbl, r.perm);
    execute format(
      'create policy %I on %I for update to authenticated using (is_admin() and has_permission(%L)) with check (is_admin() and has_permission(%L));',
      r.tbl || '_admin_upd', r.tbl, r.perm, r.perm);
    execute format(
      'create policy %I on %I for delete to authenticated using (is_admin() and has_permission(%L));',
      r.tbl || '_admin_del', r.tbl, r.perm);
  end loop;
end $$;

-- orders: only the internal note is editable with a user JWT (manage_orders).
-- Status changes go through admin_update_order_status (state machine + stock).
drop policy if exists orders_admin_note on orders;
create policy orders_admin_note on orders for update to authenticated
  using (is_admin() and has_permission('manage_orders'))
  with check (is_admin() and has_permission('manage_orders'));

-- ---------------------------------------------------------------------------
-- 4. Table privileges: ledgers are RPC-only
-- ---------------------------------------------------------------------------
revoke insert, update, delete on
  orders, order_items, order_status_history, inventory_movements,
  idempotency_keys, coupon_usage, analytics_events, notification_logs,
  wishlist_items, admin_audit_logs
from authenticated;
revoke all on idempotency_keys from authenticated;
grant update (internal_note) on orders to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Variant guard: prices need manage_prices; stock only via the ledger
-- ---------------------------------------------------------------------------
-- current_user is 'authenticated' only for direct PostgREST writes made with a
-- user JWT; SECURITY DEFINER RPCs (create_order, adjust_inventory, the
-- reservation triggers) run as the function owner and are unaffected.
create or replace function trg_variant_admin_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not has_permission('manage_prices') then
      raise exception 'PRICE_PERMISSION_REQUIRED' using errcode = '42501';
    end if;
    if coalesce(new.reserved_quantity, 0) <> 0 then
      raise exception 'RESERVED_QUANTITY_READONLY' using errcode = '42501';
    end if;
    return new;
  end if;

  if (new.price is distinct from old.price or new.compare_at_price is distinct from old.compare_at_price)
     and not has_permission('manage_prices') then
    raise exception 'PRICE_PERMISSION_REQUIRED' using errcode = '42501';
  end if;
  if new.stock_quantity is distinct from old.stock_quantity
     or new.reserved_quantity is distinct from old.reserved_quantity then
    raise exception 'STOCK_LEDGER_ONLY' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_variant_admin_guard on product_variants;
create trigger trg_variant_admin_guard
  before insert or update on product_variants
  for each row execute function trg_variant_admin_guard();

-- ---------------------------------------------------------------------------
-- 6. Reviews: anon sees display columns only; one verified review per order
-- ---------------------------------------------------------------------------
revoke select on reviews from anon;
grant select (id, product_id, rating, title, body, display_name, status,
              is_verified_purchase, created_at)
  on reviews to anon;

create unique index if not exists uq_reviews_order_product
  on reviews(order_id, product_id) where order_id is not null;

-- ---------------------------------------------------------------------------
-- 7. Delivery zones must carry a city (orders take the city from the zone)
-- ---------------------------------------------------------------------------
update delivery_zones set city = name where coalesce(trim(city), '') = '';
alter table delivery_zones drop constraint if exists delivery_zones_city_present;
alter table delivery_zones add constraint delivery_zones_city_present check (length(trim(city)) > 0);

-- Keep 0019's lockdown for the new trigger function.
revoke execute on function trg_variant_admin_guard() from public, anon, authenticated;
