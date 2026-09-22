import { formatPrice, discountPercent } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';

export function Price({
  price,
  compareAt,
  className,
  size = 'md',
}: {
  price: number | null;
  compareAt?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (price == null) return null;
  const hasDiscount = compareAt != null && compareAt > price;
  const pct = hasDiscount ? discountPercent(compareAt!, price) : 0;
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-price',
  } as const;
  return (
    <span className={cn('inline-flex items-baseline gap-2 font-medium', className)}>
      <span className={cn(sizes[size], 'text-ink')}>{formatPrice(price)}</span>
      {hasDiscount && (
        <>
          <span className="text-sm text-ink-500 line-through">{formatPrice(compareAt!)}</span>
          <span className="rounded-sm bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger">
            −{pct}%
          </span>
        </>
      )}
    </span>
  );
}
