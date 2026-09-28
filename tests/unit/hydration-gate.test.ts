import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whenHydrated, isReactOwned, ENGINE_TARGETS } from '@/components/store/motion/hydration';

/**
 * The gate must (1) wait while the route fallback is on screen or any engine
 * target is not yet claimed by React, (2) start exactly once, (3) never block
 * forever. A minimal fake DOM is enough: the gate only uses querySelector(All),
 * own enumerable keys and window timers.
 */

const KEY = '__reactFiber$test123';

interface FakeEl {
  [k: string]: unknown;
}
const owned = (): FakeEl => ({ [KEY]: {} });
const unowned = (): FakeEl => ({});

function fakeRoot(state: { fallback: boolean; targets: FakeEl[]; ownedSelf?: boolean }) {
  const root: FakeEl = state.ownedSelf === false ? {} : { [KEY]: {} };
  root.querySelector = (sel: string) => (sel === '.vp-loading' && state.fallback ? {} : null);
  Object.defineProperty(root, 'querySelector', { enumerable: false, value: root.querySelector });
  Object.defineProperty(root, 'querySelectorAll', {
    enumerable: false,
    value: (sel: string) => (sel === ENGINE_TARGETS ? state.targets : []),
  });
  return root as unknown as HTMLElement;
}

// The gate reads `window.*` timers; in Node that is globalThis.
(globalThis as unknown as { window: unknown }).window = globalThis;

test('starts once when everything is already hydrated (client navigation)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const root = fakeRoot({ fallback: false, targets: [owned(), owned()] });
  let starts = 0;
  whenHydrated(root, () => starts++);
  assert.equal(starts, 0, 'never synchronously inside the effect');
  t.mock.timers.tick(1);
  assert.equal(starts, 1);
  t.mock.timers.tick(10_000);
  assert.equal(starts, 1, 'fires exactly once');
});

test('waits while an engine target is not yet owned by React', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const late = unowned();
  const root = fakeRoot({ fallback: false, targets: [owned(), late] });
  let starts = 0;
  whenHydrated(root, () => starts++);
  t.mock.timers.tick(400);
  assert.equal(starts, 0, 'still un-hydrated → engine must not touch the DOM');
  late[KEY] = {}; // React finishes hydrating the boundary
  t.mock.timers.tick(200);
  assert.equal(starts, 1);
});

test('waits while the route fallback (loading.tsx) is on screen', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const state = { fallback: true, targets: [] as FakeEl[] };
  const root = fakeRoot(state);
  let starts = 0;
  whenHydrated(root, () => starts++);
  t.mock.timers.tick(1000);
  assert.equal(starts, 0);
  state.fallback = false; // page streamed in
  state.targets = [owned()];
  t.mock.timers.tick(200);
  assert.equal(starts, 1);
});

test('never blocks forever: starts after the timeout even if never hydrated', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const root = fakeRoot({ fallback: false, targets: [unowned()] });
  let starts = 0;
  whenHydrated(root, () => starts++);
  t.mock.timers.tick(5900);
  assert.equal(starts, 0);
  t.mock.timers.tick(200);
  assert.equal(starts, 1);
});

test('cancel prevents a late start', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const root = fakeRoot({ fallback: false, targets: [unowned()] });
  let starts = 0;
  const cancel = whenHydrated(root, () => starts++);
  cancel();
  t.mock.timers.tick(20_000);
  assert.equal(starts, 0);
});

test('isReactOwned distinguishes claimed from unclaimed nodes', () => {
  const sample = owned() as unknown as Element; // a node React certainly owns
  assert.equal(isReactOwned(owned() as unknown as Element, sample), true);
  assert.equal(isReactOwned(unowned() as unknown as Element, sample), false);
});
