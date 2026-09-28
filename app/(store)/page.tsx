import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getHomepageSections, getBlocksFor } from '@/lib/cms/queries';
import { getHomeCatalog, getFacets } from '@/lib/products/queries';
import { listLatestApprovedReviews } from '@/lib/reviews/queries';
import { getSettings, settingString } from '@/lib/settings';
import { DEFAULT_WHATSAPP, BRAND } from '@/config/site';
import {
  HeroSection,
  MarqueeSection,
  StatementSection,
  RailSection,
  FamiliesSection,
  SignatureSection,
  LifestyleSection,
  FinaleSection,
  ValuesSection,
} from '@/components/store/home/sections';
import { Discovery } from '@/components/store/home/Discovery';
import { ReviewsCarousel } from '@/components/store/home/ReviewsCarousel';
import { FinderExperience } from '@/components/store/finder/FinderExperience';
import type { ProductCard, ProductDetail } from '@/types';

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — حضورٌ لا يُشرَح | عطور رجالية ليبية` },
  description: BRAND.descriptionAr,
  alternates: { canonical: '/' },
};

/** The approved narrative order; admin toggles/reorders via homepage_sections. */
const DEFAULT_ORDER = [
  'hero',
  'marquee',
  'brand_story',
  'best_sellers',
  'fragrance_families',
  'signature',
  'perfume_finder',
  'collection_grid',
  'lifestyle',
  'reviews',
  'brand_statement',
] as const;

const BLOCK_KEYS = [
  'hero',
  'marquee',
  'brand_story',
  'best_sellers',
  'fragrance_families',
  'signature',
  'collection_grid',
  'lifestyle',
  'brand_statement',
  'why_velmor',
] as const;

function toCard(p: ProductDetail): ProductCard {
  const prices = p.variants.map((v) => v.price);
  const min = prices.length ? Math.min(...prices) : null;
  const cheapest = p.variants.find((v) => v.price === min);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameAr: p.nameAr,
    brand: p.brand,
    minPrice: min,
    compareAtPrice: cheapest?.compareAtPrice ?? null,
    image: p.images[0]?.url ?? null,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    gender: p.gender,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    family: p.familyName,
    familySlug: p.familySlug,
    artField: p.artField,
    shortDescription: p.shortDescription,
    inStock: p.variants.some((v) => v.stockLevel !== 'OUT_OF_STOCK'),
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      unit: v.unit,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stockLevel: v.stockLevel,
    })),
  };
}

export default async function HomePage() {
  const [sections, blocks, catalog, facets, reviews, settings] = await Promise.all([
    getHomepageSections(),
    getBlocksFor(BLOCK_KEYS),
    getHomeCatalog(24),
    getFacets(),
    listLatestApprovedReviews(6),
    getSettings(),
  ]);

  const whatsapp = settingString(settings, 'whatsapp_number', DEFAULT_WHATSAPP);
  const b = (k: string) => blocks[k]?.[0];
  const sectionCfg = (k: string) => {
    const c = sections.find((s) => s.key === k)?.config;
    return c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, unknown>) : {};
  };
  const byFlag = (flag: unknown) =>
    flag === 'best'
      ? catalog.filter((p) => p.isBestSeller)
      : flag === 'new'
        ? catalog.filter((p) => p.isNew)
        : flag === 'featured'
          ? catalog.filter((p) => p.isFeatured)
          : catalog;

  const sigSlug = settingString(settings, 'home_signature_product');
  const signature = catalog.find((p) => p.slug === sigSlug) ?? catalog.find((p) => p.isFeatured) ?? catalog[0];
  // Brand render shipped in /public — the cinematic sections never collapse
  // when the catalogue (or a product's photos) is still empty.
  const BRAND_BOTTLE = '/images/brand/hero-bottle.webp';
  const heroFallback = signature?.images[0]?.url ?? BRAND_BOTTLE;
  const lifestyleImage =
    catalog.find((p) => p.artField === 'pine')?.images[0]?.url ?? catalog[1]?.images[0]?.url ?? heroFallback;

  const noteCounts = new Map<string, { slug: string; name: string; n: number }>();
  for (const p of catalog)
    for (const n of [...p.notes.top, ...p.notes.heart, ...p.notes.base]) {
      const e = noteCounts.get(n.slug) ?? { slug: n.slug, name: n.name, n: 0 };
      e.n += 1;
      noteCounts.set(n.slug, e);
    }
  const finderNotes = [...noteCounts.values()].sort((a, c) => c.n - a.n).slice(0, 8);
  // Approved design lists every active family (also those without a product
  // yet); the finder then explains its closest honest match.
  const finderFamilies = facets.families;
  const cards = catalog.map(toCard);

  const RENDERERS: Record<string, () => ReactNode> = {
    hero: () => <HeroSection key="hero" block={b('hero')} fallbackImage={heroFallback} />,
    marquee: () => <MarqueeSection key="marquee" block={b("marquee")} />,
    brand_story: () => <StatementSection key="story" block={b('brand_story')} />,
    best_sellers: () => (
      <RailSection key="rail" block={b('best_sellers')} products={byFlag(sectionCfg('best_sellers').flag).slice(0, 10)} />
    ),
    new_arrivals: () => (
      <RailSection key="new" anchor="new" products={catalog.filter((p) => p.isNew).slice(0, 10)} />
    ),
    featured_products: () => (
      <RailSection key="featured" anchor="featured" products={catalog.filter((p) => p.isFeatured).slice(0, 10)} />
    ),
    fragrance_families: () => (
      <FamiliesSection key="families" block={b('fragrance_families')} families={facets.families} products={catalog} />
    ),
    signature: () => <SignatureSection key="signature" product={signature} block={b('signature')} />,
    perfume_finder: () => <FinderExperience key="finder" families={finderFamilies} notes={finderNotes} />,
    collection_grid: () => (
      <Discovery
        key="grid"
        products={cards.slice(0, 10)}
        families={facets.families}
        title={b('collection_grid')?.title}
        eyebrow={b('collection_grid')?.subtitle}
      />
    ),
    lifestyle: () => <LifestyleSection key="life" block={b('lifestyle')} image={lifestyleImage} />,
    reviews: () => <ReviewsCarousel key="reviews" reviews={reviews} />,
    brand_statement: () => <FinaleSection
        key="finale"
        block={b('brand_statement')}
        whatsapp={whatsapp}
        deliveryLine={settingString(settings, 'delivery_tagline', 'توصيل داخل بنغازي')}
      />,
    why_velmor: () => <ValuesSection key="values" blocks={blocks['why_velmor'] ?? []} />,
    delivery_info: () => <ValuesSection key="delivery" blocks={[]} />,
  };

  const active = sections.filter((s) => RENDERERS[s.key]).map((s) => s.key);
  const keys = active.length ? active : [...DEFAULT_ORDER];

  return <>{keys.map((k) => RENDERERS[k]?.())}</>;
}
