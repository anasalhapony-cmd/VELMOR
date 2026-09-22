-- =============================================================================
-- 0015 — Admin RPCs (audit logging, guarded inventory, dashboard/analytics)
-- =============================================================================
-- The admin dashboard performs ordinary CRUD through the RLS-guarded
-- `authenticated` client (policies already restrict every table to is_admin()).
-- Three things cannot go through that path and are provided here as SECURITY
-- DEFINER functions that self-guard with is_admin()/has_permission():
--   1. audit-log inserts   — admin_audit_logs has no INSERT policy by design.
--   2. inventory changes   — adjust_inventory is service_role-only + unguarded.
--   3. server-side aggregates — so dashboards never page the whole table
--      client-side (PostgREST caps rows at 1000) and never expose raw PII.
-- All are granted to `authenticated`; each raises 42501 for non-admins.

-- ---------------------------------------------------------------------------
-- log_admin_action: append an audit row as the current admin. Append-only.
-- ---------------------------------------------------------------------------
create or replace function log_admin_action(
  p_action    text,
  p_entity    text,
  p_entity_id text default null,
  p_previous  jsonb default null,
  p_new       jsonb default null,
  p_reason    text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  insert into admin_audit_logs
    (admin_id, action, entity, entity_id, previous_value, new_value, reason)
  values
    (auth.uid(), p_action, p_entity, p_entity_id, p_previous, p_new, p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_adjust_inventory: manager-guarded manual stock change. Delegates to the
-- single choke point adjust_inventory (row lock + non-negative + ledger),
-- records the admin id, and writes an audit entry. Returns the new quantity.
-- ---------------------------------------------------------------------------
create or replace function admin_adjust_inventory(
  p_variant_id uuid,
  p_change     int,
  p_reason     inventory_reason,
  p_note       text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new int;
begin
  if not (is_admin() and has_permission('manage_inventory')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if p_reason in ('SALE','CANCELLATION') then
    -- Those reasons are reserved for the order engine (idempotency guards).
    raise exception 'RESERVED_REASON' using errcode = 'P0007';
  end if;

  v_new := adjust_inventory(p_variant_id, p_change, p_reason, null, auth.uid(), p_note);

  insert into admin_audit_logs (admin_id, action, entity, entity_id, new_value, reason)
  values (auth.uid(), 'stock_adjust', 'product_variants', p_variant_id::text,
          jsonb_build_object('change', p_change, 'reason', p_reason, 'new_quantity', v_new),
          p_note);

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_dashboard_metrics: headline KPIs, computed in SQL. COD revenue is split
-- into "ordered" (all non-cancelled) vs "realised" (delivered) per §67.
-- ---------------------------------------------------------------------------
create or replace function admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not (is_admin() and has_permission('view_analytics')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'orders_total',      (select count(*) from orders),
    'orders_pending',    (select count(*) from orders where order_status = 'PENDING'),
    'orders_active',     (select count(*) from orders
                            where order_status in ('CONFIRMED','PREPARING','READY_FOR_DELIVERY','OUT_FOR_DELIVERY')),
    'orders_delivered',  (select count(*) from orders where order_status = 'DELIVERED'),
    'orders_cancelled',  (select count(*) from orders where order_status in ('CANCELLED','EXPIRED','FAILED')),
    'revenue_ordered',   (select coalesce(sum(total),0) from orders
                            where order_status not in ('CANCELLED','EXPIRED','FAILED')),
    'revenue_realised',  (select coalesce(sum(total),0) from orders where order_status = 'DELIVERED'),
    'aov_realised',      (select coalesce(round(avg(total),3),0) from orders where order_status = 'DELIVERED'),
    'orders_today',      (select count(*) from orders
                            where created_at >= date_trunc('day', now() at time zone 'Africa/Tripoli')),
    'revenue_today',     (select coalesce(sum(total),0) from orders
                            where order_status = 'DELIVERED'
                              and created_at >= date_trunc('day', now() at time zone 'Africa/Tripoli')),
    'products_active',   (select count(*) from products where active and not archived),
    'low_stock',         (select count(*) from product_variants where active and stock_quantity > 0 and stock_quantity <= 10),
    'out_of_stock',      (select count(*) from product_variants where active and stock_quantity = 0),
    'reviews_pending',   (select count(*) from reviews where status = 'PENDING'),
    'customers_total',   (select count(distinct phone) from orders)
  ) into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_sales_series: daily ordered vs realised revenue for the last N days.
-- ---------------------------------------------------------------------------
create or replace function admin_sales_series(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb; v_days int := greatest(1, least(coalesce(p_days,30), 180));
begin
  if not (is_admin() and has_permission('view_analytics')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  with days as (
    select generate_series(
      (date_trunc('day', now() at time zone 'Africa/Tripoli') - ((v_days - 1) || ' days')::interval)::date,
      (date_trunc('day', now() at time zone 'Africa/Tripoli'))::date,
      '1 day'
    )::date as d
  ),
  agg as (
    select (created_at at time zone 'Africa/Tripoli')::date as d,
           count(*) as orders,
           coalesce(sum(total) filter (where order_status not in ('CANCELLED','EXPIRED','FAILED')),0) as ordered,
           coalesce(sum(total) filter (where order_status = 'DELIVERED'),0) as realised
    from orders
    where created_at >= (now() at time zone 'Africa/Tripoli') - (v_days || ' days')::interval
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', days.d,
    'orders', coalesce(agg.orders,0),
    'ordered', coalesce(agg.ordered,0),
    'realised', coalesce(agg.realised,0)
  ) order by days.d), '[]'::jsonb)
  into v
  from days left join agg on agg.d = days.d;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_top_products: best sellers by delivered quantity (realised).
-- ---------------------------------------------------------------------------
create or replace function admin_top_products(p_limit int default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not (is_admin() and has_permission('view_analytics')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(row order by qty desc), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
             'product_id', oi.product_id,
             'name', coalesce(max(p.name), max(oi.product_name_snapshot)),
             'qty', sum(oi.quantity),
             'revenue', sum(oi.line_total)
           ) as row,
           sum(oi.quantity) as qty
    from order_items oi
    join orders o on o.id = oi.order_id and o.order_status = 'DELIVERED'
    left join products p on p.id = oi.product_id
    group by oi.product_id
    order by qty desc
    limit greatest(1, least(coalesce(p_limit,8), 50))
  ) t;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_orders_by_city: delivered order distribution by city.
-- ---------------------------------------------------------------------------
create or replace function admin_orders_by_city()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not (is_admin() and has_permission('view_analytics')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('city', city, 'orders', c, 'revenue', rev) order by c desc), '[]'::jsonb)
  into v
  from (
    select city, count(*) c, coalesce(sum(total),0) rev
    from orders group by city order by c desc limit 20
  ) t;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_customers: account-free "customers" derived from orders, keyed by the
-- normalised phone. Returns an aggregate list with basic search + paging.
-- ---------------------------------------------------------------------------
create or replace function admin_customers(
  p_search text default null,
  p_limit  int  default 30,
  p_offset int  default 0
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_q text := nullif(trim(coalesce(p_search,'')), '');
  v_limit int := greatest(1, least(coalesce(p_limit,30), 100));
  v_off int := greatest(0, coalesce(p_offset,0));
begin
  if not (is_admin() and has_permission('view_orders')) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  with base as (
    select phone,
           max(customer_name) as name,
           max(city) as city,
           count(*) as orders,
           coalesce(sum(total) filter (where order_status = 'DELIVERED'),0) as spent,
           max(created_at) as last_order
    from orders
    where v_q is null or phone ilike '%'||v_q||'%' or customer_name ilike '%'||v_q||'%'
    group by phone
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'phone', phone, 'name', name, 'city', city,
        'orders', orders, 'spent', spent, 'last_order', last_order
      ) order by last_order desc)
      from (select * from base order by last_order desc limit v_limit offset v_off) p
    ), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — callable by authenticated admins (each self-guards internally).
-- ---------------------------------------------------------------------------
grant execute on function
  log_admin_action(text, text, text, jsonb, jsonb, text),
  admin_adjust_inventory(uuid, int, inventory_reason, text),
  admin_dashboard_metrics(),
  admin_sales_series(int),
  admin_top_products(int),
  admin_orders_by_city(),
  admin_customers(text, int, int)
to authenticated;
