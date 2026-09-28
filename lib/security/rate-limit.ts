/**
 * Rate limiting for public endpoints and auth actions.
 *
 * Primary store: Postgres (`rate_limit_hit`, migration 0018) — a fixed window
 * shared by every server instance, so limits hold on serverless/multi-region
 * deployments. Keys are SHA-256 hashed before they leave the app, so raw IPs
 * are never stored.
 *
 * Fallback: an in-memory window per instance, used only if the database call
 * fails (or RATE_LIMIT_STORE=memory, e.g. local dev without Supabase). A
 * rate-limiter outage must never take checkout down, so failures fall back
 * rather than block. Rate limiting is defence-in-depth — prices, stock and
 * orders are protected by server-side validation regardless.
 */
import { createHash } from 'node:crypto';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export function rateLimitMemory(key: string, { limit, windowMs }: RateLimitOptions, now = Date.now()): RateLimitResult {
  sweep(now);
  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  hit.count += 1;
  if (hit.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - hit.count, retryAfterSeconds: 0 };
}

/** Test hook. */
export function _resetMemoryRateLimits() {
  buckets.clear();
}

export function hashKey(key: string): string {
  const [scope] = key.split(':');
  return `${scope}:${createHash('sha256').update(key).digest('hex').slice(0, 40)}`;
}

// ---------------------------------------------------------------------------
// Durable store
// ---------------------------------------------------------------------------
type DurableHit = (hashedKey: string, limit: number, windowSeconds: number) => Promise<RateLimitResult | null>;

const durableHit: DurableHit = async (hashedKey, limit, windowSeconds) => {
  if (process.env.RATE_LIMIT_STORE === 'memory') return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      p_key: hashedKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || !data) return null;
    const d = data as { allowed: boolean; remaining: number; retry_after: number };
    return { allowed: !!d.allowed, remaining: Number(d.remaining) || 0, retryAfterSeconds: Number(d.retry_after) || 0 };
  } catch {
    return null;
  }
};

let durable: DurableHit = durableHit;
/** Test hook: swap the durable store. */
export function _setDurableStore(fn: DurableHit | null) {
  durable = fn ?? durableHit;
}

export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const hashed = hashKey(key);
  const res = await durable(hashed, opts.limit, Math.max(1, Math.round(opts.windowMs / 1000)));
  return res ?? rateLimitMemory(hashed, opts);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: { get(name: string): string | null }): string {
  // Prefer headers set by the hosting edge, which overwrites any client value
  // (Vercel: x-vercel-forwarded-for / x-real-ip; Cloudflare: cf-connecting-ip).
  // x-forwarded-for is client-appendable, so only its LAST hop (added by our
  // proxy) is trusted as a fallback.
  const edge =
    headers.get('x-vercel-forwarded-for') ?? headers.get('cf-connecting-ip') ?? headers.get('x-real-ip');
  if (edge) return edge.split(',')[0]!.trim();
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',').pop()!.trim();
  return 'unknown';
}
