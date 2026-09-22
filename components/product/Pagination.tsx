import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';

/** Server-rendered, URL-based pagination (shareable / SEO-friendly). */
export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav className="mt-12 flex items-center justify-center gap-1" aria-label="ترقيم الصفحات">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className="grid h-10 w-10 place-items-center rounded border border-ink/20" aria-label="السابق">
          <ChevronRight size={18} />
        </Link>
      )}
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        return (
          <span key={p} className="flex items-center gap-1">
            {prev && p - prev > 1 && <span className="px-1 text-ink-500">…</span>}
            <Link
              href={makeHref(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`grid h-10 min-w-10 place-items-center rounded px-2 text-sm ${
                p === page ? 'bg-ink text-paper' : 'border border-ink/20 text-ink hover:border-ink'
              }`}
            >
              {p}
            </Link>
          </span>
        );
      })}
      {page < totalPages && (
        <Link href={makeHref(page + 1)} className="grid h-10 w-10 place-items-center rounded border border-ink/20" aria-label="التالي">
          <ChevronLeft size={18} />
        </Link>
      )}
    </nav>
  );
}
