import type { ReactNode } from 'react';
import { getHomepageSections } from '@/lib/cms/queries';
import { Hero } from '@/components/home/Hero';
import { ProductRail } from '@/components/home/ProductRail';
import { FragranceFamilies } from '@/components/home/FragranceFamilies';
import { ReviewsSection } from '@/components/home/ReviewsSection';
import {
  BrandStory,
  PerfumeFinderTeaser,
  WhyVelmor,
  DeliveryInfo,
  BrandStatement,
} from '@/components/home/sections';

export const revalidate = 120; // ISR — homepage refreshes every 2 minutes

// Maps a homepage_sections.key to the component that renders it. Sections the
// admin disables/reorders are respected via the DB ordering below.
const RENDERERS: Record<string, () => ReactNode> = {
  hero: () => <Hero key="hero" />,
  best_sellers: () => <ProductRail key="best" flag="best" eyebrow="الأكثر طلبًا" title="الأكثر مبيعًا" href="/products?flag=best" />,
  featured_products: () => <ProductRail key="featured" flag="featured" eyebrow="مختارة بعناية" title="منتجات مميزة" href="/products?flag=featured" />,
  new_arrivals: () => <ProductRail key="new" flag="new" eyebrow="جديدنا" title="وصل حديثًا" href="/products?flag=new" />,
  brand_story: () => <BrandStory key="story" />,
  perfume_finder: () => <PerfumeFinderTeaser key="finder" />,
  fragrance_families: () => <FragranceFamilies key="families" />,
  reviews: () => <ReviewsSection key="reviews" />,
  why_velmor: () => <WhyVelmor key="why" />,
  delivery_info: () => <DeliveryInfo key="delivery" />,
  brand_statement: () => <BrandStatement key="statement" />,
};

export default async function HomePage() {
  const sections = await getHomepageSections();
  const active = sections.filter((s) => RENDERERS[s.key]);
  // Fallback order if the table is empty (fresh install).
  const keys = active.length
    ? active.map((s) => s.key)
    : ['hero', 'best_sellers', 'brand_story', 'perfume_finder', 'fragrance_families', 'new_arrivals', 'reviews', 'why_velmor', 'delivery_info', 'brand_statement'];

  return <>{keys.map((k) => RENDERERS[k]?.())}</>;
}
