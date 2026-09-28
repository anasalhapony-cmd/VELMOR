-- =============================================================================
-- 0018 — Phase 2: production commerce hardening + approved-design support
-- =============================================================================
--  1. Roles: 'admin' gets every store permission; overrides need owner/admin.
--  2. Products: art-direction field, inspiration profile, freshness/sweetness.
--  3. Inventory: reserved_quantity (units committed to open orders).
--  4. Order state machine: single internal transition function, terminal states
--     are final, coupon usage released on cancellation, auto-expiry job.
--  5. Gift wrapping (disabled by default) + order totals constraint.
--  6. create_order v3: coupon row lock (no usage-limit race), zone-derived
--     city, quantity bounds, enabled payment methods, analytics name.
--  7. quote_order_v2 (gift wrap aware).
--  8. Durable, shared rate limiting (rate_limit_hit).
--  9. Configurable order-number prefix.
-- 10. Catalog browse v2: size filter, richer card fields, facets.
-- 11. Homepage sections for the approved design + CMS copy.
-- 12. Analytics event names aligned with the tracking plan.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Roles
-- ---------------------------------------------------------------------------
create or replace function has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid()
      and a.active
      and (a.role in ('owner','admin') or perm = any(a.permissions))
  );
$$;

-- Senior admins (owner/admin) may force state-machine overrides.
create or replace function is_senior_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid() and a.active and a.role in ('owner','admin')
  );
$$;
grant execute on function is_senior_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Product attributes
-- ---------------------------------------------------------------------------
alter table products
  add column if not exists inspiration_profile text,
  add column if not exists art_field text not null default 'ink',
  add column if not exists freshness int,
  add column if not exists sweetness int;

alter table products
  add constraint products_art_field_chk check (art_field in ('ink','paper','pine','gold','char')),
  add constraint products_freshness_chk check (freshness is null or freshness between 1 and 5),
  add constraint products_sweetness_chk check (sweetness is null or sweetness between 1 and 5),
  add constraint products_inspiration_len check (inspiration_profile is null or length(inspiration_profile) <= 280);

comment on column products.inspiration_profile is
  'Olfactive profile the scent interprets. Shown with an independence disclaimer; never a trademark claim.';
comment on column products.art_field is
  'Storefront art-direction field colour behind the bottle (approved design): ink|paper|pine|gold|char.';

-- ---------------------------------------------------------------------------
-- 3. Reservations: stock_quantity = sellable now; reserved_quantity = units in
--    open (not yet delivered/cancelled) orders. On hand = stock + reserved.
-- ---------------------------------------------------------------------------
alter table product_variants
  add column if not exists reserved_quantity int not null default 0;
alter table product_variants
  add constraint variants_reserved_nonneg check (reserved_quantity >= 0);

create or replace function order_status_is_open(s order_status)
returns boolean
language sql
immutable
as $$
  select s in ('PENDING','CONFIRMED','PREPARING','READY_FOR_DELIVERY','OUT_FOR_DELIVERY','FAILED');
$$;

-- Backfill from existing open orders.
update product_variants v
   set reserved_quantity = x.q
  from (
    select oi.variant_id, sum(oi.quantity)::int as q
      from order_items oi
      join orders o on o.id = oi.order_id
     where order_status_is_open(o.order_status) and oi.variant_id is not null
     group by oi.variant_id
  ) x
 where v.id = x.variant_id;

create or replace function trg_order_items_reserve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.variant_id is not null then
    update product_variants
       set reserved_quantity = reserved_quantity + new.quantity
     where id = new.variant_id;
  end if;
  return new;
end;
$$;
create trigger trg_order_items_reserve
  after insert on order_items
  for each row execute function trg_order_items_reserve();

create or replace function trg_orders_release_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if order_status_is_open(old.order_status) and not order_status_is_open(new.order_status) then
    update product_variants v
       set reserved_quantity = greatest(0, v.reserved_quantity - x.q)
      from (
        select variant_id, sum(quantity)::int as q
          from order_items
         where order_id = new.id and variant_id is not null
         group by variant_id
      ) x
     where v.id = x.variant_id;
  end if;
  return new;
end;
$$;
create trigger trg_orders_release_reservation
  after update of order_status on orders
  for each row
  when (old.order_status is distinct from new.order_status)
  execute function trg_orders_release_reservation();

