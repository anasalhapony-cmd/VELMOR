import { NextResponse, type NextRequest } from 'next/server';
import { finderSchema } from '@/lib/validation/schemas';
import { recommend } from '@/lib/finder/recommend';
import { recordEvent } from '@/lib/analytics/track';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`finder:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'محاولات كثيرة.' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }
  const parsed = finderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 422 });

  const results = await recommend(parsed.data, 6);
  void recordEvent('finder_completed', { meta: { count: results.length } });
  return NextResponse.json({ results });
}
