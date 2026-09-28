/**
 * Hydration gate for the motion engine.
 *
 * WHY: the engine is plain JS that writes data-attributes / inline custom
 * properties on nodes React renders (`data-in`, `--i`, `data-pinned`, rail
 * heights, …). React 19 hydrates each <Suspense> boundary in a LATER task than
 * the layout, and a layout-level effect (MotionProvider) can run before the
 * page boundary has been hydrated. React then finds attributes in the DOM that
 * it never rendered and logs "A tree hydrated but some attributes of the server
 * rendered HTML didn't match the client properties" (dev overlay, harmless but
 * noisy — and a real signal we should not train ourselves to ignore).
 *
 * The fix is ordering, not suppression: the engine starts only after React has
 * claimed every node the engine writes to.
 *
 * HOW: React stores its fiber on each DOM node it has hydrated/created under a
 * `__reactFiber$<random>` property (the same handle React DevTools uses). A node
 * that has it has already been diffed against the server HTML, so writing to it
 * afterwards can no longer cause a mismatch.
 *
 * SAFETY: this is an optimisation of *when*, never of *whether*. If the handle
 * cannot be found (React changed its internals) or the page never settles, the
 * engine still starts after HYDRATION_TIMEOUT_MS — content is delayed, never
 * hidden forever.
 */

/** Every node the engine reads/writes on React-rendered markup. */
export const ENGINE_TARGETS =
  '[data-reveal],[data-stagger],[data-scene],[data-hrail],[data-parallax],[data-words-scroll],' +
  '[data-marquee],[data-cycle],[data-families],[data-fam-row]';

const HYDRATION_TIMEOUT_MS = 6000;
const POLL_MS = 40;

let fiberKey: string | null = null;

/** Locate React's per-node fiber property once, from a node React certainly owns. */
function resolveFiberKey(sample: Element): string | null {
  if (fiberKey) return fiberKey;
  // Only a found key is cached: a miss is retried on the next call.
  fiberKey = Object.keys(sample).find((k) => k.startsWith('__reactFiber$')) ?? null;
  return fiberKey;
}

/**
 * True when React has already claimed `el`. Returns true when ownership cannot
 * be determined (no handle found) so callers never block on a missing handle.
 */
export function isReactOwned(el: Element, sample?: Element): boolean {
  const key = fiberKey ?? (sample ? resolveFiberKey(sample) : null);
  if (!key) return true;
  return (el as unknown as Record<string, unknown>)[key] !== undefined;
}

function settled(root: HTMLElement): boolean {
  // The route's <Suspense> fallback (loading.tsx) is still on screen → the
  // page itself has not streamed in yet.
  if (root.querySelector('.vp-loading')) return false;
  // `root` is rendered by the layout, so it is always owned by the time this runs.
  resolveFiberKey(root);
  if (!fiberKey) return true;
  const targets = root.querySelectorAll(ENGINE_TARGETS);
  for (let i = 0; i < targets.length; i++) {
    if (!isReactOwned(targets[i]!)) return false;
  }
  return true;
}

/**
 * Calls `start` once the page under `root` is hydrated (or after the timeout).
 * Returns a cancel function; safe to call after `start` has fired.
 */
export function whenHydrated(root: HTMLElement, start: () => void): () => void {
  let done = false;
  let timer = 0;
  let deadline = 0;

  const fire = () => {
    if (done) return;
    done = true;
    window.clearInterval(timer);
    window.clearTimeout(deadline);
    start();
  };

  // Already settled (client-side navigation, or a static route): start now.
  if (settled(root)) {
    // One macrotask so React's own commit for this render has fully finished.
    const t = window.setTimeout(fire, 0);
    return () => {
      done = true;
      window.clearTimeout(t);
    };
  }

  let stable = 0;
  timer = window.setInterval(() => {
    // Require two consecutive settled polls: a boundary can finish hydrating in
    // one time-slice while another is still queued behind it.
    stable = settled(root) ? stable + 1 : 0;
    if (stable >= 2) fire();
  }, POLL_MS);
  deadline = window.setTimeout(fire, HYDRATION_TIMEOUT_MS);

  return () => {
    done = true;
    window.clearInterval(timer);
    window.clearTimeout(deadline);
  };
}
