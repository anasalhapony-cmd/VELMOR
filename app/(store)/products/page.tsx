import type { Metadata } from 'next';
import { listProducts, getFacets } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Filters } from '@/components/product/Filters';
import { SortSelect } from '@/components/product/SortSelect';
import { Pagination } from '@/components/product/Pagination';

export const metadata: Metadata = {
  title: 'كل العطور',
  description: 'تصفّح مجموعة عطور VELMOR الفاخرة للرجال.',
};

const FLAG_TITLES: Record<string, string> = {
  new: 'وصل حديثًا',
  best: 'الأكثر مبيعًا',
  featured: 'منتجات مميزة',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const { filters, sort, page } = parseBrowseParams(sp);
  const perPage = 12;

  const [{ items, total, totalPages }, facets] = await Promise.all([
    listProducts({ filters, sort, page, perPage }),
    getFacets(),
  ]);

  const flag = typeof sp.flag === 'string' ? sp.flag : undefined;
  const q = typeof sp.q === 'string' ? sp.q : undefined;
  const heading = q ? `نتائج: ${q}` : flag && FLAG_TITLES[flag] ? FLAG_TITLES[flag] : 'كل العطور';

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v == null) continue;
      params.set(k, Array.isArray(v) ? v.join(',') : v);
    }
    params.set('page', String(p));
    return `/products?${params.toString()}`;
  };

  return (
    <div className="container-content py-10">
      <header className="mb-8">
        <h1 className="font-display-ar text-h1 font-medium">{heading}</h1>
        <p className="mt-1 text-sm text-ink-500">{total} منتج</p>
      </header>

      <div className="flex items-center justify-between gap-4 border-y border-ink/10 py-3">
        <Filters facets={facets} variant="bar" />
        <SortSelect />
      </div>

      <div className="mt-8 flex gap-10">
        <Filters facets={facets} variant="sidebar" />
        <div className="min-w-0 flex-1">
          {items.length > 0 ? (
            <>
              <ProductGrid products={items} />
              <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
            </>
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-ink/20 py-24 text-center">
              <p className="font-display-ar text-h3 text-ink">لا توجد نتائج مطابقة</p>
              <p className="mt-2 text-sm text-ink-500">جرّب تعديل الفلاتر أو البحث بكلمة أخرى.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
