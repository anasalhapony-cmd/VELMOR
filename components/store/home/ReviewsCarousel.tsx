'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/store/ui';
import type { HomeReview } from '@/lib/reviews/queries';

/** Approved customer reviews only — one large quote at a time, auto-advancing. */
export function ReviewsCarousel({ reviews }: { reviews: HomeReview[] }) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const n = reviews.length;

  useEffect(() => {
    if (n < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) return;
      setI((x) => (x + 1) % n);
      setRun((x) => x + 1);
    }, 6500);
    return () => window.clearInterval(t);
  }, [n]);

  // No approved reviews yet: keep the section (and the page rhythm of the
  // approved design) with an honest invitation — never sample testimonials.
  if (n === 0) {
    return (
      <section className="vp-reviews vp-reviews--empty" aria-labelledby="vp-rev-title">
        <div className="vp-wrap">
          <div className="vp-reviews__head">
            <p id="vp-rev-title" className="vp-eyebrow" data-reveal="mask">
              بكلماتهم
            </p>
          </div>
          <div className="vp-reviews__stage">
            <figure className="vp-review is-on">
              <blockquote>
                <span className="vp-review__mark" aria-hidden="true">
                  ”
                </span>
                كن أول من يكتب رأيه في عطور VELMOR.
              </blockquote>
              <figcaption>
                <Link href="/products" data-transition>
                  اختر عطرك، ثم شاركنا رأيك من صفحته
                </Link>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="vp-reviews" aria-labelledby="vp-rev-title" ref={ref}>
      <div className="vp-wrap">
        <div className="vp-reviews__head">
          <p id="vp-rev-title" className="vp-eyebrow" data-reveal="mask">
            بكلماتهم
          </p>
          {n > 1 && (
            <div className="vp-reviews__nav" role="tablist" aria-label="آراء العملاء">
              {reviews.map((r, j) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={j === i}
                  aria-label={`رأي ${j + 1} من ${n}`}
                  className={j === i ? `is-run run-${run % 2}` : ''}
                  onClick={() => {
                    setI(j);
                    setRun((x) => x + 1);
                  }}
                >
                  <i />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="vp-reviews__stage">
          {reviews.map((r, j) => (
            <figure key={r.id} className={`vp-review ${j === i ? 'is-on' : ''}`} aria-hidden={j !== i}>
              <div className="vp-review__stars" role="img" aria-label={`${r.rating} من 5`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= r.rating ? 'is-on' : ''}>
                    <Icon name="star" size={18} />
                  </span>
                ))}
              </div>
              <blockquote>
                <span className="vp-review__mark" aria-hidden="true">
                  ”
                </span>
                {r.body || r.title}
              </blockquote>
              <figcaption>
                <b>{r.displayName}</b>
                <Link href={`/products/${r.productSlug}`} dir="ltr" tabIndex={j === i ? 0 : -1}>
                  {r.productName}
                </Link>
                {r.isVerified ? <em>مشترٍ موثّق</em> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
