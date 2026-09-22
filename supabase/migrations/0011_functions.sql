-- =============================================================================
-- 0011 — Server-authoritative functions (pricing, inventory, orders, tracking)
-- =============================================================================
-- These functions are the ONLY sanctioned path for money and stock changes.
-- The Next.js server calls them with the service-role client after validating +
-- rate-limiting the request. They never trust client-supplied prices/totals.

-- ---------------------------------------------------------------------------
-- adjust_inventory: the single choke point for stock changes. Locks the variant
-- row, enforces non-negative stock, writes the ledger movement. Returns new qty.
-- ---------------------------------------------------------------------------
create or replace function adjust_inventory(
  p_variant_id uuid,
  p_change     int,
  p_reason     inventory_reason,
  p_order_id   uuid default null,
  p_admin_id   uuid default null,
  p_note       text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev int;
  v_new  int;
begin
  select stock_quantity into v_prev
  from product_variants
  where id = p_variant_id
  for update;

  if not found then
    raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_new := v_prev + p_change;
  if v_new < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  update product_variants set stock_quantity = v_new where id = p_variant_id;

  insert into inventory_movements
    (variant_id, previous_quantity, change, new_quantity, reason, order_id, admin_id, note)
  values
    (p_variant_id, v_prev, p_change, v_new, p_reason, p_order_id, p_admin_id, p_note);

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- _apply_coupon: validate a coupon and compute its discount from precomputed
-- subtotals. Pure validation logic shared by quote_order and create_order.
-- ---------------------------------------------------------------------------
create or replace function _apply_coupon(
  p_code     text,
  p_phone    text,
  p_subtotal numeric,
  p_eligible numeric
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c            coupons%rowtype;
  v_discount   numeric := 0;
  v_used_by    int;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'NO_CODE', 'discount', 0);
  end if;

  select * into c from coupons where code = trim(p_code);
  if not found or not c.active then
    return jsonb_build_object('valid', false, 'reason', 'INVALID', 'discount', 0);
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('valid', false, 'reason', 'NOT_STARTED', 'discount', 0);
  end if;
  if c.ends_at is not null and now() > c.ends_at then
    return jsonb_build_object('valid', false, 'reason', 'EXPIRED', 'discount', 0);
  end if;
  if p_subtotal < c.min_order_amount then
    return jsonb_build_object('valid', false, 'reason', 'MIN_ORDER',
      'min', c.min_order_amount, 'discount', 0);
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'USAGE_LIMIT', 'discount', 0);
  end if;
  if c.per_customer_limit is not null and p_phone is not null then
    select count(*) into v_used_by from coupon_usage
      where coupon_id = c.id and phone = p_phone;
    if v_used_by >= c.per_customer_limit then
      return jsonb_build_object('valid', false, 'reason', 'PER_CUSTOMER_LIMIT', 'discount', 0);
    end if;
  end if;
  if coalesce(p_eligible, 0) <= 0 then
    return jsonb_build_object('valid', false, 'reason', 'NO_ELIGIBLE_ITEMS', 'discount', 0);
  end if;

  if c.type = 'PERCENTAGE' then
    v_discount := round(p_eligible * c.value / 100.0, 3);
    if c.max_discount is not null then
      v_discount := least(v_discount, c.max_discount);
    end if;
  else -- FIXED
    v_discount := least(c.value, p_eligible);
  end if;

  v_discount := least(v_discount, p_subtotal);  -- never exceed subtotal

  return jsonb_build_object(
    'valid', true, 'reason', 'OK', 'coupon_id', c.id,
    'code', c.code::text, 'discount', v_discount
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- eligible subtotal for a coupon's scope given a set of items.
-- If the coupon has no scope rows, the whole subtotal is eligible.
-- ---------------------------------------------------------------------------
create or replace function _eligible_subtotal(p_coupon_id uuid, p_items jsonb)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has_scope boolean;
  v_total numeric := 0;
begin
  select exists(select 1 from coupon_products  where coupon_id = p_coupon_id)
      or exists(select 1 from coupon_categories where coupon_id = p_coupon_id)
      or exists(select 1 from coupon_brands     where coupon_id = p_coupon_id)
    into v_has_scope;

  if not v_has_scope then
    select coalesce(sum(v.price * i.quantity), 0) into v_total
    from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity int)
    join product_variants v on v.id = i.variant_id;
    return v_total;
  end if;

  select coalesce(sum(v.price * i.quantity), 0) into v_total
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity int)
  join product_variants v on v.id = i.variant_id
  join products p on p.id = v.product_id
  where p.id in (select product_id from coupon_products where coupon_id = p_coupon_id)
     or p.brand_id in (select brand_id from coupon_brands where coupon_id = p_coupon_id)
     or exists (
        select 1 from product_categories pc
        where pc.product_id = p.id
          and pc.category_id in (select category_id from coupon_categories where coupon_id = p_coupon_id)
     );
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- quote_order: READ-ONLY price quote for the checkout preview and coupon
-- validation. Uses current authoritative prices. Never mutates.
-- ---------------------------------------------------------------------------
create or replace function quote_order(
  p_items jsonb,
  p_zone  uuid default null,
  p_code  text default null,
  p_phone text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_fee      numeric := 0;
  v_lines    jsonb;
  v_coupon   jsonb;
  v_coupon_id uuid;
  v_eligible numeric := 0;
  v_discount numeric := 0;
  v_all_ok   boolean;
begin
  -- Build line breakdown from current prices; flag availability.
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'variant_id', v.id,
      'product_id', p.id,
      'name', p.name,
      'name_ar', p.name_ar,
      'size', v.size, 'unit', v.unit,
      'unit_price', v.price,
      'quantity', i.quantity,
      'line_total', v.price * i.quantity,
      'available', (v.active and p.active and not p.archived and v.stock_quantity >= i.quantity)
    ) order by p.name), '[]'::jsonb),
    coalesce(sum(v.price * i.quantity), 0),
    bool_and(v.active and p.active and not p.archived and v.stock_quantity >= i.quantity)
  into v_lines, v_subtotal, v_all_ok
  from jsonb_to_recordset(p_items) as i(variant_id uuid, quantity int)
  join product_variants v on v.id = i.variant_id
  join products p on p.id = v.product_id;

  if p_zone is not null then
    select fee into v_fee from delivery_zones where id = p_zone and active;
    v_fee := coalesce(v_fee, 0);
  end if;

  if p_code is not null and length(trim(p_code)) > 0 then
    select id into v_coupon_id from coupons where code = trim(p_code);
    if v_coupon_id is not null then
      v_eligible := _eligible_subtotal(v_coupon_id, p_items);
    end if;
    v_coupon := _apply_coupon(p_code, p_phone, v_subtotal, v_eligible);
    if (v_coupon->>'valid')::boolean then
      v_discount := (v_coupon->>'discount')::numeric;
    end if;
  end if;

  return jsonb_build_object(
    'ok', coalesce(v_all_ok, false),
    'items', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'delivery_fee', v_fee,
    'total', greatest(v_subtotal - v_discount + v_fee, 0),
    'coupon', v_coupon
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order: ATOMIC order creation. Locks each variant, revalidates prices &
-- stock, decrements inventory, snapshots everything, generates a public order
-- number, records status history + coupon usage, and is idempotent by key.
-- Any failure raises -> the whole function rolls back (no partial order/stock).
-- Returns SAFE customer-facing order JSON.
-- ---------------------------------------------------------------------------
create or replace function create_order(p_payload jsonb, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing   uuid;
  v_order_id   uuid;
  v_number     text;
  v_item       jsonb;
  v_variant    product_variants%rowtype;
  v_product    products%rowtype;
  v_subtotal   numeric := 0;
  v_eligible   numeric := 0;
  v_discount   numeric := 0;
  v_fee        numeric := 0;
  v_zone_name  text;
  v_coupon_id  uuid;
  v_coupon_res jsonb;
  v_phone      text := p_payload->>'phone';
  v_zone       uuid := nullif(p_payload->>'delivery_zone_id','')::uuid;
  v_code       text := nullif(p_payload->>'coupon_code','');
  v_pay        payment_method := coalesce((p_payload->>'payment_method')::payment_method, 'COD');
  v_items      jsonb := p_payload->'items';
  v_line_total numeric;
  v_img        text;
begin
  -- Idempotency: return the already-created order if this key was seen.
  if p_idempotency_key is not null then
    select order_id into v_existing from idempotency_keys where key = p_idempotency_key;
    if v_existing is not null then
      return get_order_public(v_existing);
    end if;
  end if;

  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0003';
  end if;

  -- Delivery zone (fee is authoritative, from DB).
  if v_zone is not null then
    select fee, name into v_fee, v_zone_name from delivery_zones where id = v_zone and active;
    if not found then
      raise exception 'INVALID_DELIVERY_ZONE' using errcode = 'P0004';
    end if;
  else
    raise exception 'DELIVERY_ZONE_REQUIRED' using errcode = 'P0004';
  end if;

  -- Create the order shell first (needed for FKs on items / movements).
  v_number := gen_order_number();
  insert into orders (
    public_order_number, customer_name, phone, whatsapp, city, area, address,
    delivery_note, delivery_zone_id, delivery_zone_name,
    subtotal, discount_total, delivery_fee, total, payment_method, order_status
  ) values (
    v_number,
    p_payload->>'customer_name', v_phone, nullif(p_payload->>'whatsapp',''),
    p_payload->>'city', nullif(p_payload->>'area',''), p_payload->>'address',
    nullif(p_payload->>'delivery_note',''), v_zone, v_zone_name,
    0, 0, v_fee, v_fee, v_pay, 'PENDING'
  ) returning id into v_order_id;

  -- Walk items: lock variant, validate, decrement stock, snapshot.
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    select * into v_variant from product_variants
      where id = (v_item->>'variant_id')::uuid
      for update;                                   -- serialises final-unit races
    if not found or not v_variant.active then
      raise exception 'VARIANT_UNAVAILABLE:%', (v_item->>'variant_id') using errcode = 'P0005';
    end if;

    select * into v_product from products where id = v_variant.product_id;
    if not found or not v_product.active or v_product.archived then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_variant.product_id using errcode = 'P0005';
    end if;

    if v_variant.stock_quantity < (v_item->>'quantity')::int then
      raise exception 'OUT_OF_STOCK:%', v_variant.id using errcode = 'P0001';
    end if;

    -- Decrement stock atomically + ledger (SALE). Unique guard blocks re-runs.
    perform adjust_inventory(
      v_variant.id, -((v_item->>'quantity')::int), 'SALE', v_order_id, null,
      'order ' || v_number
    );

    v_line_total := v_variant.price * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_total;

    select url into v_img from product_images
      where product_id = v_product.id and is_primary limit 1;

    insert into order_items (
      order_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot,
      size_snapshot, sku_snapshot, image_snapshot, unit_price_snapshot, quantity,
      line_discount, line_total
    ) values (
      v_order_id, v_product.id, v_variant.id,
      coalesce(v_product.name_ar, v_product.name),
      (v_variant.size::text || ' ' || v_variant.unit),
      (v_variant.size::text || ' ' || v_variant.unit),
      v_variant.sku, v_img, v_variant.price, (v_item->>'quantity')::int,
      0, v_line_total
    );
  end loop;

  -- Coupon (validated against authoritative subtotal + scope).
  if v_code is not null then
    select id into v_coupon_id from coupons where code = v_code;
    if v_coupon_id is not null then
      v_eligible := _eligible_subtotal(v_coupon_id, v_items);
    end if;
    v_coupon_res := _apply_coupon(v_code, v_phone, v_subtotal, v_eligible);
    if (v_coupon_res->>'valid')::boolean then
      v_discount := (v_coupon_res->>'discount')::numeric;
      v_coupon_id := (v_coupon_res->>'coupon_id')::uuid;
    else
      v_coupon_id := null;   -- silently drop an invalid coupon at creation
    end if;
  end if;

  -- Finalise totals on the order.
  update orders set
    subtotal = v_subtotal,
    discount_total = v_discount,
    delivery_fee = v_fee,
    total = greatest(v_subtotal - v_discount + v_fee, 0),
    coupon_id = v_coupon_id,
    coupon_code = case when v_coupon_id is not null then v_code else null end
  where id = v_order_id;

  -- Record coupon usage + bump counter.
  if v_coupon_id is not null then
    insert into coupon_usage (coupon_id, order_id, phone) values (v_coupon_id, v_order_id, v_phone);
    update coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  -- Initial status history + idempotency record + analytics.
  insert into order_status_history (order_id, from_status, to_status, note)
    values (v_order_id, null, 'PENDING', 'order created');

  if p_idempotency_key is not null then
    insert into idempotency_keys (key, order_id) values (p_idempotency_key, v_order_id);
  end if;

  insert into analytics_events (event_type, meta)
    values ('order_completed', jsonb_build_object('order_number', v_number, 'total', v_subtotal - v_discount + v_fee));

  return get_order_public(v_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_order_public: SAFE customer-facing projection of an order (no internal
-- ids, no internal notes, no admin data).
-- ---------------------------------------------------------------------------
create or replace function get_order_public(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_number', o.public_order_number,
    'status', o.order_status,
    'payment_method', o.payment_method,
    'subtotal', o.subtotal,
    'discount_total', o.discount_total,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'created_at', o.created_at,
    'delivery', jsonb_build_object('city', o.city, 'area', o.area, 'zone', o.delivery_zone_name),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', oi.product_name_snapshot,
        'variant', oi.variant_name_snapshot,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price_snapshot,
        'line_total', oi.line_total,
        'image', oi.image_snapshot
      )) from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.to_status, 'at', h.created_at) order by h.created_at)
      from order_status_history h where h.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------------------
