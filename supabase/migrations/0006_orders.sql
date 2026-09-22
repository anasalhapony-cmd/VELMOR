-- =============================================================================
-- 0006 — Orders, order items, status history, idempotency
-- =============================================================================

create table orders (
  id                  uuid primary key default gen_random_uuid(),
  public_order_number text not null unique default gen_order_number(),

  -- Customer (only what is needed to fulfil the order)
  customer_name  text not null check (length(trim(customer_name)) > 0),
  phone          text not null,                 -- normalised Libyan number (2189XXXXXXXX)
  whatsapp       text,
  city           text not null,
  area           text,
  address        text not null check (length(trim(address)) > 0),
  delivery_note  text,

  -- Delivery (zone id + snapshot of name/fee)
  delivery_zone_id   uuid references delivery_zones(id) on delete set null,
  delivery_zone_name text,

  -- Money — all server-computed. Stored, never recomputed from live prices.
  subtotal        numeric(12,3) not null check (subtotal >= 0),
  discount_total  numeric(12,3) not null default 0 check (discount_total >= 0),
  delivery_fee    numeric(12,3) not null default 0 check (delivery_fee >= 0),
  total           numeric(12,3) not null check (total >= 0),

  -- Coupon (id FK added in 0007; code snapshotted for history)
  coupon_id    uuid,
  coupon_code  text,

  payment_method payment_method not null default 'COD',
  payment_status payment_status not null default 'UNPAID',
  order_status   order_status   not null default 'PENDING',

  internal_note  text,   -- admin-only, never exposed to public tracking
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Integrity: total must equal the parts.
  constraint orders_total_consistent
    check (total = subtotal - discount_total + delivery_fee)
);
create index idx_orders_status  on orders(order_status, created_at desc);
create index idx_orders_created on orders(created_at desc);
create index idx_orders_phone   on orders(phone);
create index idx_orders_city    on orders(city);
create index idx_orders_coupon  on orders(coupon_id);
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- Order items snapshot everything needed for historical accuracy.
create table order_items (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references orders(id) on delete cascade,
  product_id             uuid references products(id) on delete set null,
  variant_id             uuid references product_variants(id) on delete set null,
  product_name_snapshot  text not null,
  variant_name_snapshot  text,
  size_snapshot          text,
  sku_snapshot           text,
  image_snapshot         text,
  unit_price_snapshot    numeric(12,3) not null check (unit_price_snapshot >= 0),
  quantity               int not null check (quantity > 0),
  line_discount          numeric(12,3) not null default 0 check (line_discount >= 0),
  line_total             numeric(12,3) not null check (line_total >= 0),
  created_at             timestamptz not null default now()
);
create index idx_order_items_order   on order_items(order_id);
create index idx_order_items_product on order_items(product_id);
create index idx_order_items_variant on order_items(variant_id);

-- Every status change is logged (state machine transitions).
create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  note        text,
  changed_by  uuid references auth.users(id),  -- null = system / customer action
  created_at  timestamptz not null default now()
);
create index idx_status_history_order on order_status_history(order_id, created_at);

-- Idempotency for order creation (double-click / retry / refresh safe).
create table idempotency_keys (
  key        text primary key,
  order_id   uuid references orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Now that orders exists, wire up inventory_movements.order_id.
alter table inventory_movements
  add constraint inventory_movements_order_fk
  foreign key (order_id) references orders(id) on delete set null;
