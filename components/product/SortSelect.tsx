'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SORT_OPTIONS, SORT_LABELS_AR, type SortOption } from '@/config/constants';

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get('sort') as SortOption) || 'recommended';

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'recommended') next.delete('sort');
    else next.set('sort', value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-500">ترتيب:</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-ink/20 bg-paper px-3 py-2 text-sm outline-none focus:border-gold"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {SORT_LABELS_AR[o]}
          </option>
        ))}
      </select>
    </label>
  );
}
