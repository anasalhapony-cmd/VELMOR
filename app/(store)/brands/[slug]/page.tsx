import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listProducts, getFacets } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { CatalogView } from '@/components/store/catalog/CatalogView';

async function getBrand(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('brands')
    .select('slug, name, description, logo_url, seo_title, seo_description')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrand(slug);
  if (!b) return { title: 'غير موجود', robots: { index: false } };
  return {
    title: b.seo_title || b.name,
    description: b.seo_description || b.description || undefined,
    alternates: { canonical: `/brands/${slug}` },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await getBrand(slug);
  if (!brand) notFound();
  const { filters, sort, page } = parseBrowseParams(sp);
  const [{ items, total, totalPages }, facets] = await Promise.all([
    listProducts({ filters: { ...filters, brands: [slug] }, sort, page, perPage: 12 }),
    getFacets(),
  ]);
  return (
    <CatalogView
      eyebrow="العلامة"
      title={brand.name}
      description={brand.description}
      basePath={`/brands/${slug}`}
      searchParams={sp}
      facets={{ ...facets, brands: [] }}
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  );
}
