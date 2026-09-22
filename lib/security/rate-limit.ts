/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in the server instance's memory, so on a multi-instance /
 * serverless deployment each instance limits independently. It meaningfully
 * blunts abuse and bots, but for hard global guarantees wire a shared store
 * (e.g. Upstash Redis) or Cloudflare Turnstile — the call sites are ready for
 * it (see docs/SECURITY.md). Never a substitute for the server-side validation
 * that already protects prices/stock/orders.
 */
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

// Opportunistic cleanup so the map doesn't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  hit.count += 1;
  if (hit.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((hit.resetAt - now) / 1000),
    };
  }
  return { allowed: true, remaining: limit - hit.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
