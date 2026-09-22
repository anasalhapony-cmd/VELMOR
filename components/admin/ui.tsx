import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { ORDER_STATUS_LABELS_AR, type OrderStatus } from '@/config/constants';

export function PageHeader({
  title,
  description,
  action,
  backHref,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {backHref && (
          <Link href={backHref} className="mb-1 inline-block text-xs text-ink-500 hover:text-ink">
            ← رجوع
          </Link>
        )}
        <h1 className="font-display-ar text-h2 font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-ink',
    warning: 'text-warning',
    danger: 'text-danger',
    success: 'text-success',
  };
  return (
    <div className="admin-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tabular-nums', toneClasses[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-card grid place-items-center py-16 text-center">
      <h3 className="font-display-ar text-h3 font-medium text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-center gap-2 text-sm">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn('admin-btn-sm', page <= 1 && 'pointer-events-none opacity-40')}
      >
        السابق
      </Link>
      <span className="px-3 text-ink-500">
        صفحة {page} من {totalPages}
      </span>
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn('admin-btn-sm', page >= totalPages && 'pointer-events-none opacity-40')}
      >
        التالي
      </Link>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink/10 text-ink-700',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    info: 'bg-pine/15 text-pine',
    gold: 'bg-gold/15 text-gold-700',
  };
  return <span className={cn('admin-pill', tones[tone])}>{children}</span>;
}

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY_FOR_DELIVERY: 'info',
  OUT_FOR_DELIVERY: 'gold',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'neutral',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ORDER_STATUS_LABELS_AR[status]}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'مُفعّل' : 'معطّل'}</Badge>;
}
