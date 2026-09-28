import { BRAND, SITE_URL, LOCALE } from '@/config/site';
import type { ProductDetail } from '@/types';

/** JSON-LD for a product detail page (Product + Offer). */
export function productJsonLd(p: ProductDetail) {
  const prices = p.variants.map((v) => v.price).filter((n) => n > 0);
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const anyInStock = p.variants.some((v) => v.stockLevel !== 'OUT_OF_STOCK');
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nameAr || p.name,
    alternateName: p.name,
    description: p.shortDescription || p.description || undefined,
    brand: { '@type': 'Brand', name: p.brand || BRAND.name },
    image: p.images.map((i) => new URL(i.url, SITE_URL).toString()),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: LOCALE.currency,
      lowPrice: low,
      highPrice: high,
      offerCount: p.variants.length,
      availability: anyInStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(p.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.ratingAvg,
            reviewCount: p.ratingCount,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.url, SITE_URL).toString(),
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    url: SITE_URL,
    logo: new URL('/brand/velmor-logo-gold.png', SITE_URL).toString(),
  };
}
