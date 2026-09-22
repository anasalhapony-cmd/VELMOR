import { SORT_OPTIONS, type SortOption } from '@/config/constants';

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface ParsedBrowse {
  filters: Record<string, unknown>;
  sort: SortOption;
  page: number;
}

function arr(v: string | string[] | undefined): string[] | undefined {
  if (v == null) return undefined;
  const list = Array.isArray(v) ? v : v.split(',');
  const clean = list.map((s) => s.trim()).filter(Boolean);
  return clean.length ? clean : undefined;
}
function str(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}
function numStr(v: string | string[] | undefined): string | undefined {
  const s = str(v);
  return s && !Number.isNaN(Number(s)) ? s : undefined;
}

/** Parse URL search params into the shape list_products expects. */
export function parseBrowseParams(sp: RawSearchParams): ParsedBrowse {
  const filters: Record<string, unknown> = {};
  const set = (k: string, val: unknown) => {
    if (val !== undefined) filters[k] = val;
  };
  set('genders', arr(sp.gender ?? sp.genders));
  set('brands', arr(sp.brands ?? sp.brand));
  set('families', arr(sp.families ?? sp.family));
  set('seasons', arr(sp.seasons ?? sp.season));
  set('occasions', arr(sp.occasions ?? sp.occasion));
  set('notes', arr(sp.notes));
  set('collection', str(sp.collection));
  set('category', str(sp.category));
  set('flag', str(sp.flag));
  set('q', str(sp.q));
  set('price_min', numStr(sp.price_min));
  set('price_max', numStr(sp.price_max));
  if (str(sp.in_stock) === '1' || str(sp.in_stock) === 'true') filters.in_stock = true;

  const sortRaw = str(sp.sort) as SortOption | undefined;
  const sort: SortOption = sortRaw && SORT_OPTIONS.includes(sortRaw) ? sortRaw : 'recommended';
  const page = Math.max(1, Number(str(sp.page)) || 1);
  return { filters, sort, page };
}
