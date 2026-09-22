-- =============================================================================
-- 0014 — Browse/listing RPCs (server-aware filtering, sorting, pagination)
-- =============================================================================
-- Centralises catalog browsing so the client never loads the whole catalog.
-- Returns only safe card fields (no exact stock). Read-only; safe for anon.

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
  v_collection text    := nullif(p_filters->>'collection','');
  v_category   text    := nullif(p_filters->>'category','');
  v_flag       text    := nullif(p_filters->>'flag','');
  v_q          text    := nullif(trim(coalesce(p_filters->>'q','')),'');
  v_pmin       numeric := nullif(p_filters->>'price_min','')::numeric;
  v_pmax       numeric := nullif(p_filters->>'price_max','')::numeric;
  v_instock    boolean := coalesce((p_filters->>'in_stock')::boolean, false);
  v_limit      int := greatest(1, least(coalesce(p_limit,12), 60));
  v_off        int := greatest(0, coalesce(p_offset,0));
  v_result     jsonb;
begin
  with cand as (
      select
        p.id, p.slug, p.name, p.name_ar, p.gender, p.brand_id,
        p.is_new_arrival, p.is_best_seller, p.is_featured,
        p.rating_avg, p.rating_count, p.sales_count, p.sort_order, p.created_at,
        (select min(v.price) from product_variants v where v.product_id = p.id and v.active) as min_price
      from products p
      where p.active and not p.archived
        and (v_genders   is null or p.gender = any(v_genders::product_gender[]))
        and (v_seasons   is null or p.season = any(v_seasons::season[]))
        and (v_occasions is null or p.occasions && (v_occasions::occasion[]))
        and (v_brands    is null or p.brand_id in (select id from brands where slug = any(v_brands)))
        and (v_families  is null or p.family_id in (select id from fragrance_families where slug = any(v_families)))
        and (v_flag is null
             or (v_flag='featured' and p.is_featured)
             or (v_flag='new' and p.is_new_arrival)
             or (v_flag='best' and p.is_best_seller))
        and (v_q is null or p.search_text ilike '%'||v_q||'%' or p.search_text % v_q)
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
                and (v_pmin is null or v.price >= v_pmin)
                and (v_pmax is null or v.price <= v_pmax)
                and (not v_instock or v.stock_quantity > 0))
    ),
    page as (
      select
        row_number() over (order by
          case when p_sort='newest'       then extract(epoch from c.created_at) end desc nulls last,
          case when p_sort='price_asc'    then c.min_price end asc nulls last,
          case when p_sort='price_desc'   then c.min_price end desc nulls last,
          case when p_sort='best_selling' then c.sales_count end desc nulls last,
          case when p_sort='top_rated'    then c.rating_avg end desc nulls last,
          c.sort_order asc, c.sales_count desc, c.created_at desc
        ) as rn,
        jsonb_build_object(
          'id', c.id, 'slug', c.slug, 'name', c.name, 'name_ar', c.name_ar,
          'brand', (select name from brands b where b.id = c.brand_id),
          'min_price', c.min_price,
          'compare_at_price', (select v.compare_at_price from product_variants v
              where v.product_id=c.id and v.active and v.price=c.min_price
              order by v.compare_at_price desc nulls last limit 1),
          'image', (select url from product_images pi where pi.product_id=c.id and pi.is_primary limit 1),
          'rating_avg', c.rating_avg, 'rating_count', c.rating_count, 'gender', c.gender,
          'is_new', c.is_new_arrival, 'is_best', c.is_best_seller, 'is_featured', c.is_featured
        ) as item
      from cand c
      order by rn
      limit v_limit offset v_off
    )
    select jsonb_build_object(
      'total',  (select count(*) from cand),
      'items',  coalesce((select jsonb_agg(item order by rn) from page), '[]'::jsonb),
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
    'families', coalesce((select jsonb_agg(jsonb_build_object('slug',slug,'name',name) order by sort_order)
                        from fragrance_families where active), '[]'),
    'price_min', (select min(price) from product_variants v join products p on p.id=v.product_id
                  where v.active and p.active and not p.archived),
    'price_max', (select max(price) from product_variants v join products p on p.id=v.product_id
                  where v.active and p.active and not p.archived)
  );
$$;

grant execute on function list_products(jsonb, text, int, int), browse_facets()
  to anon, authenticated, service_role;