-- ---------------------------------------------------------------------------
-- 4. Order state machine
-- ---------------------------------------------------------------------------
-- Internal: the ONLY place an order changes status. Not granted to clients.
create or replace function _transition_order_status(
  p_order_id uuid,
  p_to       order_status,
  p_note     text,
  p_actor    uuid,
  p_override boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from    order_status;
  v_coupon  uuid;
  v_valid   boolean;
  v_item    record;
  v_deleted int;
begin
  select order_status, coupon_id into v_from, v_coupon
    from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_from = p_to then
    return get_order_public(p_order_id);
  end if;

  -- Terminal states are final: stock was already restored (cancel/expire) or
  -- sold (delivered). Re-opening would corrupt inventory, so even an override
  -- cannot leave them. Returns go through a dedicated process.
  if v_from in ('DELIVERED','CANCELLED','EXPIRED') then
    raise exception 'ORDER_FINALIZED:%', v_from using errcode = 'P0006';
  end if;

  v_valid := case v_from
    when 'PENDING'            then p_to in ('CONFIRMED','CANCELLED','EXPIRED')
    when 'CONFIRMED'          then p_to in ('PREPARING','CANCELLED')
    when 'PREPARING'          then p_to in ('READY_FOR_DELIVERY','CANCELLED')
    when 'READY_FOR_DELIVERY' then p_to in ('OUT_FOR_DELIVERY','CANCELLED')
    when 'OUT_FOR_DELIVERY'   then p_to in ('DELIVERED','FAILED')
    when 'FAILED'             then p_to in ('OUT_FOR_DELIVERY','CANCELLED')
    else false
  end;
  if not v_valid and not coalesce(p_override, false) then
    raise exception 'INVALID_TRANSITION:%->%', v_from, p_to using errcode = 'P0006';
  end if;

  update orders set order_status = p_to where id = p_order_id;

  insert into order_status_history (order_id, from_status, to_status, note, changed_by)
    values (p_order_id, v_from, p_to, p_note, p_actor);

  if p_to in ('CANCELLED','EXPIRED') then
    -- Restore stock exactly once (unique index is the hard guard).
    for v_item in
      select variant_id, sum(quantity)::int as quantity from order_items
       where order_id = p_order_id and variant_id is not null
       group by variant_id
    loop
      if not exists (
        select 1 from inventory_movements
         where order_id = p_order_id and variant_id = v_item.variant_id and reason = 'CANCELLATION'
      ) then
        perform adjust_inventory(v_item.variant_id, v_item.quantity, 'CANCELLATION',
                                 p_order_id, p_actor, 'order ' || lower(p_to::text));
      end if;
    end loop;

    -- Release the coupon use so a cancelled order doesn't burn a limited code.
    if v_coupon is not null then
      delete from coupon_usage where order_id = p_order_id;
      get diagnostics v_deleted = row_count;
      if v_deleted > 0 then
        update coupons set used_count = greatest(0, used_count - 1) where id = v_coupon;
      end if;
    end if;
  end if;

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
    values (p_actor, case when p_actor is null then 'status_change_system' else 'status_change' end,
            'orders', p_order_id::text,
            jsonb_build_object('status', v_from),
            jsonb_build_object('status', p_to, 'override', coalesce(p_override,false) and not v_valid),
            p_note);

  return get_order_public(p_order_id);
end;
$$;
revoke all on function _transition_order_status(uuid, order_status, text, uuid, boolean) from public;

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
begin
  if not (is_admin() and has_permission('manage_orders')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if coalesce(p_override, false) and not is_senior_admin() then
    raise exception 'OVERRIDE_NOT_ALLOWED' using errcode = '42501';
  end if;
  return _transition_order_status(p_order_id, p_to, p_note, auth.uid(), coalesce(p_override,false));
end;
$$;

-- Auto-expire unconfirmed orders (restores stock). Run from a scheduler with the
-- service role. p_hours null -> setting 'order_expiry_hours' (0/absent = off).
create or replace function expire_stale_orders(p_hours int default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours int := coalesce(p_hours, nullif(get_setting('order_expiry_hours') #>> '{}', '')::int, 0);
  v_id    uuid;
  v_n     int := 0;
begin
  if v_hours <= 0 then
    return 0;
  end if;
  for v_id in
    select id from orders
     where order_status = 'PENDING'
       and created_at < now() - make_interval(hours => v_hours)
     order by created_at
     for update skip locked
  loop
    perform _transition_order_status(v_id, 'EXPIRED', 'auto-expired after ' || v_hours || 'h', null, false);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function expire_stale_orders(int) from public;
grant execute on function expire_stale_orders(int) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Gift wrapping (architecture only; disabled unless the setting is on)
-- ---------------------------------------------------------------------------
alter table orders
  add column if not exists gift_wrap boolean not null default false,
  add column if not exists gift_wrap_fee numeric(12,3) not null default 0,
  add column if not exists gift_message text;
alter table orders
  add constraint orders_gift_fee_nonneg check (gift_wrap_fee >= 0),
  add constraint orders_gift_message_len check (gift_message is null or length(gift_message) <= 300);
alter table orders drop constraint if exists orders_total_consistent;
alter table orders
  add constraint orders_total_consistent
  check (total = subtotal - discount_total + delivery_fee + gift_wrap_fee);

insert into site_settings (key, value, group_name, label) values
  ('gift_wrapping_enabled',   'false',     'features', 'تغليف الهدايا'),
  ('gift_wrapping_fee',       '0',         'features', 'رسوم تغليف الهدايا'),
  ('order_prefix',            '"VEL"',     'general',  'بادئة رقم الطلب'),
  ('order_expiry_hours',      '48',        'orders',   'إلغاء الطلبات غير المؤكدة تلقائيًا بعد (ساعات، 0 = معطل)'),
  ('max_qty_per_line',        '10',        'orders',   'أقصى كمية للصنف الواحد في الطلب'),
  ('max_cart_lines',          '20',        'orders',   'أقصى عدد أصناف في الطلب'),
  ('max_open_orders_per_phone','3',        'orders',   'أقصى عدد طلبات مفتوحة لرقم الهاتف الواحد (0 = بلا حد)'),
  ('payment_methods_enabled', '["COD"]',   'features', 'طرق الدفع المفعّلة'),
  ('whatsapp_number',         '"0919774260"', 'contact', 'رقم واتساب'),
  ('maintenance_mode',        'false',     'features', 'وضع الصيانة'),
  ('maintenance_message',     '"نُجهّز شيئًا يليق بحضورك. نعود قريبًا."', 'features', 'رسالة وضع الصيانة'),
  ('home_signature_product',  '""',        'homepage', 'العطر التوقيع في الصفحة الرئيسية (slug)')
on conflict (key) do nothing;

create or replace function _setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case when jsonb_typeof(get_setting(p_key)) = 'number' then (get_setting(p_key) #>> '{}')::numeric end,
    p_default
  );
$$;

create or replace function _setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case when jsonb_typeof(get_setting(p_key)) = 'boolean' then (get_setting(p_key) #>> '{}')::boolean end,
    p_default
  );
$$;

-- Public projection now includes gift wrap (no internal fields).
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
    'gift_wrap', o.gift_wrap,
    'gift_wrap_fee', o.gift_wrap_fee,
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
      ) order by oi.created_at) from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.to_status, 'at', h.created_at) order by h.created_at)
      from order_status_history h where h.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------------------
-- 9. Order number prefix (setting 'order_prefix', A–Z, 2–5 chars; default VEL)
-- ---------------------------------------------------------------------------
create or replace function gen_order_number()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_prefix text;
  candidate text;
  i int;
begin
  begin
    v_prefix := upper(regexp_replace(coalesce(get_setting('order_prefix') #>> '{}', ''), '[^A-Za-z]', '', 'g'));
  exception when others then
    v_prefix := '';
  end;
  if length(v_prefix) not between 2 and 5 then
    v_prefix := 'VEL';
  end if;
  loop
    candidate := v_prefix || '-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from orders where public_order_number = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. create_order v3
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
  v_qty        int;
  v_variant    product_variants%rowtype;
  v_product    products%rowtype;
  v_subtotal   numeric := 0;
  v_eligible   numeric := 0;
  v_discount   numeric := 0;
  v_fee        numeric := 0;
  v_gift       boolean := false;
  v_gift_fee   numeric := 0;
  v_zone_name  text;
  v_zone_city  text;
  v_coupon_id  uuid;
  v_coupon_res jsonb;
  v_phone      text := p_payload->>'phone';
  v_zone       uuid := nullif(p_payload->>'delivery_zone_id','')::uuid;
  v_code       text := nullif(trim(coalesce(p_payload->>'coupon_code','')),'');
  v_pay        payment_method := coalesce(nullif(p_payload->>'payment_method','')::payment_method, 'COD');
  v_items      jsonb := p_payload->'items';
  v_line_total numeric;
  v_img        text;
begin
  -- Idempotency: serialise concurrent submissions of the same key (double
  -- click / retry race), then return the already-created order if seen.
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended('create_order:' || p_idempotency_key, 0));
    select order_id into v_existing from idempotency_keys where key = p_idempotency_key;
    if v_existing is not null then
      return get_order_public(v_existing);
    end if;
  end if;

  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0003';
  end if;
  if jsonb_array_length(v_items) > greatest(_setting_numeric('max_cart_lines', 20), 1)::int then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0003';
  end if;

  -- Only payment methods the store has enabled (COD at launch).
  if not exists (
    select 1 from jsonb_array_elements_text(coalesce(get_setting('payment_methods_enabled'), '["COD"]'::jsonb)) m
     where m = v_pay::text
  ) then
    raise exception 'PAYMENT_METHOD_DISABLED' using errcode = 'P0008';
  end if;

  -- Delivery zone (fee + city are authoritative, from DB).
  if v_zone is null then
    raise exception 'DELIVERY_ZONE_REQUIRED' using errcode = 'P0004';
  end if;
  select fee, name, city into v_fee, v_zone_name, v_zone_city
    from delivery_zones where id = v_zone and active;
  if not found then
    raise exception 'INVALID_DELIVERY_ZONE' using errcode = 'P0004';
  end if;

  -- Anti-hoarding: an unpaid COD order reserves stock, so cap how many open
  -- orders one phone can hold at a time (setting; 0 = unlimited).
  if _setting_numeric('max_open_orders_per_phone', 3) > 0 and (
      select count(*) from orders
       where phone = v_phone and order_status in ('PENDING', 'CONFIRMED')
         and created_at > now() - interval '7 days'
    ) >= _setting_numeric('max_open_orders_per_phone', 3) then
    raise exception 'TOO_MANY_OPEN_ORDERS' using errcode = 'P0009';
  end if;

  -- Gift wrap only when the store has it enabled; fee from settings.
  if coalesce((p_payload->>'gift_wrap')::boolean, false) and _setting_bool('gift_wrapping_enabled', false) then
    v_gift := true;
    v_gift_fee := greatest(_setting_numeric('gift_wrapping_fee', 0), 0);
  end if;

  v_number := gen_order_number();
  insert into orders (
    public_order_number, customer_name, phone, whatsapp, city, area, address,
    delivery_note, delivery_zone_id, delivery_zone_name,
    subtotal, discount_total, delivery_fee, gift_wrap, gift_wrap_fee, gift_message,
    total, payment_method, order_status
  ) values (
    v_number,
    p_payload->>'customer_name', v_phone, nullif(p_payload->>'whatsapp',''),
    coalesce(nullif(v_zone_city,''), v_zone_name),        -- never client-supplied
    nullif(p_payload->>'area',''), p_payload->>'address',
    nullif(p_payload->>'delivery_note',''), v_zone, v_zone_name,
    0, 0, v_fee, v_gift, v_gift_fee,
    case when v_gift then nullif(left(p_payload->>'gift_message', 300), '') end,
    v_fee + v_gift_fee, v_pay, 'PENDING'
  ) returning id into v_order_id;

  -- Walk items: lock variant, validate, decrement stock, snapshot.
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    begin
      v_qty := (v_item->>'quantity')::int;
    exception when others then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0003';
    end;
    if v_qty is null or v_qty < 1 or v_qty > greatest(_setting_numeric('max_qty_per_line', 10), 1)::int then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0003';
    end if;

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

    if v_variant.stock_quantity < v_qty then
      raise exception 'OUT_OF_STOCK:%', v_variant.id using errcode = 'P0001';
    end if;

    perform adjust_inventory(v_variant.id, -v_qty, 'SALE', v_order_id, null, 'order ' || v_number);

    v_line_total := v_variant.price * v_qty;
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
      v_product.name || ' · ' || (trim(to_char(v_variant.size, 'FM999990.##')) || ' ' || v_variant.unit),
      (trim(to_char(v_variant.size, 'FM999990.##')) || ' ' || v_variant.unit),
      v_variant.sku, v_img, v_variant.price, v_qty,
      0, v_line_total
    );
  end loop;

  -- Coupon: lock the coupon row first so concurrent orders can't both pass the
  -- usage_limit / per-customer check, then validate against authoritative data.
  if v_code is not null then
    select id into v_coupon_id from coupons where code = v_code for update;
    if v_coupon_id is not null then
      v_eligible := _eligible_subtotal(v_coupon_id, v_items);
    end if;
    v_coupon_res := _apply_coupon(v_code, v_phone, v_subtotal, v_eligible);
    if (v_coupon_res->>'valid')::boolean then
      v_discount := (v_coupon_res->>'discount')::numeric;
      v_coupon_id := (v_coupon_res->>'coupon_id')::uuid;
    else
      v_coupon_id := null;   -- an invalid coupon is dropped, never trusted
    end if;
  end if;

  update orders set
    subtotal = v_subtotal,
    discount_total = v_discount,
    delivery_fee = v_fee,
    total = v_subtotal - v_discount + v_fee + v_gift_fee,
    coupon_id = v_coupon_id,
    coupon_code = case when v_coupon_id is not null then v_code else null end
  where id = v_order_id;

  if v_coupon_id is not null then
    insert into coupon_usage (coupon_id, order_id, phone) values (v_coupon_id, v_order_id, v_phone);
    update coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  insert into order_status_history (order_id, from_status, to_status, note)
    values (v_order_id, null, 'PENDING', 'order created');

  if p_idempotency_key is not null then
    insert into idempotency_keys (key, order_id) values (p_idempotency_key, v_order_id);
  end if;

  insert into analytics_events (event_type, meta)
    values ('order_created', jsonb_build_object('order_number', v_number,
            'total', v_subtotal - v_discount + v_fee + v_gift_fee,
            'items', jsonb_array_length(v_items)));

  return get_order_public(v_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. quote_order_v2 — read-only preview incl. gift wrap.
-- ---------------------------------------------------------------------------
create or replace function quote_order_v2(p_payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q        jsonb;
  v_enabled  boolean := _setting_bool('gift_wrapping_enabled', false);
  v_gift     boolean := v_enabled and coalesce((p_payload->>'gift_wrap')::boolean, false);
  v_fee      numeric := case when v_gift then greatest(_setting_numeric('gift_wrapping_fee', 0), 0) else 0 end;
begin
  v_q := quote_order(
    coalesce(p_payload->'items', '[]'::jsonb),
    nullif(p_payload->>'delivery_zone_id','')::uuid,
    nullif(p_payload->>'coupon_code',''),
    nullif(p_payload->>'phone','')
  );
  return v_q || jsonb_build_object(
    'gift_wrap_available', v_enabled,
    'gift_wrap', v_gift,
    'gift_wrap_fee', v_fee,
    'total', (v_q->>'total')::numeric + v_fee
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Durable rate limiting (fixed window, shared across all server instances).
--    Keys are hashed by the app before they reach the DB (no raw IPs stored).
-- ---------------------------------------------------------------------------
create table if not exists rate_limit_buckets (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table rate_limit_buckets enable row level security;  -- no policies: service_role only

create or replace function rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hits  int;
  v_start timestamptz;
  v_win   interval := make_interval(secs => greatest(1, p_window_seconds));
begin
  insert into rate_limit_buckets as b (key, window_start, hits)
  values (left(p_key, 200), now(), 1)
  on conflict (key) do update set
    hits = case when b.window_start < now() - v_win then 1 else b.hits + 1 end,
    window_start = case when b.window_start < now() - v_win then now() else b.window_start end
  returning hits, window_start into v_hits, v_start;

  if random() < 0.01 then
    delete from rate_limit_buckets where window_start < now() - interval '1 day';
  end if;

  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'remaining', greatest(0, p_limit - v_hits),
    'retry_after', greatest(0, ceil(extract(epoch from (v_start + v_win - now())))::int)
  );
end;
$$;
revoke all on function rate_limit_hit(text, int, int) from public;
grant all on table rate_limit_buckets to service_role;
grant execute on function rate_limit_hit(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- 10. Catalog browse v2
-- ---------------------------------------------------------------------------
create or replace function list_products(
  p_filters jsonb default '{}',
  p_sort    text  default 'recommended',
  p_limit   int   default 12,
  p_offset  int   default 0
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_genders    text[] := case when p_filters ? 'genders'   then array(select jsonb_array_elements_text(p_filters->'genders')) end;
  v_brands     text[] := case when p_filters ? 'brands'     then array(select jsonb_array_elements_text(p_filters->'brands')) end;
  v_families   text[] := case when p_filters ? 'families'   then array(select jsonb_array_elements_text(p_filters->'families')) end;
  v_seasons    text[] := case when p_filters ? 'seasons'    then array(select jsonb_array_elements_text(p_filters->'seasons')) end;
  v_occasions  text[] := case when p_filters ? 'occasions'  then array(select jsonb_array_elements_text(p_filters->'occasions')) end;
  v_notes      text[] := case when p_filters ? 'notes'      then array(select jsonb_array_elements_text(p_filters->'notes')) end;
  v_sizes      numeric[] := case when p_filters ? 'sizes'   then array(
                              select s::numeric from jsonb_array_elements_text(p_filters->'sizes') s
                              where s ~ '^[0-9]+(\.[0-9]+)?$') end;
  v_collection text    := nullif(p_filters->>'collection','');
  v_category   text    := nullif(p_filters->>'category','');
  v_flag       text    := nullif(p_filters->>'flag','');
  v_q          text    := nullif(trim(coalesce(p_filters->>'q','')),'');
  v_pmin       numeric := case when (p_filters->>'price_min') ~ '^[0-9]+(\.[0-9]+)?$' then (p_filters->>'price_min')::numeric end;
  v_pmax       numeric := case when (p_filters->>'price_max') ~ '^[0-9]+(\.[0-9]+)?$' then (p_filters->>'price_max')::numeric end;
  v_instock    boolean := coalesce((p_filters->>'in_stock')::boolean, false);
  v_sort       text    := case when p_sort = 'popularity' then 'best_selling' else coalesce(p_sort,'recommended') end;
  v_limit      int := greatest(1, least(coalesce(p_limit,12), 60));
  v_off        int := greatest(0, coalesce(p_offset,0));
  v_result     jsonb;
begin
  with cand as (
      select
        p.id, p.slug, p.name, p.name_ar, p.gender, p.brand_id, p.family_id, p.art_field,
        p.short_description,
        p.is_new_arrival, p.is_best_seller, p.is_featured,
        p.rating_avg, p.rating_count, p.sales_count, p.sort_order, p.created_at,
        (select min(v.price) from product_variants v where v.product_id = p.id and v.active) as min_price
      from products p
      where p.active and not p.archived
        and (v_genders   is null or p.gender::text = any(v_genders))
        and (v_seasons   is null or p.season::text = any(v_seasons))
        and (v_occasions is null or p.occasions::text[] && v_occasions)
        and (v_brands    is null or p.brand_id in (select id from brands where slug = any(v_brands)))
        and (v_families  is null or p.family_id in (select id from fragrance_families where slug = any(v_families)))
        and (v_flag is null
             or (v_flag='featured' and p.is_featured)
             or (v_flag='new' and p.is_new_arrival)
             or (v_flag='best' and p.is_best_seller))
        and (v_q is null or p.search_text ilike '%'||v_q||'%' or p.search_text % v_q
             or exists (select 1 from product_notes pn join fragrance_notes fn on fn.id=pn.note_id
                        where pn.product_id=p.id and (fn.name ilike '%'||v_q||'%' or fn.name_en ilike '%'||v_q||'%')))
        and (v_collection is null or exists (
              select 1 from product_collections pc join collections c on c.id=pc.collection_id
              where pc.product_id=p.id and c.slug=v_collection))
        and (v_category is null or exists (
              select 1 from product_categories pc join categories c on c.id=pc.category_id
              where pc.product_id=p.id and c.slug=v_category))
        and (v_notes is null or exists (
              select 1 from product_notes pn join fragrance_notes fn on fn.id=pn.note_id
              where pn.product_id=p.id and fn.slug = any(v_notes)))
        and exists (
              select 1 from product_variants v
              where v.product_id=p.id and v.active
                and (v_pmin  is null or v.price >= v_pmin)
                and (v_pmax  is null or v.price <= v_pmax)
                and (v_sizes is null or v.size = any(v_sizes))
                and (not v_instock or v.stock_quantity > 0))
    ),
    page as (
      select
        row_number() over (order by
          case when v_sort='newest'       then extract(epoch from c.created_at) end desc nulls last,
          case when v_sort='price_asc'    then c.min_price end asc nulls last,
          case when v_sort='price_desc'   then c.min_price end desc nulls last,
          case when v_sort='best_selling' then c.sales_count end desc nulls last,
          case when v_sort='top_rated'    then c.rating_avg end desc nulls last,
          c.sort_order asc, c.sales_count desc, c.created_at desc
        ) as rn,
        c.*
      from cand c
      order by rn
      limit v_limit offset v_off
    )
    select jsonb_build_object(
      'total',  (select count(*) from cand),
      'items',  coalesce((select jsonb_agg(
          jsonb_build_object(
            'id', pg.id, 'slug', pg.slug, 'name', pg.name, 'name_ar', pg.name_ar,
            'brand', (select name from brands b where b.id = pg.brand_id),
            'family', (select name from fragrance_families f where f.id = pg.family_id),
            'family_slug', (select slug from fragrance_families f where f.id = pg.family_id),
            'art_field', pg.art_field,
            'short_description', pg.short_description,
            'min_price', pg.min_price,
            'compare_at_price', (select v.compare_at_price from product_variants v
                where v.product_id=pg.id and v.active and v.price=pg.min_price
                order by v.compare_at_price desc nulls last limit 1),
            'image', (select url from product_images pi where pi.product_id=pg.id
                      order by pi.is_primary desc, pi.sort_order limit 1),
            'rating_avg', pg.rating_avg, 'rating_count', pg.rating_count, 'gender', pg.gender,
            'is_new', pg.is_new_arrival, 'is_best', pg.is_best_seller, 'is_featured', pg.is_featured,
            'in_stock', exists (select 1 from product_variants v where v.product_id=pg.id and v.active and v.stock_quantity > 0),
            'variants', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', v.id, 'size', v.size, 'unit', v.unit, 'price', v.price,
                  'compare_at_price', v.compare_at_price, 'stock_status', v.stock_status)
                  order by v.position, v.size)
                from product_variants v where v.product_id=pg.id and v.active), '[]'::jsonb)
          ) order by pg.rn) from page pg), '[]'::jsonb),
      'limit',  v_limit,
      'offset', v_off
    )
    into v_result;
  return v_result;
end;
$$;

create or replace function browse_facets()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'brands', coalesce((select jsonb_agg(jsonb_build_object('slug',slug,'name',name) order by sort_order)
                        from brands where active), '[]'),
    'families', coalesce((select jsonb_agg(jsonb_build_object(
                          'slug',f.slug,'name',f.name,'name_en',f.name_en,'description',f.description,
                          'count',(select count(*) from products p where p.family_id=f.id and p.active and not p.archived))
                          order by f.sort_order)
                        from fragrance_families f where f.active), '[]'),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('slug',slug,'name',name) order by sort_order)
                        from categories where active), '[]'),
    'collections', coalesce((select jsonb_agg(jsonb_build_object('slug',slug,'name',name) order by sort_order)
                        from collections where active), '[]'),
    'sizes', coalesce((select jsonb_agg(distinct v.size order by v.size)
                        from product_variants v join products p on p.id=v.product_id
                        where v.active and p.active and not p.archived), '[]'),
    'price_min', (select min(price) from product_variants v join products p on p.id=v.product_id
                  where v.active and p.active and not p.archived),
    'price_max', (select max(price) from product_variants v join products p on p.id=v.product_id
                  where v.active and p.active and not p.archived)
  );
