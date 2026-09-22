'use client';

/**
 * Fire-and-forget client analytics. Never blocks or throws into the UI, sends no
 * personal data. Posts to /api/analytics which validates + records the event.
 */
export function trackEvent(
  eventType: string,
  opts: { productId?: string; meta?: Record<string, unknown> } = {}
): void {
  try {
    const body = JSON.stringify({
      event_type: eventType,
      ...(opts.productId ? { product_id: opts.productId } : {}),
      ...(opts.meta ? { meta: opts.meta } : {}),
    });
    // keepalive lets the request survive a navigation (e.g. Buy Now).
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the UI */
  }
}
