import { Check, AlertTriangle, XCircle } from 'lucide-react';
import { STOCK_LEVEL_LABELS_AR, type StockLevel } from '@/config/constants';
import { cn } from '@/lib/utils/cn';

/** Availability badge. Never relies on colour alone — includes an icon + words. */
export function StockBadge({ level, className }: { level: StockLevel; className?: string }) {
  const map = {
    IN_STOCK: { icon: Check, cls: 'text-success' },
    LOW_STOCK: { icon: AlertTriangle, cls: 'text-warning' },
    OUT_OF_STOCK: { icon: XCircle, cls: 'text-danger' },
  } as const;
  const { icon: Icon, cls } = map[level];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', cls, className)}>
      <Icon size={15} aria-hidden />
      {STOCK_LEVEL_LABELS_AR[level]}
    </span>
  );
}
