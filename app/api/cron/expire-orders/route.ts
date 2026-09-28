import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Scheduled job: expire COD orders left PENDING longer than the configured
 * `order_expiry_hours` setting, releasing their reserved stock and coupon use.
 *
 * Protected by CRON_SECRET (sent as `Authorization: Bearer <secret>`, which is
 * what Vercel Cron does). If CRON_SECRET is not configured the endpoint is
 * disabled — it never runs unauthenticated.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get('authorization') ?? '';
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  // p_hours null → the function reads settings.order_expiry_hours.
  const { data, error } = await supabase.rpc('expire_stale_orders', { p_hours: null });
  if (error) return NextResponse.json({ error: 'expire_failed' }, { status: 500 });
  return NextResponse.json({ expired: data ?? 0 });
}

export const GET = run;
export const POST = run;
