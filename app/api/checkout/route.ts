import { NextResponse, type NextRequest } from 'next/server';
import { checkoutSchema } from '@/lib/validation/schemas';
import { createOrder } from '@/lib/orders/create-order';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { isMaintenanceMode } from '@/lib/settings';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  // Rate limit order creation per IP.
  const ip = clientIp(req.headers);
  const rl = rateLimit(`checkout:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'محاولات كثيرة، حاول بعد قليل.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  if (await isMaintenanceMode()) {
    return NextResponse.json({ error: 'الطلبات متوقفة مؤقتًا. حاول لاحقًا.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'بيانات غير صالحة.', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Idempotency key from header or body; must be a uuid.
  const rawKey =
    req.headers.get('x-idempotency-key') ||
    (typeof (body as { idempotency_key?: unknown }).idempotency_key === 'string'
      ? (body as { idempotency_key: string }).idempotency_key
      : '');
  if (!UUID_RE.test(rawKey)) {
    return NextResponse.json({ error: 'مفتاح الطلب مفقود.' }, { status: 400 });
  }

  const result = await createOrder(parsed.data, rawKey);
  if (!result.ok) {
    const status = result.code === 'OUT_OF_STOCK' || result.code === 'VARIANT_UNAVAILABLE' ? 409 : 400;
    return NextResponse.json({ error: result.message, code: result.code, variantId: result.variantId }, { status });
  }
  return NextResponse.json({ order: result.order }, { status: 201 });
}
