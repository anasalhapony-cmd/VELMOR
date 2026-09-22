'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { GENDERS, GENDER_LABELS_AR, SEASONS, SEASON_LABELS_AR } from '@/config/constants';
import type { Facets } from '@/lib/products/queries';

export function Filters({ facets, variant = 'sidebar' }: { facets: Facets; variant?: 'bar' | 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function toggleMulti(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    const current = (next.get(key) ?? '').split(',').filter(Boolean);
    const has = current.includes(value);
    const updated = has ? current.filter((v) => v !== value) : [...current, value];
    if (updated.length) next.set(key, updated.join(','));
    else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  function setSingle(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  function isActive(key: string, value: string) {
    return (params.get(key) ?? '').split(',').includes(value);
  }

  const activeCount = ['gender', 'families', 'brands', 'seasons', 'in_stock'].filter((k) => params.get(k)).length;

  const panel = (
    <div className="flex flex-col gap-7">
      <FilterGroup title="النوع">
        {GENDERS.map((g) => (
          <Chip key={g} active={isActive('gender', g)} onClick={() => toggleMulti('gender', g)}>
            {GENDER_LABELS_AR[g]}
          </Chip>
        ))}
      </FilterGroup>

      {facets.families.length > 0 && (
        <FilterGroup title="العائلة العطرية">
          {facets.families.map((f) => (
            <Chip key={f.slug} active={isActive('families', f.slug)} onClick={() => toggleMulti('families', f.slug)}>
              {f.name}
            </Chip>
          ))}
        </FilterGroup>
      )}

      {facets.brands.length > 0 && (
        <FilterGroup title="الماركة">
          {facets.brands.map((b) => (
            <Chip key={b.slug} active={isActive('brands', b.slug)} onClick={() => toggleMulti('brands', b.slug)}>
              {b.name}
            </Chip>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="الموسم">
        {SEASONS.map((s) => (
          <Chip key={s} active={isActive('seasons', s)} onClick={() => toggleMulti('seasons', s)}>
            {SEASON_LABELS_AR[s]}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup title="التوفر">
        <Chip active={params.get('in_stock') === '1'} onClick={() => setSingle('in_stock', params.get('in_stock') === '1' ? null : '1')}>
          المتوفر فقط
        </Chip>
      </FilterGroup>

      {activeCount > 0 && (
        <button onClick={() => router.push(pathname)} className="self-start text-sm text-ink-500 underline">
          مسح كل الفلاتر
        </button>
      )}
    </div>
  );

  // Desktop sidebar only.
  if (variant === 'sidebar') {
    return <aside className="hidden w-60 shrink-0 lg:block">{panel}</aside>;
  }

  // Mobile trigger + drawer only.
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline lg:hidden">
        <SlidersHorizontal size={16} />
        الفلاتر{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-80 max-w-[85%] overflow-y-auto bg-paper p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display-ar text-lg font-medium">الفلاتر</h2>
              <button onClick={() => setOpen(false)} aria-label="إغلاق"><X size={20} /></button>
            </div>
            {panel}
            <button onClick={() => setOpen(false)} className="btn-primary mt-8 w-full">
              عرض النتائج
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display-ar text-sm font-semibold text-ink">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink hover:border-ink'
      }`}
    >
      {active && <Check size={13} />}
      {children}
    </button>
  );
}
