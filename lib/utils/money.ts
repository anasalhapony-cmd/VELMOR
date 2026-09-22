import { LOCALE } from '@/config/site';

/**
 * Money handling for VELMOR.
 *
 * The Libyan Dinar (LYD) has a 1/1000 subunit (dirham/millime). To avoid all
 * floating-point rounding errors, every monetary calculation in the order and
 * pricing engine is performed in INTEGER MILLIMES (1 LYD = 1000 millimes).
 * Values are stored in Postgres as NUMERIC(12,3) (dinars) and converted at the
 * boundary.
 *
 * Display is centralised here — never format currency ad hoc in components.
 */

export const MILLIMES_PER_DINAR = 1000;

/** Convert a dinar amount (number | string from NUMERIC) to integer millimes. */
export function toMillimes(dinars: number | string): number {
  const n = typeof dinars === 'string' ? Number(dinars) : dinars;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * MILLIMES_PER_DINAR);
}

/** Convert integer millimes back to a dinar number. */
export function fromMillimes(millimes: number): number {
  return Math.round(millimes) / MILLIMES_PER_DINAR;
}

const groupFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/**
 * Format a dinar amount for customers, e.g. `150 د.ل`, `1,500 د.ل`, `5.500 د.ل`.
 * Whole amounts show no decimals; fractional amounts show up to 3 (millimes).
 * Thousands are grouped for readability.
 */
export function formatPrice(
  dinars: number | string,
  opts: { withSymbol?: boolean } = {}
): string {
  const { withSymbol = true } = opts;
  const n = typeof dinars === 'string' ? Number(dinars) : dinars;
  const safe = Number.isFinite(n) ? n : 0;
  const num = groupFormatter.format(safe);
  return withSymbol ? `${num} ${LOCALE.currencySymbol}` : num;
}

/** Format from integer millimes directly. */
export function formatMillimes(millimes: number, opts?: { withSymbol?: boolean }): string {
  return formatPrice(fromMillimes(millimes), opts);
}

/** Discount percentage (integer, floored) between an original and current price. */
export function discountPercent(original: number, current: number): number {
  if (!original || original <= 0 || current >= original) return 0;
  return Math.floor(((original - current) / original) * 100);
}
