import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listProducts } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SortSelect } from '@/components/product/SortSelect';
import { Pagination } from '@/components/product/Pagination';

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
  if (!c) return { title: 'غير موجود' };
  return { title: c.seo_title || c.name, description: c.seo_description || c.description || undefined };
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

  const { sort, page } = parseBrowseParams(sp);
  const perPage = 12;
  const { items, total, totalPages } = await listProducts({
    filters: { collection: slug },
    sort,
    page,
    perPage,
  });

  const makeHref = (p: number) => `/collections/${slug}?sort=${sort}&page=${p}`;

  return (
    <div className="container-content py-10">
      <header className="mb-8">
        <span className="eyebrow">مجموعة</span>
        <h1 className="mt-1 font-display-ar text-h1 font-medium">{collection.name}</h1>
        {collection.description && <p className="mt-2 max-w-prose text-ink-600">{collection.description}</p>}
        <p className="mt-2 text-sm text-ink-500">{total} منتج</p>
      </header>
      <div className="mb-6 flex justify-end border-y border-ink/10 py-3">
        <SortSelect />
      </div>
      {items.length > 0 ? (
        <>
          <ProductGrid products={items} />
          <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </>
      ) : (
        <p className="py-16 text-center text-ink-500">لا توجد منتجات في هذه المجموعة بعد.</p>
      )}
    </div>
  );
}
