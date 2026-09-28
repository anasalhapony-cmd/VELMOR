-- =============================================================================
-- 0003 — Taxonomy: brands, categories, collections, fragrance families & notes,
--                  delivery zones
-- =============================================================================

create table brands (
  id              uuid primary key default gen_random_uuid(),
  slug            citext not null unique,
  name            text not null,
  name_en         text,
  description     text,
  logo_url        text,
  image_url       text,
  active          boolean not null default true,
  sort_order      int not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_brands_updated before update on brands
  for each row execute function set_updated_at();

-- Hierarchical categories (parent_id). Kept generic so the taxonomy can change.
create table categories (
  id              uuid primary key default gen_random_uuid(),
  slug            citext not null unique,
  name            text not null,
  name_en         text,
  description     text,
  image_url       text,
  parent_id       uuid references categories(id) on delete set null,
  active          boolean not null default true,
  sort_order      int not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id)
);
create index idx_categories_parent on categories(parent_id);
create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();

create table collections (
  id              uuid primary key default gen_random_uuid(),
  slug            citext not null unique,
  name            text not null,
  name_en         text,
  description     text,
  image_url       text,
  is_seasonal     boolean not null default false,
  active          boolean not null default true,
  sort_order      int not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_collections_updated before update on collections
  for each row execute function set_updated_at();

-- Fragrance family taxonomy is dynamic (oriental, woody, fresh, …).
create table fragrance_families (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  name_en     text,
  description text,
  image_url   text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_families_updated before update on fragrance_families
  for each row execute function set_updated_at();

-- Reusable fragrance notes (bergamot, oud, vanilla…). Assigned to products via
-- product_notes with a tier (top/heart/base).
create table fragrance_notes (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  name_en     text,
  icon_url    text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_notes_updated before update on fragrance_notes
  for each row execute function set_updated_at();

-- Delivery zones — configurable fees per city/area. Launch market: Benghazi.
create table delivery_zones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text not null,
  area        text,
  fee         numeric(12,3) not null default 0 check (fee >= 0),
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_delivery_zones_active on delivery_zones(active, sort_order);
create trigger trg_delivery_zones_updated before update on delivery_zones
  for each row execute function set_updated_at();
