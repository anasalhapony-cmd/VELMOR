'use client';

import { create } from 'zustand';

interface WishlistState {
  ids: Set<string>;
  hydrated: boolean;
  hydrate: (ids: string[]) => void;
  has: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
}

/**
 * Wishlist client store. Source of truth is server-side (device-based), but we
 * hold the set of product ids for instant UI feedback. Toggling calls the API;
 * on failure the optimistic change is reverted.
 */
export const useWishlist = create<WishlistState>((set, get) => ({
  ids: new Set(),
  hydrated: false,
  hydrate: (ids) => set({ ids: new Set(ids), hydrated: true }),
  has: (id) => get().ids.has(id),
  toggle: async (id) => {
    const had = get().ids.has(id);
    const next = new Set(get().ids);
    if (had) next.delete(id);
    else next.add(id);
    set({ ids: next }); // optimistic
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_id: id, action: had ? 'remove' : 'add' }),
      });
      if (!res.ok) throw new Error('wishlist');
    } catch {
      // revert
      const reverted = new Set(get().ids);
      if (had) reverted.add(id);
      else reverted.delete(id);
      set({ ids: reverted });
    }
  },
}));