$$;

-- ---------------------------------------------------------------------------
-- Grants for new/changed functions
-- ---------------------------------------------------------------------------
revoke execute on function quote_order_v2(jsonb), order_status_is_open(order_status),
  _setting_numeric(text, numeric), _setting_bool(text, boolean) from public;
grant execute on function quote_order_v2(jsonb) to anon, authenticated, service_role;
grant execute on function order_status_is_open(order_status) to anon, authenticated, service_role;
grant execute on function list_products(jsonb, text, int, int), browse_facets()
  to anon, authenticated, service_role;
grant execute on function create_order(jsonb, text), get_order_public(uuid) to service_role;
grant execute on function admin_update_order_status(uuid, order_status, text, boolean) to authenticated, service_role;
revoke execute on function gen_order_number() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 11. Homepage sections for the approved design (admin can reorder/toggle)
-- ---------------------------------------------------------------------------
insert into homepage_sections (key, title, sort_order, active) values
  ('hero',              'الواجهة السينمائية',     0,  true),
  ('marquee',           'الشريط المتحرك',          1,  true),
  ('brand_story',       'بيان العلامة',            2,  true),
  ('best_sellers',      'المجموعة (شريط أفقي)',   3,  true),
  ('fragrance_families','عالم العطر (العائلات)',   4,  true),
  ('signature',         'العطر التوقيع',           5,  true),
  ('perfume_finder',    'مستشار العطور',           6,  true),
  ('collection_grid',   'تسوّق المجموعة',          7,  true),
  ('lifestyle',         'أسلوب الحياة',            8,  true),
  ('reviews',           'آراء العملاء',            9,  true),
  ('brand_statement',   'الإطار الأخير',           10, true)
