'use client';

import { create } from 'zustand';

type Tone = 'ok' | 'error';
interface ToastState {
  id: number;
  message: string | null;
  tone: Tone;
  action: { label: string; href: string } | null;
  show: (message: string, opts?: { tone?: Tone; action?: { label: string; href: string } }) => void;
  hide: () => void;
}

/** One global, polite toast (add-to-bag confirmations, recoverable errors). */
export const useToast = create<ToastState>((set: (p: Partial<ToastState>) => void, get: () => ToastState) => ({
  id: 0,
  message: null,
  tone: 'ok',
  action: null,
  show: (message: string, opts: { tone?: Tone; action?: { label: string; href: string } } = {}) =>
    set({ message, tone: opts.tone ?? 'ok', action: opts.action ?? null, id: get().id + 1 }),
  hide: () => set({ message: null }),
}));
