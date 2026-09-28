import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Do not index admin, APIs, or private/customer-flow pages (§84).
        disallow: ['/admin', '/api', '/cart', '/checkout', '/wishlist', '/track-order'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
