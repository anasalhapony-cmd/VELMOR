import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { recordEvent } from '@/lib/analytics/track';

/** Product search / autocomplete (server-side via the search_products RPC). */
export async function GET(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = await rateLimit(`search:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ results: [] }, { status: 429 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_products', { p_query: q, p_limit: 8 });
  if (error) return NextResponse.json({ results: [] });
  const results = data ?? [];
  void recordEvent('search', { meta: { q: q.slice(0, 60), results: results.length, source: 'autocomplete' } });
  return NextResponse.json({ results });
}
