import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { toArtField, toProductDetail } from '@/lib/products/mappers';
import type { ProductCard, ProductDetail } from '@/types';
import type { SortOption, StockLevel } from '@/config/constants';

const CARD_SELECT = `
  id, slug, name, name_ar, gender, is_new_arrival, is_best_seller, is_featured,
  rating_avg, rating_count, art_field, short_description,
  brands ( name ),
  fragrance_families ( slug, name ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position )
`;

const DETAIL_SELECT = `
  id, slug, name, name_ar, gender, concentration, season, occasions, longevity, sillage,
  description, short_description, is_new_arrival, is_best_seller, is_featured,
  rating_avg, rating_count, seo_title, seo_description,
  art_field, inspiration_profile, freshness, sweetness,
  brands ( name ),
  fragrance_families ( slug, name ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position ),
  product_notes ( tier, position, fragrance_notes ( slug, name, name_en ) )
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

interface RpcVariant {
  id: string;
  size: number | string;
  unit: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock_status: string | null;
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
  family?: string | null;
  family_slug?: string | null;
  art_field?: string | null;
  short_description?: string | null;
  in_stock?: boolean;
  variants?: RpcVariant[];
}
function stockLevelOf(s: string | null | undefined): StockLevel {
  return s === 'LOW_STOCK' || s === 'OUT_OF_STOCK' ? s : 'IN_STOCK';
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
    family: r.family ?? null,
    familySlug: r.family_slug ?? null,
    artField: toArtField(r.art_field),
    shortDescription: r.short_description ?? null,
    inStock: r.in_stock ?? true,
    variants: (r.variants ?? []).map((v) => ({
      id: v.id,
      size: Number(v.size),
      unit: v.unit,
      price: Number(v.price),
      compareAtPrice: v.compare_at_price == null ? null : Number(v.compare_at_price),
      stockLevel: stockLevelOf(v.stock_status),
    })),
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

/**
 * Catalogue snapshot for the homepage narrative (rail, signature scene,
 * discovery grid, families). One query, full detail (notes, family, variants),
 * ordered by the admin's sort order. Capped — the homepage is editorial.
 */
export const getHomeCatalog = cache(async (limit = 24): Promise<ProductDetail[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(DETAIL_SELECT)
    .eq('active', true)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => toProductDetail(row));
});

/** Primary image of a product by slug (menu art, OG fallbacks). */
export const getPrimaryImageBySlug = cache(async (slug: string): Promise<string | null> => {
  if (!slug) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('product_images ( url, is_primary, sort_order )')
    .eq('slug', slug)
    .eq('active', true)
    .eq('archived', false)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imgs = ((data as any)?.product_images ?? []) as { url: string; is_primary: boolean; sort_order: number }[];
  const img = imgs.find((i) => i.is_primary) ?? imgs.sort((a, b) => a.sort_order - b.sort_order)[0];
  return img?.url ?? null;
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
  families: { slug: string; name: string; name_en?: string | null; description?: string | null; count?: number }[];
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
  sizes: number[];
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
    categories: f.categories ?? [],
    collections: f.collections ?? [],
    sizes: (f.sizes ?? []).map(Number).filter((n) => Number.isFinite(n)),
    price_min: f.price_min == null ? null : Number(f.price_min),
    price_max: f.price_max == null ? null : Number(f.price_max),
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
