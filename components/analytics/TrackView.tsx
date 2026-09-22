'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/client';

/** Fires a single analytics event on mount (e.g. product_viewed). Renders nothing. */
export function TrackView({ event, productId }: { event: string; productId?: string }) {
  useEffect(() => {
    trackEvent(event, productId ? { productId } : {});
  }, [event, productId]);
  return null;
}
