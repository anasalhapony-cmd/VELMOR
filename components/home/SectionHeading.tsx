import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = 'عرض الكل',
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mt-1 font-display-ar text-h2 font-medium text-ink">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm text-ink-500 hover:text-ink">
          {linkLabel}
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  );
}
