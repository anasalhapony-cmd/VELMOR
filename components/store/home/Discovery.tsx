'use client';

import { useMemo, useState } from 'react';
import { ProductTile } from '@/components/store/commerce/ProductTile';
import type { ProductCard } from '@/types';

/** Homepage "shop the collection" — asymmetric editorial grid with real family filters. */
export function Discovery({
  products,
  families,
  title,
  eyebrow,
}: {
  products: ProductCard[];
  families: { slug: string; name: string }[];
  title?: string | null;
  eyebrow?: string | null;
}) {
  const [filter, setFilter] = useState('');
  const fams = useMemo(
    () => families.filter((f) => products.some((p) => p.familySlug === f.slug)),
    [families, products]
  );
  const shown = filter ? products.filter((p) => p.familySlug === filter) : products;
  if (products.length === 0) return null;

  return (
    <section className="vp-disc" aria-labelledby="vp-disc-title">
      <div className="vp-wrap">
        <div className="vp-disc__head">
          <div>
            <p className="vp-eyebrow" data-reveal="mask">
              {eyebrow || 'تسوّق المجموعة'}
            </p>
            <h2 id="vp-disc-title" className="vp-h2 vp-h2--ink" data-reveal="mask">
              <span>{title || 'المسها بعينك أولًا.'}</span>
            </h2>
          </div>
          {fams.length > 1 && (
            <div className="vp-chips" role="group" aria-label="تصفية حسب العائلة" data-reveal="up">
              <button type="button" className={!filter ? 'is-active' : ''} aria-pressed={!filter} onClick={() => setFilter('')}>
                الكل <sup>{products.length}</sup>
              </button>
              {fams.map((f) => (
                <button
                  key={f.slug}
                  type="button"
                  className={filter === f.slug ? 'is-active' : ''}
                  aria-pressed={filter === f.slug}
                  onClick={() => setFilter(f.slug)}
                >
                  {f.name} <sup>{products.filter((p) => p.familySlug === f.slug).length}</sup>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="vp-disc__grid" aria-live="polite">
          {shown.map((p, i) => (
            <ProductTile key={p.id} product={p} index={i} variant="editorial" />
          ))}
        </div>
      </div>
    </section>
  );
}
