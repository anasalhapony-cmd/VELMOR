-- =============================================================================
-- 0009 — CMS: homepage sections, content blocks, pages, FAQ
-- =============================================================================

-- Which homepage sections show, in what order. The renderer walks these.
create table homepage_sections (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- e.g. 'hero','best_sellers','perfume_finder'
  title       text not null default '',
  active      boolean not null default true,
  sort_order  int not null default 0,
  config      jsonb not null default '{}',  -- e.g. {"collection_id": "..."}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_homepage_sections_order on homepage_sections(active, sort_order);
create trigger trg_homepage_sections_updated before update on homepage_sections
  for each row execute function set_updated_at();

-- Generic content blocks: hero slides, announcement bar, brand story, why-velmor
-- cards, delivery info, brand statement. Grouped by section_key. Supports
-- scheduled visibility windows for seasonal campaigns without a redeploy.
create table cms_blocks (
  id          uuid primary key default gen_random_uuid(),
  section_key text not null,
  title       text,
  subtitle    text,
  body        text,
  image_url   text,
  cta_label   text,
  cta_href    text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cms_blocks_dates
    check (starts_at is null or ends_at is null or ends_at >= starts_at)
);
create index idx_cms_blocks_section on cms_blocks(section_key, active, sort_order);
create trigger trg_cms_blocks_updated before update on cms_blocks
  for each row execute function set_updated_at();

-- Legal / informational pages (privacy, terms, delivery, returns, about…).
-- Per the brief (§112): content is a clearly-marked placeholder and NOT shown
-- as official until an admin approves it. Unapproved pages are noindex.
create table pages (
  slug            citext primary key,
  title           text not null,
  body            text not null default '',
  is_placeholder  boolean not null default true,
  approved        boolean not null default false,
  noindex         boolean not null default true,
  active          boolean not null default true,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_pages_updated before update on pages
  for each row execute function set_updated_at();

create table faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_faqs_order on faqs(active, sort_order);
create trigger trg_faqs_updated before update on faqs
  for each row execute function set_updated_at();
