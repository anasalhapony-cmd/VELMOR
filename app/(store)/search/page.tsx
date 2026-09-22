import type { Metadata } from 'next';
import { listProducts } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SortSelect } from '@/components/product/SortSelect';
import { Pagination } from '@/components/product/Pagination';

export const metadata: Metadata = { title: 'البحث', robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const { sort, page } = parseBrowseParams(sp);
  const perPage = 12;

  const { items, total, totalPages } = q
    ? await listProducts({ filters: { q }, sort, page, perPage })
    : { items: [], total: 0, totalPages: 0 };

  const makeHref = (p: number) => `/search?q=${encodeURIComponent(q)}&sort=${sort}&page=${p}`;

  return (
    <div className="container-content py-10">
      <header className="mb-8">
        <h1 className="font-display-ar text-h1 font-medium">{q ? `نتائج البحث عن: ${q}` : 'البحث'}</h1>
        {q && <p className="mt-1 text-sm text-ink-500">{total} نتيجة</p>}
      </header>

      {!q ? (
        <p className="py-16 text-center text-ink-500">اكتب كلمة للبحث عن عطر، ماركة، أو نوتة عطرية.</p>
      ) : items.length > 0 ? (
        <>
          <div className="mb-6 flex justify-end border-y border-ink/10 py-3">
            <SortSelect />
          </div>
          <ProductGrid products={items} />
          <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </>
      ) : (
        <div className="grid place-items-center py-24 text-center">
          <p className="font-display-ar text-h3">لا توجد نتائج</p>
          <p className="mt-2 text-sm text-ink-500">جرّب كلمة بحث أخرى.</p>
        </div>
      )}
    </div>
  );
}
