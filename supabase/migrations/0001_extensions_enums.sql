-- =============================================================================
-- 0001 — Extensions, enums, and shared helpers
-- =============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid(), digest()
create extension if not exists citext;         -- case-insensitive text (emails, codes)
create extension if not exists pg_trgm;        -- trigram search for product search

-- ---------------------------------------------------------------------------
-- Enums (mirror config/constants.ts)
-- ---------------------------------------------------------------------------
create type order_status as enum (
  'PENDING','CONFIRMED','PREPARING','READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','FAILED','EXPIRED'
);

create type payment_method as enum ('COD','CARD','BANK_TRANSFER','ONLINE_PAYMENT');
create type payment_status as enum ('UNPAID','PAID','REFUNDED');

create type product_gender as enum ('MEN','WOMEN','UNISEX');
create type concentration as enum (
  'EAU_DE_PARFUM','EAU_DE_TOILETTE','PARFUM','EXTRAIT','PERFUME_OIL','OTHER'
);
create type season as enum ('SUMMER','WINTER','SPRING','AUTUMN','ALL_YEAR');
create type occasion as enum ('DAILY','WORK','FORMAL','EVENING','SPECIAL');
create type note_tier as enum ('TOP','HEART','BASE');

create type inventory_reason as enum (
  'SALE','RESTOCK','MANUAL_ADJUSTMENT','CANCELLATION','RETURN','CORRECTION'
);

create type review_status as enum ('PENDING','APPROVED','REJECTED');
create type coupon_type as enum ('PERCENTAGE','FIXED');
create type admin_role as enum ('owner','manager','staff');

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at fresh on any table that has the column.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Slug helper — used by admin UIs to suggest slugs (transliteration is left to
-- the app; this just normalises latin/ascii and dashes).
-- ---------------------------------------------------------------------------
create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input,'')), '[^a-z0-9؀-ۿ]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Human-friendly, non-sequential public order number, e.g. VEL-7K4P2X.
-- Uses an unambiguous alphabet (no 0/O/1/I) and checks for collisions.
-- ---------------------------------------------------------------------------
create or replace function gen_order_number()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := 'VEL-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    -- 'orders' is created in a later migration; guard with to_regclass.
    if to_regclass('public.orders') is null
       or not exists (select 1 from public.orders where public_order_number = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;
