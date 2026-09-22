import { NextResponse, type NextRequest } from 'next/server';
import { trackSchema } from '@/lib/validation/schemas';
import { trackOrder } from '@/lib/orders/track';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

/** Customer order tracking: requires order number + phone. Rate-limited to
 *  prevent enumeration/guessing. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`track:${ip}`, { limit: 12, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'محاولات كثيرة، حاول بعد قليل.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'أدخل رقم الطلب ورقم الهاتف.' }, { status: 422 });

  const order = await trackOrder(parsed.data.order_number, parsed.data.phone);
  if (!order) return NextResponse.json({ error: 'لم يتم العثور على الطلب. تحقق من رقم الطلب والهاتف.' }, { status: 404 });
  return NextResponse.json({ order });
}
