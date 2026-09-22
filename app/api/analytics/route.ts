import { NextResponse, type NextRequest } from 'next/server';
import { analyticsSchema } from '@/lib/validation/schemas';
import { recordEvent } from '@/lib/analytics/track';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

/** Privacy-conscious client event ingestion. Best-effort, never blocks the UI. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`analytics:${ip}`, { limit: 120, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = analyticsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });

  void recordEvent(parsed.data.event_type, {
    productId: parsed.data.product_id ?? null,
    meta: parsed.data.meta,
  });
  return NextResponse.json({ ok: true });
}
