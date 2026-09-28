import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listProducts, getFacets } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { CatalogView } from '@/components/store/catalog/CatalogView';

async function getCollection(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('slug, name, description, image_url, seo_title, seo_description')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) return { title: 'غير موجود', robots: { index: false } };
  const title = c.seo_title || c.name;
  const description = c.seo_description || c.description || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { title, description, images: c.image_url ? [c.image_url] : undefined },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const { filters, sort, page } = parseBrowseParams(sp);
  const [{ items, total, totalPages }, facets] = await Promise.all([
    listProducts({ filters: { ...filters, collection: slug }, sort, page, perPage: 12 }),
    getFacets(),
  ]);

  return (
    <CatalogView
      eyebrow="مجموعة"
      title={collection.name}
      description={collection.description}
      basePath={`/collections/${slug}`}
      searchParams={sp}
      facets={facets}
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
      lockCollection
      empty={{ title: 'المجموعة قيد التحضير', body: 'لا توجد عطور في هذه المجموعة بعد — تصفّح المجموعة كاملة.' }}
    />
  );
}
