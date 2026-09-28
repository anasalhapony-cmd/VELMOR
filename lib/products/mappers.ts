import { stockLevel, type NoteTier } from '@/config/constants';
import type { ArtField, CardVariant, ProductCard, ProductDetail, VariantPublic, NotePyramid } from '@/types';

/**
 * Shape the loosely-typed rows returned by the Supabase select() joins into the
 * app-facing ProductCard / ProductDetail. Kept in one place so public-facing
 * projections never accidentally leak internal fields.
 */

type Num = number | string | null | undefined;
const num = (v: Num): number => (v == null ? 0 : typeof v === 'string' ? Number(v) : v);

const ART_FIELDS: readonly ArtField[] = ['ink', 'paper', 'pine', 'gold', 'char'];
export function toArtField(v: unknown): ArtField {
  return typeof v === 'string' && (ART_FIELDS as readonly string[]).includes(v) ? (v as ArtField) : 'ink';
}

interface RawVariant {
  id: string;
  size: Num;
  unit: string;
  price: Num;
  compare_at_price: Num;
  active: boolean;
  stock_status?: string | null;
  stock_quantity?: number | null; // present only for admin queries
  position?: number;
}

function toVariant(v: RawVariant): VariantPublic {
  const level =
    v.stock_status === 'IN_STOCK' || v.stock_status === 'LOW_STOCK' || v.stock_status === 'OUT_OF_STOCK'
      ? v.stock_status
      : typeof v.stock_quantity === 'number'
        ? stockLevel(v.stock_quantity)
        : 'IN_STOCK';
  return {
    id: v.id,
    size: num(v.size),
    unit: v.unit,
    price: num(v.price),
    compareAtPrice: v.compare_at_price == null ? null : num(v.compare_at_price),
    stockLevel: level,
    active: v.active,
  };
}

interface RawProduct {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  gender: ProductCard['gender'];
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  rating_avg: Num;
  rating_count: number;
  brands?: { name: string } | { name: string }[] | null;
  product_images?: { url: string; alt: string | null; is_primary: boolean; sort_order: number }[];
  product_variants?: RawVariant[];
  art_field?: string | null;
  short_description?: string | null;
  fragrance_families?: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

function brandName(b: RawProduct['brands']): string | null {
  if (!b) return null;
  return Array.isArray(b) ? (b[0]?.name ?? null) : b.name;
}

function primaryImage(imgs: RawProduct['product_images']): string | null {
  if (!imgs || imgs.length === 0) return null;
  const primary = imgs.find((i) => i.is_primary);
  return (primary ?? [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0])?.url ?? null;
}

function cardVariants(vs: RawVariant[]): CardVariant[] {
  return vs
    .filter((v) => v.active)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || num(a.size) - num(b.size))
    .map((v) => {
      const pub = toVariant(v);
      return {
        id: pub.id,
        size: pub.size,
        unit: pub.unit,
        price: pub.price,
        compareAtPrice: pub.compareAtPrice,
        stockLevel: pub.stockLevel,
      };
    });
}

export function toProductCard(p: RawProduct): ProductCard {
  const activeVariants = (p.product_variants ?? []).filter((v) => v.active);
  const prices = activeVariants.map((v) => num(v.price)).filter((n) => n > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const cheapest = activeVariants
    .filter((v) => num(v.price) === minPrice)
    .map((v) => (v.compare_at_price == null ? null : num(v.compare_at_price)))[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameAr: p.name_ar,
    brand: brandName(p.brands),
    minPrice,
    compareAtPrice: cheapest ?? null,
    image: primaryImage(p.product_images),
    ratingAvg: num(p.rating_avg),
    ratingCount: p.rating_count ?? 0,
    gender: p.gender,
    isNew: p.is_new_arrival,
    isBestSeller: p.is_best_seller,
    isFeatured: p.is_featured,
    family: famOf(p.fragrance_families)?.name ?? null,
    familySlug: famOf(p.fragrance_families)?.slug ?? null,
    artField: toArtField(p.art_field),
    shortDescription: p.short_description ?? null,
    inStock: activeVariants.some((v) => toVariant(v).stockLevel !== 'OUT_OF_STOCK'),
    variants: cardVariants(p.product_variants ?? []),
  };
}

function famOf(f: RawProduct['fragrance_families']): { slug: string; name: string } | null {
  if (!f) return null;
  return Array.isArray(f) ? (f[0] ?? null) : f;
}

interface RawDetail extends RawProduct {
  description: string | null;
  short_description: string | null;
  concentration: ProductDetail['concentration'];
  season: ProductDetail['season'];
  occasions: ProductDetail['occasions'];
  longevity: number | null;
  sillage: number | null;
  seo_title: string | null;
  seo_description: string | null;
  inspiration_profile?: string | null;
  freshness?: number | null;
  sweetness?: number | null;
  product_notes?: {
    tier: NoteTier;
    position: number;
    fragrance_notes: RawNote | RawNote[] | null;
  }[];
}

type RawNote = { slug: string; name: string; name_en?: string | null };
function noteRef(n: RawNote | RawNote[] | null) {
  const r = !n ? null : Array.isArray(n) ? (n[0] ?? null) : n;
  return r ? { slug: r.slug, name: r.name, nameEn: r.name_en ?? null } : null;
}

export function toProductDetail(p: RawDetail): ProductDetail {
  const card = toProductCard(p);
  const pyramid: NotePyramid = { top: [], heart: [], base: [] };
  for (const pn of (p.product_notes ?? []).slice().sort((a, b) => a.position - b.position)) {
    const ref = noteRef(pn.fragrance_notes);
    if (!ref) continue;
    if (pn.tier === 'TOP') pyramid.top.push(ref);
    else if (pn.tier === 'HEART') pyramid.heart.push(ref);
    else pyramid.base.push(ref);
  }
  const fam = famOf(p.fragrance_families);
  return {
    ...card,
    description: p.description,
    shortDescription: p.short_description,
    concentration: p.concentration,
    season: p.season,
    occasions: p.occasions ?? [],
    longevity: p.longevity,
    sillage: p.sillage,
    familySlug: fam?.slug ?? null,
    familyName: fam?.name ?? null,
    images: (p.product_images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ url: i.url, alt: i.alt })),
    variants: (p.product_variants ?? [])
      .filter((v) => v.active)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(toVariant),
    notes: pyramid,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    artField: toArtField(p.art_field),
    inspirationProfile: p.inspiration_profile ?? null,
    freshness: p.freshness ?? null,
    sweetness: p.sweetness ?? null,
  };
}
