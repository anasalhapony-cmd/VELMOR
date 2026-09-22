-- =============================================================================
-- 0005 — Inventory ledger (movement history)
-- =============================================================================
-- product_variants.stock_quantity is the authoritative current count.
-- Every change to it is recorded here as an auditable movement. The unique
-- guards make SALE and CANCELLATION each idempotent per (order, variant),
-- which is the DB-level backstop against double-decrement / double-restore.

create table inventory_movements (
  id                uuid primary key default gen_random_uuid(),
  variant_id        uuid not null references product_variants(id) on delete cascade,
  previous_quantity int not null,
  change            int not null,
  new_quantity      int not null check (new_quantity >= 0),
  reason            inventory_reason not null,
  order_id          uuid,        -- FK added in 0006 once orders exists
  admin_id          uuid references auth.users(id),
  note              text,
  created_at        timestamptz not null default now()
);
create index idx_inv_variant on inventory_movements(variant_id, created_at desc);
create index idx_inv_order    on inventory_movements(order_id);

-- Idempotency backstops: at most one SALE and one CANCELLATION per order+variant.
create unique index uq_inv_sale_once
  on inventory_movements(order_id, variant_id)
  where reason = 'SALE' and order_id is not null;
create unique index uq_inv_cancel_once
  on inventory_movements(order_id, variant_id)
  where reason = 'CANCELLATION' and order_id is not null;
