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

echo "==> ALL DB TESTS PASSED"