-- track_order: customer tracking. Requires BOTH order number AND phone; returns
-- null on any mismatch (no enumeration). Rate limiting is enforced at the app.
-- ---------------------------------------------------------------------------
create or replace function track_order(p_number text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from orders
    where public_order_number = upper(trim(p_number))
      and phone = trim(p_phone);
  if not found then
    return null;   -- do not reveal whether the number exists
  end if;
  return get_order_public(v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_update_order_status: guarded state-machine transition. Validates the
-- transition, logs history + audit, and restores inventory exactly once on
-- terminal cancellation (CANCELLED/EXPIRED). Marks COD paid on DELIVERED and
-- bumps sales_count for best-seller sorting.
-- ---------------------------------------------------------------------------
create or replace function admin_update_order_status(
  p_order_id uuid,
  p_to       order_status,
  p_note     text default null,
  p_override boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from order_status;
  v_valid boolean;
  v_item  record;
begin
  if not (is_admin() and has_permission('manage_orders')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select order_status into v_from from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_from = p_to then
    return get_order_public(p_order_id);
  end if;

  -- Validate transition (owners may override).
  v_valid := case v_from
    when 'PENDING'            then p_to in ('CONFIRMED','CANCELLED','EXPIRED')
    when 'CONFIRMED'          then p_to in ('PREPARING','CANCELLED')
    when 'PREPARING'          then p_to in ('READY_FOR_DELIVERY','CANCELLED')
    when 'READY_FOR_DELIVERY' then p_to in ('OUT_FOR_DELIVERY','CANCELLED')
    when 'OUT_FOR_DELIVERY'   then p_to in ('DELIVERED','FAILED')
    when 'FAILED'             then p_to in ('OUT_FOR_DELIVERY','CANCELLED')
    else false
  end;

  if not v_valid and not (p_override and has_permission('manage_orders')) then
    raise exception 'INVALID_TRANSITION:%->%', v_from, p_to using errcode = 'P0006';
  end if;

  update orders set order_status = p_to where id = p_order_id;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
    values (p_order_id, v_from, p_to, p_note, auth.uid());

  -- Restore inventory exactly once on terminal cancellation.
  if p_to in ('CANCELLED','EXPIRED') then
    for v_item in
      select variant_id, quantity from order_items
      where order_id = p_order_id and variant_id is not null
    loop
      -- Skip if already restored (idempotent; unique index is the hard guard).
      if not exists (
        select 1 from inventory_movements
        where order_id = p_order_id and variant_id = v_item.variant_id and reason = 'CANCELLATION'
      ) then
        perform adjust_inventory(
          v_item.variant_id, v_item.quantity, 'CANCELLATION', p_order_id, auth.uid(),
          'order cancelled'
        );
      end if;
    end loop;
  end if;

  -- On delivery: COD becomes paid, bump sales counters for best-seller ranking.
  if p_to = 'DELIVERED' then
    update orders set payment_status = 'PAID' where id = p_order_id and payment_method = 'COD';
    update products p set sales_count = sales_count + oi.qty
    from (
      select product_id, sum(quantity) as qty from order_items
      where order_id = p_order_id and product_id is not null group by product_id
    ) oi
    where p.id = oi.product_id;
  end if;

  insert into admin_audit_logs (admin_id, action, entity, entity_id, previous_value, new_value, reason)
    values (auth.uid(), 'status_change', 'orders', p_order_id::text,
            jsonb_build_object('status', v_from), jsonb_build_object('status', p_to), p_note);

  return get_order_public(p_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- search_products: trigram search over name/Arabic name/short desc + brand name
-- + note names. Returns safe card fields only. Read-only.
-- ---------------------------------------------------------------------------
create or replace function search_products(p_query text, p_limit int default 12)
returns table (
  id uuid, slug citext, name text, name_ar text, brand text,
  min_price numeric, image text, rating_avg numeric, score real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (select trim(coalesce(p_query,'')) as term)
  select
    p.id, p.slug, p.name, p.name_ar, b.name as brand,
    (select min(v.price) from product_variants v where v.product_id = p.id and v.active) as min_price,
    (select url from product_images pi where pi.product_id = p.id and pi.is_primary limit 1) as image,
    p.rating_avg,
    greatest(
      similarity(p.search_text, (select term from q)),
      coalesce(similarity(b.name, (select term from q)), 0)
    ) as score
  from products p
  left join brands b on b.id = p.brand_id
  where p.active and not p.archived
    and (select term from q) <> ''
    and (
      p.search_text ilike '%' || (select term from q) || '%'
      or b.name ilike '%' || (select term from q) || '%'
      or exists (
        select 1 from product_notes pn
        join fragrance_notes fn on fn.id = pn.note_id
        where pn.product_id = p.id and fn.name ilike '%' || (select term from q) || '%'
      )
      or p.search_text % (select term from q)
    )
  order by score desc, p.sales_count desc
  limit greatest(1, least(p_limit, 50));
$$;
