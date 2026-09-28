'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GENDERS,
  GENDER_LABELS_AR,
  SEASONS,
  SEASON_LABELS_AR,
  OCCASIONS,
  OCCASION_LABELS_AR,
  SORT_OPTIONS,
  SORT_LABELS_AR,
  type SortOption,
} from '@/config/constants';
import { Icon } from '@/components/store/ui';
import type { Facets } from '@/lib/products/queries';

type Params = Record<string, string | undefined>;

function toList(v: string | undefined): string[] {
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

/**
 * Catalogue controls in the approved language: family chips inline, the rest
 * in a filter drawer, sort select. Everything is URL state (shareable, SEO,
 * back button) and is resolved server-side by list_products.
 */
export function CatalogToolbar({
  basePath,
  params,
  facets,
  total,
  lockCollection = false,
}: {
  basePath: string;
  params: Params;
  facets: Facets;
  total: number;
  lockCollection?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Params>(params);
  useEffect(() => setDraft(params), [params]);

  const families = toList(params.families);
  const sort = (params.sort as SortOption) || 'recommended';

  const activeCount = useMemo(() => {
    const keys = ['gender', 'sizes', 'seasons', 'occasions', 'brands', 'price_min', 'price_max', 'in_stock', ...(lockCollection ? [] : ['collection'])];
    return keys.filter((k) => !!params[k]).length;
  }, [params, lockCollection]);

  function go(next: Params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    sp.delete('page');
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }
  function toggleIn(key: string, value: string, src: Params = params) {
    const list = toList(src[key]);
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    return { ...src, [key]: next.length ? next.join(',') : undefined };
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) document.body.setAttribute('data-drawer-open', '');
    else document.body.removeAttribute('data-drawer-open');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const chip = (key: string, value: string, label: string) => {
    const on = toList(draft[key]).includes(value);
    return (
      <button key={value} type="button" className={on ? 'is-active' : ''} aria-pressed={on} onClick={() => setDraft(toggleIn(key, value, draft))}>
        {label}
      </button>
    );
  };

  return (
    <div className="vp-toolbar">
      <div className="vp-wrap vp-toolbar__row">
        <div className="vp-chips vp-chips--dark" role="group" aria-label="العائلات العطرية">
          <button type="button" className={families.length === 0 ? 'is-active' : ''} aria-pressed={families.length === 0} onClick={() => go({ ...params, families: undefined })}>
            الكل
          </button>
          {facets.families
            .filter((f) => (f.count ?? 1) > 0)
            .map((f) => (
              <button
                key={f.slug}
                type="button"
                className={families.includes(f.slug) ? 'is-active' : ''}
                aria-pressed={families.includes(f.slug)}
                onClick={() => go(toggleIn('families', f.slug))}
              >
                {f.name}
              </button>
            ))}
        </div>
        <div className="vp-toolbar__end">
          <span className="vp-toolbar__count" aria-live="polite">
            {total} {total === 1 ? 'عطر' : 'عطور'}
          </span>
          <button type="button" className="vp-toolbar__btn" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="vp-filters">
            <Icon name="filter" size={18} />
            <span>تصفية</span>
            {activeCount > 0 && <sup>{activeCount}</sup>}
          </button>
          <label className="vp-select">
            <span className="vp-sr">الترتيب</span>
            <select value={sort} onChange={(e) => go({ ...params, sort: e.target.value === 'recommended' ? undefined : e.target.value })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {SORT_LABELS_AR[o]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="vp-drawer vp-filters" id="vp-filters" data-open={open ? '' : undefined} aria-hidden={!open}>
        <button type="button" className="vp-drawer__scrim" aria-label="إغلاق" onClick={() => setOpen(false)} tabIndex={-1} />
        <form
          className="vp-drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-label="تصفية العطور"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            go(draft);
          }}
        >
          <header className="vp-drawer__head">
            <h2>تصفية</h2>
            <button type="button" className="vp-iconbtn" aria-label="إغلاق" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              <Icon name="close" />
            </button>
          </header>
          <div className="vp-filters__body">
            <fieldset>
              <legend>الفئة</legend>
              <div className="vp-chips">{GENDERS.map((g) => chip('gender', g, GENDER_LABELS_AR[g]))}</div>
            </fieldset>
            {facets.sizes.length > 0 && (
              <fieldset>
                <legend>الحجم</legend>
                <div className="vp-chips">{facets.sizes.map((s) => chip('sizes', String(s), `${s} مل`))}</div>
              </fieldset>
            )}
            <fieldset>
              <legend>السعر (د.ل)</legend>
              <div className="vp-filters__range">
                <label>
                  <span>من</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={facets.price_min != null ? String(Math.floor(facets.price_min)) : '0'}
                    value={draft.price_min ?? ''}
                    onChange={(e) => setDraft({ ...draft, price_min: e.target.value || undefined })}
                  />
                </label>
                <label>
                  <span>إلى</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={facets.price_max != null ? String(Math.ceil(facets.price_max)) : ''}
                    value={draft.price_max ?? ''}
                    onChange={(e) => setDraft({ ...draft, price_max: e.target.value || undefined })}
                  />
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>الموسم</legend>
              <div className="vp-chips">{SEASONS.map((s) => chip('seasons', s, SEASON_LABELS_AR[s]))}</div>
            </fieldset>
            <fieldset>
              <legend>المناسبة</legend>
              <div className="vp-chips">{OCCASIONS.map((o) => chip('occasions', o, OCCASION_LABELS_AR[o]))}</div>
            </fieldset>
            {!lockCollection && facets.collections.length > 0 && (
              <fieldset>
                <legend>المجموعة</legend>
                <div className="vp-chips">
                  {facets.collections.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      className={draft.collection === c.slug ? 'is-active' : ''}
                      aria-pressed={draft.collection === c.slug}
                      onClick={() => setDraft({ ...draft, collection: draft.collection === c.slug ? undefined : c.slug })}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {facets.brands.length > 1 && (
              <fieldset>
                <legend>العلامة</legend>
                <div className="vp-chips">{facets.brands.map((b) => chip('brands', b.slug, b.name))}</div>
              </fieldset>
            )}
            <label className="vp-check">
              <input
                type="checkbox"
                checked={draft.in_stock === '1'}
                onChange={(e) => setDraft({ ...draft, in_stock: e.target.checked ? '1' : undefined })}
              />
              <span>المتوفر فقط</span>
            </label>
          </div>
          <footer className="vp-drawer__foot vp-filters__foot">
            <button type="submit" className="vp-btn vp-btn--gold vp-btn--block" tabIndex={open ? 0 : -1}>
              <span>عرض النتائج</span>
            </button>
            <button
              type="button"
              className="vp-link"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                const cleared: Params = { families: params.families, sort: params.sort, q: params.q };
                if (lockCollection) cleared.collection = params.collection;
                setDraft(cleared);
                setOpen(false);
                go(cleared);
              }}
            >
              مسح الفلاتر
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
