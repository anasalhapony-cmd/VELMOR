import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/config/site';

// Catalog is dynamic; regenerate on request so new products appear.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    '', '/products', '/finder', '/track-order', '/faq',
  ].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.7 }));

  try {
    const supabase = await createClient();
    const [{ data: products }, { data: collections }, { data: brands }, { data: pages }] = await Promise.all([
      supabase.from('products').select('slug, updated_at').eq('active', true).eq('archived', false),
      supabase.from('collections').select('slug, updated_at').eq('active', true),
      supabase.from('brands').select('slug, updated_at').eq('active', true),
      supabase.from('pages').select('slug, updated_at').eq('active', true).eq('approved', true),
    ]);

    const dyn: MetadataRoute.Sitemap = [];
    for (const p of products ?? []) dyn.push({ url: `${base}/products/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.8 });
    for (const c of collections ?? []) dyn.push({ url: `${base}/collections/${c.slug}`, lastModified: new Date(c.updated_at), priority: 0.6 });
    for (const b of brands ?? []) dyn.push({ url: `${base}/brands/${b.slug}`, lastModified: new Date(b.updated_at), priority: 0.6 });
    for (const pg of pages ?? []) dyn.push({ url: `${base}/pages/${pg.slug}`, lastModified: new Date(pg.updated_at), priority: 0.4 });
    return [...staticRoutes, ...dyn];
  } catch {
    return staticRoutes;
  }
}
