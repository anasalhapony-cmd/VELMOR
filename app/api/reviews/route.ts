import { NextResponse, type NextRequest } from 'next/server';
import { reviewSchema } from '@/lib/validation/schemas';
import { submitReview } from '@/lib/reviews/queries';
import { getGuestId } from '@/lib/security/guest';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`review:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'محاولات كثيرة.' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 422 });

  const deviceId = await getGuestId();
  const result = await submitReview(parsed.data, deviceId);
  if (!result.ok) {
    const status = result.code === 'DISABLED' ? 403 : result.code === 'DUPLICATE' ? 409 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({ ok: true, message: 'شكرًا لك! سيظهر تقييمك بعد المراجعة.' }, { status: 201 });
}
