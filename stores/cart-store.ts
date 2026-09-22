'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (item: CartItem) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  count: () => number;
  subtotal: () => number;
}

/**
 * Client cart (guest, persisted to localStorage). This is display state ONLY —
 * the server re-prices and re-validates everything at checkout. Never trust the
 * prices held here.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: Math.min(99, i.quantity + item.quantity) }
                  : i
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.min(99, item.quantity) }] };
        }),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(99, quantity)) } : i))
            .filter((i) => i.quantity > 0),
        })),
      increment: (variantId) => get().setQuantity(variantId, (get().items.find((i) => i.variantId === variantId)?.quantity ?? 0) + 1),
      decrement: (variantId) => get().setQuantity(variantId, (get().items.find((i) => i.variantId === variantId)?.quantity ?? 0) - 1),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'velmor-cart', partialize: (s) => ({ items: s.items }) }
  )
);