on conflict (key) do nothing;

-- Re-sequence to the approved narrative; sections outside it are kept but
-- switched off (admin can re-enable them; each still has a renderer).
update homepage_sections set
  sort_order = case key
    when 'hero' then 0 when 'marquee' then 1 when 'brand_story' then 2
    when 'best_sellers' then 3 when 'fragrance_families' then 4 when 'signature' then 5
    when 'perfume_finder' then 6 when 'collection_grid' then 7 when 'lifestyle' then 8
    when 'reviews' then 9 when 'brand_statement' then 10
    else 100 + sort_order end,
  active = case when key in ('hero','marquee','brand_story','best_sellers','fragrance_families',
                             'signature','perfume_finder','collection_grid','lifestyle','reviews',
                             'brand_statement') then active
                else false end;

-- CMS copy: move untouched defaults to the approved copy; never overwrite edits.
update cms_blocks set title = 'حضورٌ لا يُشرَح.', subtitle = 'عطور ليبية لجيلٍ جديد من الرجال'
 where section_key = 'hero' and title = 'عطرٌ يُشبه حضورك';
update cms_blocks set subtitle = 'البيان', title = 'fancy',
       body = 'وُلدت VELMOR في ليبيا لجيلٍ جديد من الرجال يهتمّون بالحضور والثقة والمظهر. أناقةٌ بطابعٍ خاص — توازنٌ بين الفخامة والرجولة وثقافة الشارع.'
 where section_key = 'brand_story' and title = 'قصة VELMOR';
