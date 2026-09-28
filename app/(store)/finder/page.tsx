import type { Metadata } from 'next';
import { getFacets, getHomeCatalog } from '@/lib/products/queries';
import { FinderExperience } from '@/components/store/finder/FinderExperience';

export const metadata: Metadata = {
  title: 'مستشار العطور',
  description: 'أجب عن أسئلة قصيرة ودع مستشار VELMOR يرشّح لك العطر الأنسب — ترشيح شفاف مبني على المكوّنات والعائلة والمناسبة.',
  alternates: { canonical: '/finder' },
};

export default async function FinderPage() {
  const [facets, catalog] = await Promise.all([getFacets(), getHomeCatalog(40)]);
  const counts = new Map<string, { slug: string; name: string; n: number }>();
  for (const p of catalog)
    for (const n of [...p.notes.top, ...p.notes.heart, ...p.notes.base]) {
      const e = counts.get(n.slug) ?? { slug: n.slug, name: n.name, n: 0 };
      e.n += 1;
      counts.set(n.slug, e);
    }
  return (
    <div className="vp-page vp-page--finder">
      <FinderExperience
        headingLevel="h1"
        variant="full"
        families={facets.families.filter((f) => (f.count ?? 1) > 0)}
        notes={[...counts.values()].sort((a, b) => b.n - a.n).slice(0, 8)}
      />
    </div>
  );
}
