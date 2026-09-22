import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { toProductCard, toProductDetail } from '@/lib/products/mappers';
import type { ProductCard, ProductDetail } from '@/types';
import type { SortOption } from '@/config/constants';

const CARD_SELECT = `
  id, slug, name, name_ar, gender, is_new_arrival, is_best_seller, is_featured,
  rating_avg, rating_count,
  brands ( name ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position )
`;

const DETAIL_SELECT = `
  id, slug, name, name_ar, gender, concentration, season, occasions, longevity, sillage,
  description, short_description, is_new_arrival, is_best_seller, is_featured,
  rating_avg, rating_count, seo_title, seo_description,
  brands ( name ),
  fragrance_families ( slug, name ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position ),
  product_notes ( tier, position, fragrance_notes ( slug, name ) )
`;

export interface ListParams {
  filters?: Record<string, unknown>;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}
export interface ListResult {
  items: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/** Catalog listing via the server-side list_products RPC. */
export async function listProducts(params: ListParams = {}): Promise<ListResult> {
  const { filters = {}, sort = 'recommended', page = 1, perPage = 12 } = params;
  const supabase = await createClient();
  const offset = (Math.max(1, page) - 1) * perPage;
  const { data, error } = await supabase.rpc('list_products', {
    p_filters: filters,
    p_sort: sort,
    p_limit: perPage,
    p_offset: offset,
  });
  if (error || !data) return { items: [], total: 0, page, perPage, totalPages: 0 };
  const result = data as { total: number; items: unknown[] };
  const items = (result.items ?? []).map((raw) => rpcCardToProductCard(raw as RpcCard));
  return {
    items,
    total: result.total ?? 0,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil((result.total ?? 0) / perPage)),
  };
}

interface RpcCard {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  brand: string | null;
  min_price: number | string | null;
  compare_at_price: number | string | null;
  image: string | null;
  rating_avg: number | string;
  rating_count: number;
  gender: ProductCard['gender'];
  is_new: boolean;
  is_best: boolean;
  is_featured: boolean;
}
function rpcCardToProductCard(r: RpcCard): ProductCard {
  const num = (v: number | string | null) => (v == null ? null : typeof v === 'string' ? Number(v) : v);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameAr: r.name_ar,
    brand: r.brand,
    minPrice: num(r.min_price),
    compareAtPrice: num(r.compare_at_price),
    image: r.image,
    ratingAvg: Number(r.rating_avg) || 0,
    ratingCount: r.rating_count ?? 0,
    gender: r.gender,
    isNew: r.is_new,
    isBestSeller: r.is_best,
    isFeatured: r.is_featured,
  };
}

/** A single homepage/rail of cards by flag. */
export async function getRail(flag: 'featured' | 'new' | 'best', limit = 8): Promise<ProductCard[]> {
  const { items } = await listProducts({ filters: { flag }, perPage: limit });
  return items;
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(DETAIL_SELECT)
    .eq('slug', slug)
    .eq('active', true)
    .eq('archived', false)
    .maybeSingle();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toProductDetail(data as any);
});

/** Related products: same family, excluding the current product. */
export async function getRelated(product: ProductDetail, limit = 4): Promise<ProductCard[]> {
  if (!product.familySlug) return [];
  const { items } = await listProducts({
    filters: { families: [product.familySlug] },
    perPage: limit + 1,
  });
  return items.filter((p) => p.id !== product.id).slice(0, limit);
}

export interface Facets {
  brands: { slug: string; name: string }[];
  families: { slug: string; name: string }[];
  price_min: number | null;
  price_max: number | null;
}
export const getFacets = cache(async (): Promise<Facets> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc('browse_facets');
  const f = (data ?? {}) as Partial<Facets>;
  return {
    brands: f.brands ?? [],
    families: f.families ?? [],
    price_min: f.price_min ?? null,
    price_max: f.price_max ?? null,
  };
});

/** Slugs for generateStaticParams / sitemap. */
export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('slug')
    .eq('active', true)
    .eq('archived', false);
  return (data ?? []).map((r) => r.slug);
}

export { CARD_SELECT };
