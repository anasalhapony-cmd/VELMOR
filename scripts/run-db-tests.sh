#!/usr/bin/env bash
# Recreate a clean DB, apply the local shim + all migrations, run the SQL
# assertions, then run a real concurrent "last unit" race test.
#
# Env: PGHOST (socket dir) PGPORT PGUSER PGDB  (defaults for the local sandbox)
set -euo pipefail

export PATH="/usr/lib/postgresql/16/bin:$PATH"
PGHOST="${PGHOST:-/tmp/pgsock}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-velmor}"
PGDB="${PGDB:-velmor_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -v ON_ERROR_STOP=1 -q"

echo "==> Rebuilding schema"
$PSQL -c "drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;" >/dev/null

echo "==> Applying shim + migrations"
$PSQL -f "$ROOT/scripts/_local_supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/0*.sql; do
  $PSQL -f "$f" >/dev/null
done

echo "==> Running SQL assertions"
$PSQL -f "$ROOT/tests/db/assertions.sql"

echo "==> Concurrency: 20 buyers race for the LAST unit (expect exactly 1 success)"
VID=$($PSQL -tAc "
  with b as (insert into brands(slug,name) values('race','race') returning id),
       p as (insert into products(slug,name,active) select 'race-prod','RACE',true returning id),
       v as (insert into product_variants(product_id,size,unit,price,stock_quantity)
             select p.id, 30,'ml', 99, 1 from p returning id)
  select id from v;")

pids=()
tmp=$(mktemp -d)
for i in $(seq 1 20); do
  (
    $PSQL -tAc "select (create_order(jsonb_build_object(
        'customer_name','r$i','phone','21890000$i','city','بنغازي','address','a',
        'delivery_zone_id',(select id from delivery_zones limit 1),
        'items', jsonb_build_array(jsonb_build_object('variant_id','$VID'::uuid,'quantity',1))
      ), 'race-$i'))->>'order_number';" >"$tmp/out.$i" 2>"$tmp/err.$i" || true
  ) &
  pids+=($!)
done
for pid in "${pids[@]}"; do wait "$pid"; done

SUCCESS=$(cat "$tmp"/out.* 2>/dev/null | grep -c 'VEL-' || true)
FINAL=$($PSQL -tAc "select stock_quantity from product_variants where id='$VID'::uuid;")
SALES=$($PSQL -tAc "select count(*) from inventory_movements where variant_id='$VID'::uuid and reason='SALE';")
rm -rf "$tmp"

echo "    successful orders : $SUCCESS  (expected 1)"
echo "    final stock       : $FINAL    (expected 0)"
echo "    SALE movements    : $SALES    (expected 1)"
if [ "$SUCCESS" = "1" ] && [ "$FINAL" = "0" ] && [ "$SALES" = "1" ]; then
  echo "==> RACE TEST PASSED (no oversell)"
else
  echo "==> RACE TEST FAILED"; exit 1
fi

echo "==> Concurrency: 20 buyers race for a coupon with usage_limit=1 (expect exactly 1 discount)"
CVID=$($PSQL -tAc "
  with p as (insert into products(slug,name,active) values('coupon-race','CR',true) returning id),
       v as (insert into product_variants(product_id,size,unit,price,stock_quantity)
             select p.id, 50,'ml', 100, 100 from p returning id)
  select id from v;")
$PSQL -c "insert into coupons(code,type,value,usage_limit) values('RACE1','FIXED',10,1);" >/dev/null
tmp=$(mktemp -d); pids=()
for i in $(seq 1 20); do
  (
    $PSQL -tAc "select (create_order(jsonb_build_object(
        'customer_name','c$i','phone','21891100$i','city','x','address','a',
        'delivery_zone_id',(select id from delivery_zones limit 1),'coupon_code','RACE1',
        'items', jsonb_build_array(jsonb_build_object('variant_id','$CVID'::uuid,'quantity',1))
      ), 'crace-$i'))->>'discount_total';" >"$tmp/out.$i" 2>"$tmp/err.$i" || true
  ) &
  pids+=($!)
done
for pid in "${pids[@]}"; do wait "$pid"; done
ORDERS=$(cat "$tmp"/out.* | grep -c . || true)
DISCOUNTED=$(cat "$tmp"/out.* | grep -c '^10' || true)
USED=$($PSQL -tAc "select used_count from coupons where code='RACE1';")
rm -rf "$tmp"
echo "    orders created    : $ORDERS  (expected 20)"
echo "    discounted orders : $DISCOUNTED   (expected 1)"
echo "    coupon used_count : $USED   (expected 1)"
if [ "$ORDERS" = "20" ] && [ "$DISCOUNTED" = "1" ] && [ "$USED" = "1" ]; then
  echo "==> COUPON RACE TEST PASSED (usage limit holds)"
else
  echo "==> COUPON RACE TEST FAILED"; exit 1
fi

echo "==> Concurrency: 10 simultaneous submits with the SAME idempotency key (expect 1 order)"
IVID=$($PSQL -tAc "
  with p as (insert into products(slug,name,active) values('idem-race','IR',true) returning id),
       v as (insert into product_variants(product_id,size,unit,price,stock_quantity)
             select p.id, 50,'ml', 100, 50 from p returning id)
  select id from v;")
tmp=$(mktemp -d); pids=()
for i in $(seq 1 10); do
  (
    $PSQL -tAc "select (create_order(jsonb_build_object(
        'customer_name','i','phone','218922222222','city','x','address','a',
        'delivery_zone_id',(select id from delivery_zones limit 1),
        'items', jsonb_build_array(jsonb_build_object('variant_id','$IVID'::uuid,'quantity',1))
      ), 'same-key-1'))->>'order_number';" >"$tmp/out.$i" 2>"$tmp/err.$i" || true
  ) &
  pids+=($!)
done
for pid in "${pids[@]}"; do wait "$pid"; done
RESPONSES=$(cat "$tmp"/out.* | grep -c 'VEL-' || true)
DISTINCT=$(cat "$tmp"/out.* | grep 'VEL-' | sort -u | wc -l)
IORDERS=$($PSQL -tAc "select count(*) from orders where phone='218922222222';")
rm -rf "$tmp"
echo "    successful responses : $RESPONSES (expected 10)"
echo "    distinct order nos   : $DISTINCT  (expected 1)"
echo "    orders in DB         : $IORDERS  (expected 1)"
if [ "$RESPONSES" = "10" ] && [ "$DISTINCT" = "1" ] && [ "$IORDERS" = "1" ]; then
  echo "==> IDEMPOTENCY RACE TEST PASSED (no duplicate orders)"
else
  echo "==> IDEMPOTENCY RACE TEST FAILED"; exit 1
fi

echo "==> ALL DB TESTS PASSED"
