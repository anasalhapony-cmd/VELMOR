-- =============================================================================
-- 0004 — Products, variants, images, and product ↔ taxonomy joins
-- =============================================================================

create table products (
  id                uuid primary key default gen_random_uuid(),
  slug              citext not null unique,
  name              text not null,                 -- display name, e.g. "VELMOR NOIR"
  name_ar           text,                          -- Arabic name
  brand_id          uuid references brands(id) on delete set null,
  family_id         uuid references fragrance_families(id) on delete set null,
  gender            product_gender,
  concentration     concentration,
  season            season,
  occasions         occasion[] not null default '{}',
  short_description text,
  description       text,
  longevity         int check (longevity between 1 and 5),
  sillage           int check (sillage between 1 and 5),
  video_url         text,
  is_featured       boolean not null default false,
  is_new_arrival    boolean not null default false,
  is_best_seller    boolean not null default false,
  active            boolean not null default true,
  archived          boolean not null default false, -- soft delete; never hard-delete referenced products
  sort_order        int not null default 0,
  rating_avg        numeric(3,2) not null default 0,
  rating_count      int not null default 0,
  sales_count       int not null default 0,         -- maintained on delivery for best-seller sort
  seo_title         text,
  seo_description   text,
  og_image_url      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Concatenated text for trigram search (name + Arabic name + short desc).
  search_text       text generated always as (
                      coalesce(name,'') || ' ' || coalesce(name_ar,'') || ' ' ||
                      coalesce(short_description,'')
                    ) stored
);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

create index idx_products_active   on products(active, archived);
create index idx_products_brand    on products(brand_id);
create index idx_products_family   on products(family_id);
create index idx_products_featured on products(is_featured) where is_featured;
create index idx_products_new      on products(is_new_arrival) where is_new_arrival;
create index idx_products_best     on products(is_best_seller) where is_best_seller;
create index idx_products_sort     on products(sort_order, created_at desc);
create index idx_products_search   on products using gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Variants — first-class records (size/price/stock). Never JSON blobs.
-- ---------------------------------------------------------------------------
create table product_variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id) on delete cascade,
  size              numeric(8,2) not null check (size > 0),
  unit              text not null default 'ml',
  sku               citext,
  barcode           citext,
  price             numeric(12,3) not null check (price > 0),
  compare_at_price  numeric(12,3) check (compare_at_price is null or compare_at_price >= price),
  stock_quantity    int not null default 0 check (stock_quantity >= 0),
  weight_grams      int check (weight_grams is null or weight_grams >= 0),
  active            boolean not null default true,
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (product_id, size, unit)
);
create unique index uq_variants_sku     on product_variants(sku)     where sku is not null;
create unique index uq_variants_barcode on product_variants(barcode) where barcode is not null;
create index idx_variants_product on product_variants(product_id, position);
create index idx_variants_active  on product_variants(product_id) where active;
create trigger trg_variants_updated before update on product_variants
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Images (Supabase Storage URLs). One primary image per product.
-- ---------------------------------------------------------------------------
create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  alt         text,
  is_primary  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_images_product on product_images(product_id, sort_order);
create unique index uq_images_one_primary on product_images(product_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Join tables
-- ---------------------------------------------------------------------------
create table product_categories (
  product_id  uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index idx_pc_category on product_categories(category_id);

create table product_collections (
  product_id    uuid not null references products(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);
create index idx_pcol_collection on product_collections(collection_id);

create table product_notes (
  product_id  uuid not null references products(id) on delete cascade,
  note_id     uuid not null references fragrance_notes(id) on delete cascade,
  tier        note_tier not null,
  position    int not null default 0,
  primary key (product_id, note_id, tier)
);
create index idx_pn_note on product_notes(note_id);
create index idx_pn_product on product_notes(product_id, tier, position);
