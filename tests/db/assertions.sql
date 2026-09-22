-- =============================================================================
-- DB integration assertions. Run against a fresh migrated DB (see run-db-tests.sh).
-- Uses plpgsql ASSERT; any failure aborts with a clear message.
-- =============================================================================
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- PART 1 — Seed + business-logic assertions (as superuser; RLS bypassed)
-- ---------------------------------------------------------------------------
do $$
declare
  v_brand uuid; v_fam uuid; v_zone uuid; v_zone2 uuid;
  v_prod uuid; v_v50 uuid; v_v100 uuid;
  v_admin uuid;
  v_res jsonb; v_res2 jsonb;
  v_num text; v_num2 text;
  v_stock int;
begin
  -- seed taxonomy
  insert into brands (slug, name) values ('velmor','فيلمور') returning id into v_brand;
  insert into fragrance_families (slug, name) values ('woody','خشبية') returning id into v_fam;
  insert into delivery_zones (name, city, fee) values ('وسط بنغازي','بنغازي', 10) returning id into v_zone;
  insert into delivery_zones (name, city, fee) values ('ضواحي','بنغازي', 15) returning id into v_zone2;

  -- seed product + variants
  insert into products (slug, name, name_ar, brand_id, family_id, gender, concentration, season, active)
    values ('velmor-noir','VELMOR NOIR','فيلمور نوار', v_brand, v_fam, 'MEN','EAU_DE_PARFUM','WINTER', true)
    returning id into v_prod;
  insert into product_variants (product_id, size, unit, price, compare_at_price, stock_quantity)
    values (v_prod, 50,'ml', 150, 200, 20) returning id into v_v50;
  insert into product_variants (product_id, size, unit, price, stock_quantity)
    values (v_prod, 100,'ml', 250, 5) returning id into v_v100;
  insert into product_images (product_id, url, is_primary) values (v_prod, 'https://x/y.jpg', true);

  -- admin user (owner)
  insert into auth.users (id, email) values (gen_random_uuid(), 'owner@velmor.ly') returning id into v_admin;
  insert into admin_users (id, full_name, role, active) values (v_admin,'Owner','owner', true);

  -- ---- quote_order ----
  v_res := quote_order(
    jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',2)),
    v_zone, null, null);
  assert (v_res->>'subtotal')::numeric = 300, 'quote subtotal should be 300, got ' || (v_res->>'subtotal');
  assert (v_res->>'delivery_fee')::numeric = 10, 'quote fee should be 10';
  assert (v_res->>'total')::numeric = 310, 'quote total should be 310';
  assert (v_res->>'ok')::boolean, 'quote should be ok';

  -- ---- create_order (success) : price authority + totals ----
  v_res := create_order(jsonb_build_object(
      'customer_name','أحمد','phone','218911111111','city','بنغازي','address','شارع 1',
      'delivery_zone_id', v_zone,
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',2))
    ), 'idem-key-1');
  v_num := v_res->>'order_number';
  assert v_num like 'VEL-%', 'order number format';
  assert (v_res->>'subtotal')::numeric = 300, 'order subtotal 300';
  assert (v_res->>'total')::numeric = 310, 'order total 310';
  select stock_quantity into v_stock from product_variants where id = v_v50;
  assert v_stock = 18, 'stock should drop 20->18, got ' || v_stock;
  assert exists(select 1 from inventory_movements where order_id=(select id from orders where public_order_number=v_num) and reason='SALE'), 'SALE movement recorded';

  -- ---- idempotency: same key returns same order, no double decrement ----
  v_res2 := create_order(jsonb_build_object(
      'customer_name','أحمد','phone','218911111111','city','بنغازي','address','شارع 1',
      'delivery_zone_id', v_zone,
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',2))
    ), 'idem-key-1');
  assert (v_res2->>'order_number') = v_num, 'idempotent: same order number';
  select stock_quantity into v_stock from product_variants where id = v_v50;
  assert v_stock = 18, 'idempotent: stock unchanged at 18, got ' || v_stock;

  -- ---- out of stock rejected ----
  begin
    perform create_order(jsonb_build_object(
      'customer_name','x','phone','218922222222','city','بنغازي','address','y',
      'delivery_zone_id', v_zone,
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_v100,'quantity',999))
    ), 'idem-oos');
    assert false, 'expected OUT_OF_STOCK';
  exception when others then
    assert sqlerrm like 'OUT_OF_STOCK%', 'expected OUT_OF_STOCK, got: ' || sqlerrm;
  end;
  -- stock of v100 untouched (rollback)
  select stock_quantity into v_stock from product_variants where id = v_v100;
  assert v_stock = 5, 'v100 stock unchanged after failed order, got ' || v_stock;

  -- ---- coupon: percentage + min order + usage limit ----
  insert into coupons (code, type, value, min_order_amount, usage_limit, per_customer_limit)
    values ('WELCOME10','PERCENTAGE', 10, 100, 1, 1);
  v_res := quote_order(
    jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',2)), v_zone, 'WELCOME10', '218933333333');
  assert (v_res->>'discount')::numeric = 30, 'coupon 10% of 300 = 30, got ' || (v_res->>'discount');
  assert (v_res->>'total')::numeric = 280, 'coupon total = 300-30+10 = 280';

  -- min order not met
  insert into coupons (code, type, value, min_order_amount) values ('BIG','FIXED', 50, 100000);
  v_res := quote_order(jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',1)), v_zone, 'BIG', null);
  assert (v_res->>'discount')::numeric = 0, 'below min order -> no discount';
  assert (v_res->'coupon'->>'valid')::boolean = false, 'coupon invalid below min';

  -- create order using coupon, then usage limit blocks second use
  v_res := create_order(jsonb_build_object(
      'customer_name','ب','phone','218944444444','city','بنغازي','address','ز',
      'delivery_zone_id', v_zone, 'coupon_code','WELCOME10',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',2))
    ), 'idem-coupon-1');
  assert (v_res->>'discount_total')::numeric = 30, 'order used coupon discount 30';
  assert (select used_count from coupons where code='WELCOME10') = 1, 'coupon used_count incremented';
  -- second use exceeds usage_limit(1) -> coupon dropped, full price
  v_res := create_order(jsonb_build_object(
      'customer_name','ج','phone','218955555555','city','بنغازي','address','ح',
      'delivery_zone_id', v_zone, 'coupon_code','WELCOME10',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_v50,'quantity',2))
    ), 'idem-coupon-2');
  assert (v_res->>'discount_total')::numeric = 0, 'coupon over usage limit -> no discount';

  -- ---- status transitions + inventory restore exactly once ----
  set local request.jwt.claim.sub = '';  -- reset
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  select stock_quantity into v_stock from product_variants where id = v_v50; -- current after 3 sales of 2 = 20-2-2-2=14
  assert v_stock = 14, 'stock after three 2-unit orders should be 14, got ' || v_stock;

  -- invalid transition rejected
  begin
    perform admin_update_order_status((select id from orders where public_order_number=v_num), 'DELIVERED', null, false);
    assert false, 'expected INVALID_TRANSITION (PENDING->DELIVERED)';
  exception when others then
    assert sqlerrm like 'INVALID_TRANSITION%', 'expected INVALID_TRANSITION, got ' || sqlerrm;
  end;

  -- valid path then cancel restores stock exactly once
  perform admin_update_order_status((select id from orders where public_order_number=v_num), 'CONFIRMED', null, false);
  perform admin_update_order_status((select id from orders where public_order_number=v_num), 'CANCELLED', 'customer changed mind', false);
  select stock_quantity into v_stock from product_variants where id = v_v50;
  assert v_stock = 16, 'cancel restores 2 units: 14->16, got ' || v_stock;
  -- attempting to "cancel again" via override must NOT double-restore
  perform admin_update_order_status((select id from orders where public_order_number=v_num), 'EXPIRED', 'force', true);
  select stock_quantity into v_stock from product_variants where id = v_v50;
  assert v_stock = 16, 'no double restore: still 16, got ' || v_stock;

  -- ---- track_order requires number + phone ----
  v_res := track_order(v_num, '218911111111');
  assert v_res is not null, 'track with correct phone returns order';
  assert (v_res->>'order_number') = v_num, 'tracked order number matches';
  assert v_res ? 'internal_note' = false, 'tracking must NOT expose internal_note';
  assert track_order(v_num, '000') is null, 'wrong phone -> null (no enumeration)';
  assert track_order('VEL-NOPE1', '218911111111') is null, 'wrong number -> null';

  raise notice 'PART 1 (business logic): ALL ASSERTIONS PASSED';
