import { Rating } from '@/components/ui/Rating';
import { ReviewForm } from '@/components/product/ReviewForm';
import { formatDate } from '@/lib/utils/format';
import type { PublicReview } from '@/lib/reviews/queries';

export function ProductReviews({
  productId,
  reviews,
  ratingAvg,
  ratingCount,
  enabled,
}: {
  productId: string;
  reviews: PublicReview[];
  ratingAvg: number;
  ratingCount: number;
  enabled: boolean;
}) {
  return (
    <section id="reviews" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display-ar text-h2 font-medium">التقييمات</h2>
        {ratingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{ratingAvg.toFixed(1)}</span>
            <Rating value={ratingAvg} count={ratingCount} />
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {reviews.length === 0 ? (
            <p className="text-ink-500">لا توجد تقييمات بعد. كن أول من يقيّم هذا العطر.</p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="border-b border-ink/10 pb-4">
                <div className="flex items-center justify-between">
                  <Rating value={r.rating} showCount={false} />
                  {r.isVerified && (
                    <span className="rounded-sm bg-success/10 px-2 py-0.5 text-xs text-success">تم الشراء</span>
                  )}
                </div>
                {r.title && <h3 className="mt-2 font-medium">{r.title}</h3>}
                {r.body && <p className="mt-1 text-sm leading-relaxed text-ink-600">{r.body}</p>}
                <div className="mt-2 text-xs text-ink-500">
                  {r.displayName} · {formatDate(r.createdAt)}
                </div>
              </article>
            ))
          )}
        </div>
        <div>{enabled ? <ReviewForm productId={productId} /> : <p className="text-ink-500">التقييمات غير مفعّلة حاليًا.</p>}</div>
      </div>
    </section>
  );
}
