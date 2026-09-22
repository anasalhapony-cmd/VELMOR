-- =============================================================================
-- 0007 — Coupons (+ scope + usage) and promotions
-- =============================================================================

create table coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               citext not null unique,
  type               coupon_type not null,
  value              numeric(12,3) not null check (value > 0),
  min_order_amount   numeric(12,3) not null default 0 check (min_order_amount >= 0),
  max_discount       numeric(12,3) check (max_discount is null or max_discount >= 0),
  starts_at          timestamptz,
  ends_at            timestamptz,
  usage_limit        int check (usage_limit is null or usage_limit >= 0),
  per_customer_limit int check (per_customer_limit is null or per_customer_limit >= 0),
  used_count         int not null default 0 check (used_count >= 0),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Percentage coupons must be within 0..100.
  constraint coupon_pct_range
    check (type <> 'PERCENTAGE' or (value > 0 and value <= 100)),
  constraint coupon_dates
    check (starts_at is null or ends_at is null or ends_at >= starts_at)
);
create trigger trg_coupons_updated before update on coupons
  for each row execute function set_updated_at();

-- Optional scope. If no scope rows exist for a coupon, it applies store-wide.
create table coupon_products (
  coupon_id  uuid not null references coupons(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (coupon_id, product_id)
);
create table coupon_categories (
  coupon_id   uuid not null references coupons(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (coupon_id, category_id)
);
create table coupon_brands (
  coupon_id uuid not null references coupons(id) on delete cascade,
  brand_id  uuid not null references brands(id) on delete cascade,
  primary key (coupon_id, brand_id)
);

-- Usage records power both the global usage_limit and the per-customer limit
-- (keyed by normalised phone, since checkout is account-free).
create table coupon_usage (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references coupons(id) on delete cascade,
  order_id   uuid not null references orders(id) on delete cascade,
  phone      text not null,
  created_at timestamptz not null default now(),
  unique (order_id)   -- one coupon applied per order
);
create index idx_coupon_usage_coupon on coupon_usage(coupon_id);
create index idx_coupon_usage_phone  on coupon_usage(coupon_id, phone);

-- Now wire orders.coupon_id -> coupons.
alter table orders
  add constraint orders_coupon_fk
  foreign key (coupon_id) references coupons(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Promotions — a clean, configurable foundation (sale/bundle/seasonal…).
-- Complex promo logic is intentionally deferred; config is stored as jsonb.
-- ---------------------------------------------------------------------------
create table promotions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'SALE',
  config      jsonb not null default '{}',
  starts_at   timestamptz,
  ends_at     timestamptz,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint promotions_dates
    check (starts_at is null or ends_at is null or ends_at >= starts_at)
);
create trigger trg_promotions_updated before update on promotions
  for each row execute function set_updated_at();