end $$;

-- ---------------------------------------------------------------------------
-- PART 2 — RLS assertions (as the public 'anon' role)
-- ---------------------------------------------------------------------------
-- add an inactive product + a pending review to prove filtering
insert into products (slug, name, active) values ('hidden','HIDDEN', false);
insert into reviews (product_id, rating, status)
  select id, 5, 'PENDING' from products where slug='velmor-noir';
insert into reviews (product_id, rating, status)
  select id, 4, 'APPROVED' from products where slug='velmor-noir';

do $$
declare v_cnt int; v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;

  -- only active, non-archived products are visible
  select count(*) into v_cnt from products;
  assert v_cnt = 1, 'anon should see exactly 1 active product, got ' || v_cnt;

  -- only APPROVED reviews visible
  select count(*) into v_cnt from reviews;
  assert v_cnt = 1, 'anon should see only 1 approved review, got ' || v_cnt;

  -- anon cannot read exact stock (column not granted)
  begin
    perform stock_quantity from product_variants limit 1;
    assert false, 'anon must NOT read stock_quantity';
  exception when insufficient_privilege then
    null; -- expected
  end;

  -- but the stock bucket IS readable
  perform stock_status from product_variants limit 1;

  -- anon cannot read orders at all
  begin
    perform 1 from orders limit 1;
    assert false, 'anon must NOT read orders';
  exception when insufficient_privilege then
    null; -- expected
  end;

  -- anon cannot read coupons
  begin
    perform 1 from coupons limit 1;
    assert false, 'anon must NOT read coupons';
  exception when insufficient_privilege then
    null;
  end;

  reset role;
  raise notice 'PART 2 (RLS): ALL ASSERTIONS PASSED';
