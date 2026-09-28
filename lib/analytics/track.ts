import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Record a privacy-conscious analytics event. Fire-and-forget: analytics must
 * never block or fail a user action. No personal data is stored.
 */
export async function recordEvent(
  eventType: string,
  opts: { productId?: string | null; sessionId?: string | null; meta?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('analytics_events').insert({
      event_type: eventType,
      product_id: opts.productId ?? null,
      session_id: opts.sessionId ?? null,
      meta: (opts.meta ?? {}) as never,
    });
  } catch {
    // swallow — analytics is best-effort
  }
}
