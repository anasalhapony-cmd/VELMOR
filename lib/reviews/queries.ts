import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings, settingBool } from '@/lib/settings';
import type { ReviewInput } from '@/lib/validation/schemas';

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  displayName: string;
  isVerified: boolean;
  createdAt: string;
}

export async function listApprovedReviews(productId: string, limit = 20): Promise<PublicReview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, title, body, display_name, is_verified_purchase, created_at')
    .eq('product_id', productId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    displayName: r.display_name || 'زبون',
    isVerified: r.is_verified_purchase,
    createdAt: r.created_at,
  }));
}

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; code: 'DISABLED' | 'DUPLICATE' | 'ERROR'; message: string };

/**
 * Submit a review (server-side). Always lands as PENDING for moderation. The
 * global reviews_enabled setting is enforced here; device dedupe is enforced by
 * a unique index. is_verified_purchase is never set from client input.
 */
export async function submitReview(
  input: ReviewInput,
  deviceId: string | null
): Promise<SubmitReviewResult> {
  const settings = await getSettings();
  if (!settingBool(settings, 'reviews_enabled', true)) {
    return { ok: false, code: 'DISABLED', message: 'التقييمات غير مفعّلة حاليًا.' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('reviews').insert({
    product_id: input.product_id,
    rating: input.rating,
    title: input.title ?? null,
    body: input.body ?? null,
    display_name: input.display_name ?? null,
    device_id: deviceId,
    status: 'PENDING',
    is_verified_purchase: false,
  });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, code: 'DUPLICATE', message: 'لقد قمت بتقييم هذا المنتج مسبقًا.' };
    }
    return { ok: false, code: 'ERROR', message: 'تعذّر إرسال التقييم.' };
  }
  return { ok: true };
}
