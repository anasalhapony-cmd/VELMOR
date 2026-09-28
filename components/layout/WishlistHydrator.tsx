'use client';

import { useEffect } from 'react';
import { useWishlist } from '@/stores/wishlist-store';

/** Loads the device's wishlist ids into the store once on mount. */
export function WishlistHydrator() {
  const hydrate = useWishlist((s) => s.hydrate);
  useEffect(() => {
    let active = true;
    fetch('/api/wishlist')
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d: { ids?: string[] }) => {
        if (active && Array.isArray(d.ids)) hydrate(d.ids);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hydrate]);
  return null;
}