update cms_blocks set title = 'لا تحتاج أن تُعرّف بنفسك.', subtitle = 'عطرك يسبقك.',
       cta_label = 'ابدأ حضورك', cta_href = '/products'
 where section_key = 'brand_statement' and body = 'ليست مجرد عطور، بل أسلوب حياة.';

insert into cms_blocks (section_key, title, subtitle, body, cta_label, cta_href, sort_order, config)
select 'lifestyle', 'إنه', 'أكثر من عطر',
       'VELMOR ليست مجرد عطور؛ إنها أسلوب حياة تصبح فيه العناية بالذات والأسلوب والثقة جزءًا من هويتك اليومية.',
       null, null, 0,
       '{"words":["أسلوب.","حضور.","ثقة.","عناية."],"pillars":[["الأسلوب","Style"],["الحضور","Presence"],["الثقة","Confidence"],["العناية بالذات","Self-care"],["الرجولة","Masculinity"],["هوية عصرية","Modern identity"]]}'::jsonb
where not exists (select 1 from cms_blocks where section_key = 'lifestyle');

insert into cms_blocks (section_key, title, sort_order, config)
select 'marquee', 'الشريط المتحرك', 0,
       '{"items":["أناقة بحضور","Elegance with attitude","عطور تُعبّر عنك","VELMOR Perfumes","ثقة · أسلوب · حضور"]}'::jsonb
where not exists (select 1 from cms_blocks where section_key = 'marquee');

-- ---------------------------------------------------------------------------
-- 12. Analytics event names (tracking plan). Historical rows renamed once.
-- ---------------------------------------------------------------------------
update analytics_events set event_type = case event_type
    when 'product_viewed'   then 'product_view'
    when 'checkout_started' then 'begin_checkout'
    when 'order_completed'  then 'order_created'
    when 'search_performed' then 'search'
    when 'wishlist_added'   then 'wishlist_add'
    when 'finder_completed' then 'perfume_finder_completed'
    else event_type end
 where event_type in ('product_viewed','checkout_started','order_completed',
                      'search_performed','wishlist_added','finder_completed');