end $$;

-- ---------------------------------------------------------------------------
-- PART 3 — Admin RPCs (0015) as the owner (authenticated role + jwt sub)
-- ---------------------------------------------------------------------------
do $$
declare
  v_admin uuid;
  v_var uuid;
  v_prev int; v_new int;
  v_metrics jsonb;
  v_cust jsonb;
  v_before int; v_after int;
begin
  select id into v_admin from admin_users where role = 'owner' limit 1;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  set local role authenticated;

  -- log_admin_action appends exactly one row
  select count(*) into v_before from admin_audit_logs;
  perform log_admin_action('test', 'products', null, null, jsonb_build_object('x', 1), 'unit test');
  select count(*) into v_after from admin_audit_logs;
  assert v_after = v_before + 1, 'log_admin_action should append one audit row';

  -- admin_adjust_inventory changes stock atomically + writes ledger
  select id into v_var from product_variants order by created_at limit 1;
  select stock_quantity into v_prev from product_variants where id = v_var;
  v_new := admin_adjust_inventory(v_var, 5, 'RESTOCK', 'unit test restock');
  assert v_new = v_prev + 5, 'admin_adjust_inventory should add 5, got ' || v_new;
  assert exists(select 1 from inventory_movements where variant_id = v_var and reason = 'RESTOCK'),
    'RESTOCK movement recorded';

  -- reserved reasons (SALE/CANCELLATION) are rejected for manual adjust
  begin
    perform admin_adjust_inventory(v_var, -1, 'SALE', null);
    assert false, 'SALE reason must be rejected for manual adjust';
  exception when others then
    assert sqlerrm like 'RESERVED_REASON%', 'expected RESERVED_REASON, got ' || sqlerrm;
  end;

  -- dashboard metrics + customers aggregate return sane shapes
  v_metrics := admin_dashboard_metrics();
  assert (v_metrics->>'orders_total')::int >= 1, 'metrics orders_total should be >= 1';
  assert v_metrics ? 'revenue_realised', 'metrics must include revenue_realised';
  assert v_metrics ? 'low_stock', 'metrics must include low_stock';

  v_cust := admin_customers(null, 10, 0);
  assert (v_cust->>'total')::int >= 1, 'customers total should be >= 1';

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  raise notice 'PART 3 (admin RPCs): ALL ASSERTIONS PASSED';
end $$;

-- A logged-in NON-admin must be refused by the internal guards (42501).
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role authenticated;
  begin
    perform admin_dashboard_metrics();
    assert false, 'non-admin must be refused from admin_dashboard_metrics';
  exception when insufficient_privilege then
    null; -- expected: NOT_AUTHORIZED (42501)
  end;
  reset role;
  raise notice 'PART 3b (authz): non-admin correctly refused';
end $$;

-- ---------------------------------------------------------------------------
-- PART 4 — Notification outbox (0016): every order creation queues a row
-- ---------------------------------------------------------------------------
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from notification_logs where event = 'order_received' and status = 'QUEUED';
  assert v_cnt >= 1, 'expected >=1 queued order_received notification, got ' || v_cnt;
  raise notice 'PART 4 (notifications outbox): ALL ASSERTIONS PASSED (% queued)', v_cnt;
end $$;

select 'DB ASSERTIONS PASSED' as result;
