import type { Metadata } from 'next';
import { listProducts, getFacets } from '@/lib/products/queries';
import { parseBrowseParams, type RawSearchParams } from '@/lib/products/filter-params';
import { CatalogView } from '@/components/store/catalog/CatalogView';

const FLAG_TITLES: Record<string, { title: string; eyebrow: string }> = {
  new: { title: 'وصل حديثًا', eyebrow: 'الجديد' },
  best: { title: 'الأكثر مبيعًا', eyebrow: 'الأكثر طلبًا' },
  featured: { title: 'مختارات VELMOR', eyebrow: 'مختارة بعناية' },
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const flag = typeof sp.flag === 'string' ? FLAG_TITLES[sp.flag] : undefined;
  const title = flag?.title ?? 'كل العطور';
  const filtered = Object.keys(sp).some((k) => k !== 'flag');
  return {
    title,
    description: 'تسوّق عطور VELMOR للرجال في ليبيا — عائلات خشبية وشرقية ومنعشة، توصيل منزلي والدفع عند الاستلام.',
    alternates: { canonical: flag ? `/products?flag=${sp.flag}` : '/products' },
    // Filter/sort permutations are not separate documents.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const { filters, sort, page } = parseBrowseParams(sp);
  const [{ items, total, totalPages }, facets] = await Promise.all([
    listProducts({ filters, sort, page, perPage: 12 }),
    getFacets(),
  ]);
  const flag = typeof sp.flag === 'string' ? FLAG_TITLES[sp.flag] : undefined;

  return (
    <CatalogView
      eyebrow={flag?.eyebrow ?? 'المجموعة'}
      title={flag?.title ?? 'كل العطور'}
      script="collection"
      description="عطور بتوقيع VELMOR — من الخشب الداكن إلى الانتعاش الصافي. اختر ما يشبه حضورك."
      basePath="/products"
      searchParams={sp}
      facets={facets}
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  );
}
