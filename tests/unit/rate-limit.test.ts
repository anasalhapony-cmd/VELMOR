import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rateLimit,
  rateLimitMemory,
  hashKey,
  clientIp,
  _setDurableStore,
  _resetMemoryRateLimits,
} from '@/lib/security/rate-limit';

test('memory window allows up to the limit then blocks with retry-after', () => {
  _resetMemoryRateLimits();
  const opts = { limit: 2, windowMs: 10_000 };
  const t = 1_000_000;
  assert.equal(rateLimitMemory('k', opts, t).allowed, true);
  assert.equal(rateLimitMemory('k', opts, t + 1).allowed, true);
  const third = rateLimitMemory('k', opts, t + 2);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds > 0);
  assert.equal(rateLimitMemory('k', opts, t + 10_001).allowed, true, 'window resets');
});

test('keys are hashed (no raw IP leaves the app) but keep their scope', () => {
  const h = hashKey('checkout:203.0.113.9');
  assert.match(h, /^checkout:[0-9a-f]{40}$/);
  assert.ok(!h.includes('203.0.113.9'));
  assert.equal(h, hashKey('checkout:203.0.113.9'), 'stable');
});

test('uses the durable store when it answers', async () => {
  const seen: string[] = [];
  _setDurableStore(async (key, limit) => {
    seen.push(key);
    return { allowed: limit > 100, remaining: 0, retryAfterSeconds: 30 };
  });
  const r = await rateLimit('track:1.2.3.4', { limit: 5, windowMs: 60_000 });
  assert.equal(r.allowed, false);
  assert.equal(r.retryAfterSeconds, 30);
  assert.ok(seen[0]?.startsWith('track:'));
  _setDurableStore(null);
});

test('falls back to memory when the durable store fails (never blocks checkout on outage)', async () => {
  _resetMemoryRateLimits();
  _setDurableStore(async () => null);
  const r = await rateLimit('checkout:9.9.9.9', { limit: 1, windowMs: 60_000 });
  assert.equal(r.allowed, true);
  const r2 = await rateLimit('checkout:9.9.9.9', { limit: 1, windowMs: 60_000 });
  assert.equal(r2.allowed, false);
  _setDurableStore(null);
});

test('clientIp prefers edge headers and never trusts a client-supplied XFF head', () => {
  // A client can prepend anything to x-forwarded-for; only the last hop is ours.
  const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 198.51.100.1' });
  assert.equal(clientIp(h), '198.51.100.1');
  const v = new Headers({ 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '203.0.113.9' });
  assert.equal(clientIp(v), '203.0.113.9');
  assert.equal(clientIp(new Headers({ 'x-vercel-forwarded-for': '192.0.2.4' })), '192.0.2.4');
  assert.equal(clientIp(new Headers()), 'unknown');
});
