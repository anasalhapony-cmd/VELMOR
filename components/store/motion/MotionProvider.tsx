'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { initMotion } from './engine';
import { whenHydrated } from './hydration';

/**
 * Boots the motion engine for the current route and re-boots it after every
 * client-side navigation (new sections, rails and scenes). Lifts the
 * page-transition curtain once the new route has rendered.
 *
 * The engine starts only after React has hydrated the page (see hydration.ts):
 * it writes attributes onto React-rendered nodes, and doing that before
 * hydration makes React report server/client attribute mismatches.
 */
export function MotionProvider() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const root = document.getElementById('vp-root');
    document.querySelector('[data-curtain]')?.classList.remove('is-on');
    if (!root) return;

    let stop: (() => void) | undefined;
    const cancelWait = whenHydrated(root, () => {
      stop = initMotion(root, { navigate: (href) => router.push(href) });
    });

    return () => {
      cancelWait();
      stop?.();
    };
  }, [pathname, router]);

  return null;
}
