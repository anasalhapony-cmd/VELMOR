import { Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Rating({
  value,
  count,
  size = 14,
  showCount = true,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      aria-label={`التقييم ${value.toFixed(1)} من 5`}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= rounded ? 'fill-gold text-gold' : 'text-ink/20'}
          />
        ))}
      </span>
      {showCount && typeof count === 'number' && (
        <span className="text-xs text-ink-500">
          {count > 0 ? `(${count})` : 'لا تقييمات'}
        </span>
      )}
    </span>
  );
}
