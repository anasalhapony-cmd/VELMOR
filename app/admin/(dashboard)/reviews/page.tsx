import Link from 'next/link';
import { Check, X, Trash2, Star } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { getSettings, settingBool } from '@/lib/settings';
import { PageHeader, EmptyState, Badge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { formatDate } from '@/lib/utils/format';
import { REVIEW_STATUSES, type ReviewStatus } from '@/config/constants';
import { approveReview, rejectReview, deleteReview } from './actions';

const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'قيد المراجعة',
  APPROVED: 'منشورة',
  REJECTED: 'مرفوضة',
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission('manage_reviews');
  const sp = await searchParams;
  const status = (REVIEW_STATUSES.includes(sp.status as ReviewStatus) ? sp.status : 'PENDING') as ReviewStatus;

  const supabase = await createClient();
  const [{ data: reviews }, settings] = await Promise.all([
    supabase.from('reviews').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100),
    getSettings(),
  ]);
  const reviewsEnabled = settingBool(settings, 'reviews_enabled', true);

  type PInfo = { id: string; name: string; name_ar: string | null; slug: string };
  const productIds = [...new Set((reviews ?? []).map((r) => r.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from('products').select('id, name, name_ar, slug').in('id', productIds)
    : { data: [] as PInfo[] };
  const pMap = new Map<string, PInfo>(((products ?? []) as PInfo[]).map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        title="التقييمات"
        description={reviewsEnabled ? 'التقييمات مفعّلة في المتجر.' : 'التقييمات معطّلة حاليًا (من الإعدادات).'}
      />

      <div className="mb-5 flex gap-2">
        {REVIEW_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/reviews?status=${s}`}
            className={`admin-btn-sm ${s === status ? 'border-gold bg-gold/10 text-gold-700' : ''}`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {!reviews || reviews.length === 0 ? (
        <EmptyState title="لا توجد تقييمات" description="لا توجد تقييمات بهذه الحالة." />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const p = pMap.get(r.product_id);
            return (
              <div key={r.id} className="admin-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-gold">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} className={i < r.rating ? 'fill-gold' : 'text-ink/20'} />
                        ))}
                      </span>
                      {r.is_verified_purchase && <Badge tone="success">تم الشراء</Badge>}
                    </div>
                    {p && (
                      <Link href={`/admin/products/${p.id}`} className="text-sm text-gold-700 hover:underline">
                        {p.name_ar || p.name}
                      </Link>
                    )}
                    {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                    {r.body && <p className="mt-1 text-sm text-ink-600">{r.body}</p>}
                    <p className="mt-2 text-xs text-ink-500">
                      {r.display_name || 'زائر'} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status !== 'APPROVED' && (
                      <form action={approveReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="admin-btn-sm text-success hover:bg-success/5" type="submit"><Check size={14} /> نشر</button>
                      </form>
                    )}
                    {status !== 'REJECTED' && (
                      <form action={rejectReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="admin-btn-sm" type="submit"><X size={14} /> رفض</button>
                      </form>
                    )}
                    <form action={deleteReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <DangerButton label="حذف" />
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
