-- =============================================================================
-- 0008 — Reviews (+ rating aggregate) and guest wishlist
-- =============================================================================

create table reviews (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references products(id) on delete cascade,
  rating               int not null check (rating between 1 and 5),
  title                text,
  body                 text,
  display_name         text,
  status               review_status not null default 'PENDING',
  is_verified_purchase boolean not null default false,
  order_id             uuid references orders(id) on delete set null,
  device_id            text,        -- guest identifier (anti-abuse / dedupe)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  approved_at          timestamptz,
  approved_by          uuid references auth.users(id)
);
create index idx_reviews_product on reviews(product_id, status, created_at desc);
create index idx_reviews_status  on reviews(status, created_at desc);
-- Anti-spam: at most one review per device per product.
create unique index uq_reviews_device_product
  on reviews(product_id, device_id) where device_id is not null;
create trigger trg_reviews_updated before update on reviews
  for each row execute function set_updated_at();

-- Maintain products.rating_avg / rating_count from APPROVED reviews only.
create or replace function refresh_product_rating(p_product_id uuid)
returns void
language sql
as $$
  update products p set
    rating_avg = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from reviews r
      where r.product_id = p_product_id and r.status = 'APPROVED'
    ), 0),
    rating_count = (
      select count(*) from reviews r
      where r.product_id = p_product_id and r.status = 'APPROVED'
    )
  where p.id = p_product_id;
$$;

create or replace function trg_reviews_aggregate()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_product_rating(old.product_id);
    return old;
  else
    perform refresh_product_rating(new.product_id);
    if tg_op = 'UPDATE' and new.product_id <> old.product_id then
      perform refresh_product_rating(old.product_id);
    end if;
    return new;
  end if;
end;
$$;
create trigger trg_reviews_agg
  after insert or update or delete on reviews
  for each row execute function trg_reviews_aggregate();

-- ---------------------------------------------------------------------------
-- Guest wishlist — device-based, no account required, no PII.
-- ---------------------------------------------------------------------------
create table wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  device_id  text not null,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (device_id, product_id)
);
create index idx_wishlist_device on wishlist_items(device_id);
