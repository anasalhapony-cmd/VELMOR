'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/stores/cart-store';
import type { Quote } from '@/types';

/**
 * Re-validates the persisted guest cart against the server (quote_order):
 * authoritative prices are synced back into the cart display, and lines that
 * are inactive, deleted or short on stock are flagged. The server repeats all
 * of this atomically at order creation — this is for honest UI, not security.
 */
export function useCartValidation(active: boolean) {
  const items = useCart((s) => s.items);
  const syncPrices = useCart((s) => s.syncPrices);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const key = items.map((i) => `${i.variantId}:${i.quantity}`).join('|');

  useEffect(() => {
    if (!active || items.length === 0) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })) }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { quote?: Quote } | null) => {
        if (!d?.quote) return;
        setQuote(d.quote);
        syncPrices(d.quote.items.map((l) => ({ variantId: l.variant_id, price: Number(l.unit_price) })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  const unavailable = useMemo(() => {
    const set = new Set<string>();
    if (!quote) return set;
    const known = new Map(quote.items.map((l) => [l.variant_id, l]));
    for (const it of items) {
      const line = known.get(it.variantId);
      if (!line || !line.available) set.add(it.variantId);
    }
    return set;
  }, [quote, items]);

  return { quote, unavailable, loading };
}
