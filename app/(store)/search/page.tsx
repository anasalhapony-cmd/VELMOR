import type { Metadata } from 'next';
import { listProducts, getFacets } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { recordEvent } from '@/lib/analytics/track';
import { CatalogView } from '@/components/store/catalog/CatalogView';

export const metadata: Metadata = { title: 'البحث', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 80) : '';
  const { filters, sort, page } = parseBrowseParams(sp);
  const [res, facets] = await Promise.all([
    q ? listProducts({ filters: { ...filters, q }, sort, page, perPage: 12 }) : Promise.resolve(null),
    getFacets(),
  ]);
  if (q && page === 1) void recordEvent('search', { meta: { q: q.slice(0, 60), results: res?.total ?? 0, source: 'page' } });

  return (
    <CatalogView
      eyebrow="البحث"
      title={q ? `«${q}»` : 'ابحث عن عطرك'}
      description={q ? `${res?.total ?? 0} نتيجة مطابقة` : 'اكتب اسم عطر، عائلة عطرية، أو مكوّنًا مثل العود أو البرغموت.'}
      basePath="/search"
      searchParams={sp}
      facets={facets}
      items={res?.items ?? []}
      total={res?.total ?? 0}
      page={page}
      totalPages={res?.totalPages ?? 0}
      showToolbar={!!q}
      empty={
        q
          ? { title: 'لا توجد نتائج', body: 'جرّب كلمة أخرى — أو دع مستشار العطور يختار لك.' }
          : { title: 'ماذا تبحث عنه؟', body: 'استخدم زر البحث في الأعلى أو تصفّح المجموعة.' }
      }
    />
  );
}
