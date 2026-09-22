import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toMillimes,
  fromMillimes,
  formatPrice,
  formatMillimes,
  discountPercent,
} from '@/lib/utils/money';

test('millime conversion is exact (no float drift)', () => {
  assert.equal(toMillimes(150), 150000);
  assert.equal(toMillimes('5.5'), 5500);
  assert.equal(fromMillimes(5500), 5.5);
  // 0.1 + 0.2 style drift avoided
  assert.equal(toMillimes(0.1) + toMillimes(0.2), 300);
  assert.equal(fromMillimes(toMillimes(0.1) + toMillimes(0.2)), 0.3);
});

test('formatPrice groups thousands and drops trailing zeros', () => {
  assert.equal(formatPrice(150), '150 د.ل');
  assert.equal(formatPrice(1500), '1,500 د.ل');
  assert.equal(formatPrice(5.5), '5.5 د.ل');
  assert.equal(formatPrice(150, { withSymbol: false }), '150');
});

test('formatMillimes formats from integer millimes', () => {
  assert.equal(formatMillimes(250000), '250 د.ل');
});

test('discountPercent floors correctly and guards edge cases', () => {
  assert.equal(discountPercent(200, 150), 25);
  assert.equal(discountPercent(150, 119), 20);
  assert.equal(discountPercent(100, 100), 0);
  assert.equal(discountPercent(0, 0), 0);
  assert.equal(discountPercent(100, 120), 0); // current > original
});
