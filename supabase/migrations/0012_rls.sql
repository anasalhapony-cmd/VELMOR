-- =============================================================================
-- 0012 — Row-Level Security
-- =============================================================================
-- Model:
--   * Public (anon/authenticated) may only READ safe, active catalog rows.
--   * Admins (is_admin()) get full access to everything via the dashboard.
--   * All customer mutations (orders, reviews, wishlist, analytics, coupon
--     checks) go through server routes using SECURITY DEFINER functions or the
--     service-role key — so no public write policies are needed anywhere.
-- Anything without a matching permissive policy is denied by default.

create or replace function is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users a where a.id = auth.uid() and a.role = 'owner' and a.active);
$$;

-- Helper to DRY the "admin can do everything" policy.
-- (Written out per-table below for clarity/auditability.)

-- ---- enable RLS on every table -------------------------------------------
alter table admin_users          enable row level security;
alter table site_settings        enable row level security;
alter table brands               enable row level security;
alter table categories           enable row level security;
alter table collections          enable row level security;
alter table fragrance_families   enable row level security;
alter table fragrance_notes      enable row level security;
alter table delivery_zones       enable row level security;
alter table products             enable row level security;
alter table product_variants     enable row level security;
alter table product_images       enable row level security;
alter table product_categories   enable row level security;
alter table product_collections  enable row level security;
alter table product_notes        enable row level security;
alter table inventory_movements  enable row level security;
alter table orders               enable row level security;
alter table order_items          enable row level security;
alter table order_status_history enable row level security;
alter table idempotency_keys     enable row level security;
alter table coupons              enable row level security;
alter table coupon_products      enable row level security;
alter table coupon_categories    enable row level security;
alter table coupon_brands        enable row level security;
alter table coupon_usage         enable row level security;
alter table promotions           enable row level security;
alter table reviews              enable row level security;
alter table wishlist_items       enable row level security;
alter table homepage_sections    enable row level security;
alter table cms_blocks           enable row level security;
alter table pages                enable row level security;
alter table faqs                 enable row level security;
alter table analytics_events     enable row level security;
alter table admin_audit_logs     enable row level security;
alter table notification_logs    enable row level security;

-- ---- admin full-access policies -------------------------------------------
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
    execute format(
      'create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin());',
      t || '_admin_all', t);
  end loop;
end $$;

-- admin_users: readable by any admin; writable only by an owner.
create policy admin_users_read  on admin_users for select to authenticated using (is_admin());
create policy admin_users_write on admin_users for all    to authenticated using (is_owner()) with check (is_owner());

-- admin_audit_logs: append-only. Admins may read; nobody may update/delete.
-- (Inserts are performed by SECURITY DEFINER functions, which bypass RLS.)
create policy audit_admin_read on admin_audit_logs for select to authenticated using (is_admin());

-- ---- public read policies (safe, active rows only) ------------------------
create policy brands_public   on brands             for select to anon, authenticated using (active);
create policy cats_public     on categories         for select to anon, authenticated using (active);
create policy cols_public     on collections        for select to anon, authenticated using (active);
create policy fam_public      on fragrance_families for select to anon, authenticated using (active);
create policy notes_public    on fragrance_notes    for select to anon, authenticated using (active);
create policy zones_public    on delivery_zones     for select to anon, authenticated using (active);

create policy products_public on products for select to anon, authenticated
  using (active and not archived);

create policy variants_public on product_variants for select to anon, authenticated
  using (active and exists (
    select 1 from products p where p.id = product_id and p.active and not p.archived));

create policy images_public on product_images for select to anon, authenticated
  using (exists (
    select 1 from products p where p.id = product_id and p.active and not p.archived));

create policy pc_public   on product_categories  for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.active and not p.archived));
create policy pcol_public on product_collections for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.active and not p.archived));
create policy pn_public   on product_notes        for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.active and not p.archived));

-- Only APPROVED reviews are public.
create policy reviews_public on reviews for select to anon, authenticated
  using (status = 'APPROVED');

-- CMS: active sections/blocks (within schedule window), approved active pages.
create policy homepage_public on homepage_sections for select to anon, authenticated using (active);
create policy cms_blocks_public on cms_blocks for select to anon, authenticated
  using (active
    and (starts_at is null or now() >= starts_at)
    and (ends_at   is null or now() <= ends_at));
create policy pages_public on pages for select to anon, authenticated using (active and approved);
create policy faqs_public  on faqs  for select to anon, authenticated using (active);
create policy promos_public on promotions for select to anon, authenticated
  using (active
    and (starts_at is null or now() >= starts_at)
    and (ends_at   is null or now() <= ends_at));

-- Store settings: only non-private groups are public.
create policy settings_public on site_settings for select to anon, authenticated
  using (group_name in ('general','contact','social','homepage','delivery','features','seo'));
