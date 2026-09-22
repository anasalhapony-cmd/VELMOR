import { NextResponse, type NextRequest } from 'next/server';
import { quoteSchema } from '@/lib/validation/schemas';
import { getQuote } from '@/lib/orders/quote';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

/** Read-only checkout preview: server recomputes totals, delivery fee, coupon. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`quote:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'محاولات كثيرة.' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 422 });

  const quote = await getQuote(parsed.data);
  if (!quote) return NextResponse.json({ error: 'تعذّر حساب الطلب.' }, { status: 400 });
  return NextResponse.json({ quote });
}
