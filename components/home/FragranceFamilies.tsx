import Link from 'next/link';
import { getFacets } from '@/lib/products/queries';
import { SectionHeading } from '@/components/home/SectionHeading';

export async function FragranceFamilies() {
  const { families } = await getFacets();
  if (families.length === 0) return null;
  return (
    <section className="container-content py-section">
      <SectionHeading eyebrow="اكتشف حسب الرائحة" title="العائلات العطرية" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {families.map((f) => (
          <Link
            key={f.slug}
            href={`/products?families=${encodeURIComponent(f.slug)}`}
            className="group flex aspect-square flex-col items-center justify-center rounded-lg border border-ink/10 bg-paper-200 text-center transition-colors hover:border-gold hover:bg-paper"
          >
            <span className="font-display-ar text-lg font-medium text-ink">{f.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
