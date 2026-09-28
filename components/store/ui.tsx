/**
 * Storefront primitives from the approved design (server-safe, no hooks).
 */
import type { CSSProperties, ReactNode } from 'react';
import { formatPrice } from '@/lib/utils/money';

/** Style object that may carry CSS custom properties (e.g. { '--i': 2 }). */
export function cv(o: Record<string, string | number>): CSSProperties {
  return o as CSSProperties;
}

export type IconName =
  | 'search' | 'heart' | 'bag' | 'menu' | 'arrow' | 'arrowBack' | 'plus' | 'minus' | 'close' | 'star'
  | 'whatsapp' | 'truck' | 'cash' | 'filter' | 'check' | 'trash' | 'gift' | 'alert';

const PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  menu: (
    <>
      <path d="M4 9h16" />
      <path d="M8 15h12" />
    </>
  ),
  // Points left: "forward" in RTL.
  arrow: (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  arrowBack: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />,
  whatsapp: (
    <>
      <path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.5 18.6L4.5 19.5Z" />
      <path d="M9.2 9.4c.3 2.2 2 4 4.3 4.6l1-1.1 1.6.7-.3 1.4c-3.4.2-7-3.3-7-6.9l1.4-.4.8 1.6-1.8.1Z" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="1" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" />
      <path d="M3 9h18M12 9v11" />
      <path d="M12 9c-2-4-6-3-5-1s5 1 5 1Zm0 0c2-4 6-3 5-1s-5 1-5 1Z" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Splits a Latin word into per-letter spans. Never used for Arabic (it would break letter joining). */
export function Letters({ text, className }: { text: string; className?: string }) {
  const chars = Array.from(text);
  const mid = (chars.length - 1) / 2;
  return (
    <span className={className} dir="ltr" aria-label={text} role="img">
      {chars.map((c, i) => (
        <span key={i} aria-hidden="true" className="vp-letter" style={cv({ '--k': i - mid, '--i': i })}>
          {c}
        </span>
      ))}
    </span>
  );
}

/** Whole-word spans for the scroll-lit statement (Arabic-safe: splits on spaces only). */
export function Words({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="vp-w">{w}</span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}

/** Row of 5 intensity pips (longevity / sillage 1..5). */
export function Pips({ value, label }: { value: number; label: string }) {
  return (
    <div className="vp-pips">
      <span className="vp-pips__label">{label}</span>
      <span className="vp-pips__row" role="img" aria-label={`${label}: ${value} من 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= value ? 'is-on' : ''} />
        ))}
      </span>
    </div>
  );
}

/** Price + optional compare-at, always in the Libyan format (server values only). */
export function PriceTag({
  price,
  compareAt,
  from = false,
  className = '',
}: {
  price: number | null | undefined;
  compareAt?: number | null;
  from?: boolean;
  className?: string;
}) {
  if (price == null) return null;
  const sale = compareAt != null && compareAt > price;
  return (
    <span className={`vp-price ${className}`}>
      {from && <small>يبدأ من</small>}
      <b>{formatPrice(price)}</b>
      {sale && (
        <s>
          <span className="vp-sr">بدلًا من </span>
          {formatPrice(compareAt!)}
        </s>
      )}
    </span>
  );
}

export function discountLabel(price: number | null | undefined, compareAt: number | null | undefined): string | null {
  if (price == null || compareAt == null || compareAt <= price) return null;
  return `−${Math.round((1 - price / compareAt) * 100)}%`;
}
