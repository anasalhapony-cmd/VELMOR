import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listProducts } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SortSelect } from '@/components/product/SortSelect';
import { Pagination } from '@/components/product/Pagination';

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
  if (!b) return { title: 'غير موجود' };
  return { title: b.seo_title || b.name, description: b.seo_description || b.description || undefined };
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

  const { sort, page } = parseBrowseParams(sp);
  const perPage = 12;
  const { items, total, totalPages } = await listProducts({
    filters: { brands: [slug] },
    sort,
    page,
    perPage,
  });

  const makeHref = (p: number) => `/brands/${slug}?sort=${sort}&page=${p}`;

  return (
    <div className="container-content py-10">
      <header className="mb-8">
        <span className="eyebrow">الماركة</span>
        <h1 className="mt-1 font-display-ar text-h1 font-medium">{brand.name}</h1>
        {brand.description && <p className="mt-2 max-w-prose text-ink-600">{brand.description}</p>}
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
        <p className="py-16 text-center text-ink-500">لا توجد منتجات لهذه الماركة بعد.</p>
      )}
    </div>
  );
}
