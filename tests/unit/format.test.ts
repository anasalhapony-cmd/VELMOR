import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl, truncate } from '@/lib/utils/format';

test('whatsappUrl builds a wa.me link with 218 country code', () => {
  assert.equal(whatsappUrl('0919774260'), 'https://wa.me/218919774260');
  assert.equal(whatsappUrl('218919774260'), 'https://wa.me/218919774260');
  assert.equal(whatsappUrl('00218919774260'), 'https://wa.me/218919774260');
});

test('whatsappUrl encodes an optional message', () => {
  const url = whatsappUrl('0919774260', 'مرحبا VELMOR');
  assert.ok(url.startsWith('https://wa.me/218919774260?text='));
  assert.ok(url.includes(encodeURIComponent('مرحبا VELMOR')));
});

test('truncate adds an ellipsis only when needed', () => {
  assert.equal(truncate('short', 10), 'short');
  assert.equal(truncate('abcdefghij', 5), 'abcd…');
});
