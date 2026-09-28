import Link from 'next/link';
import { ProductTile } from '@/components/store/commerce/ProductTile';
import { CatalogToolbar } from '@/components/store/catalog/CatalogToolbar';
import { Icon } from '@/components/store/ui';
import type { Facets } from '@/lib/products/queries';
import type { ProductCard } from '@/types';
import type { RawSearchParams } from '@/lib/products/filter-params';

function flat(sp: RawSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    out[k] = Array.isArray(v) ? v.join(',') : v;
  }
  return out;
}

/** Shared catalogue page (all perfumes / collection / brand / search). */
export function CatalogView({
  eyebrow,
  title,
  script,
  description,
  basePath,
  searchParams,
  facets,
  items,
  total,
  page,
  totalPages,
  lockCollection = false,
  showToolbar = true,
  empty,
}: {
  eyebrow: string;
  title: string;
  script?: string;
  description?: string | null;
  basePath: string;
  searchParams: RawSearchParams;
  facets: Facets;
  items: ProductCard[];
  total: number;
  page: number;
  totalPages: number;
  lockCollection?: boolean;
  showToolbar?: boolean;
  empty?: { title: string; body: string };
}) {
  const params = flat(searchParams);
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== 'page') sp.set(k, v);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="vp-cat">
      <header className="vp-cat__hero">
        <div className="vp-wrap">
          <p className="vp-eyebrow vp-eyebrow--gold" data-reveal="mask">
            {eyebrow}
          </p>
          <h1 className="vp-cat__title" data-reveal="mask">
            <span>{title}</span>
          </h1>
          {script ? (
            <span className="vp-script vp-cat__script" aria-hidden="true">
              {script}
            </span>
          ) : null}
          {description ? (
            <p className="vp-cat__desc" data-reveal="up">
              {description}
            </p>
          ) : null}
        </div>
      </header>

      {showToolbar && (
        <CatalogToolbar basePath={basePath} params={params} facets={facets} total={total} lockCollection={lockCollection} />
      )}

      <section className="vp-cat__body" aria-label="العطور">
        <div className="vp-wrap">
          {items.length > 0 ? (
            <div className="vp-cat__grid">
              {items.map((p, i) => (
                <ProductTile key={p.id} product={p} index={i} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="vp-empty">
              <span className="vp-script" aria-hidden="true">
                nothing
              </span>
              <h2>{empty?.title ?? 'لا توجد نتائج مطابقة'}</h2>
              <p>{empty?.body ?? 'جرّب تعديل الفلاتر أو البحث بكلمة أخرى.'}</p>
              <Link href="/products" className="vp-btn vp-btn--ink" data-transition>
                <span>كل العطور</span>
                <Icon name="arrow" size={18} />
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="vp-pager" aria-label="ترقيم الصفحات">
              {page > 1 && (
                <Link href={pageHref(page - 1)} aria-label="الصفحة السابقة" className="vp-pager__step">
                  <Icon name="arrowBack" size={18} />
                </Link>
              )}
              {pages.map((p, i) => (
                <span key={p} className="vp-pager__group">
                  {i > 0 && p - pages[i - 1]! > 1 && <span className="vp-pager__gap">…</span>}
                  <Link href={pageHref(p)} aria-current={p === page ? 'page' : undefined} className={p === page ? 'is-on' : ''}>
                    {p}
                  </Link>
                </span>
              ))}
              {page < totalPages && (
                <Link href={pageHref(page + 1)} aria-label="الصفحة التالية" className="vp-pager__step">
                  <Icon name="arrow" size={18} />
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
