import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransition,
  ORDER_STATUS_LABELS_AR,
  ORDER_STATUSES,
  STOCK_RESTORING_STATUSES,
  stockLevel,
} from '@/config/constants';

test('valid forward transitions are allowed', () => {
  assert.equal(canTransition('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransition('CONFIRMED', 'PREPARING'), true);
  assert.equal(canTransition('OUT_FOR_DELIVERY', 'DELIVERED'), true);
  assert.equal(canTransition('FAILED', 'OUT_FOR_DELIVERY'), true);
});

test('invalid transitions are rejected', () => {
  assert.equal(canTransition('PENDING', 'DELIVERED'), false);
  assert.equal(canTransition('DELIVERED', 'PENDING'), false);
  assert.equal(canTransition('CANCELLED', 'CONFIRMED'), false);
});

test('every status has an Arabic label', () => {
  for (const s of ORDER_STATUSES) {
    assert.ok(ORDER_STATUS_LABELS_AR[s]?.length > 0, `missing label for ${s}`);
  }
});

test('only terminal cancellations restore stock (FAILED can be retried)', () => {
  assert.deepEqual([...STOCK_RESTORING_STATUSES].sort(), ['CANCELLED', 'EXPIRED']);
});

test('stock level buckets match the public thresholds', () => {
  assert.equal(stockLevel(0), 'OUT_OF_STOCK');
  assert.equal(stockLevel(5), 'LOW_STOCK');
  assert.equal(stockLevel(10), 'LOW_STOCK');
  assert.equal(stockLevel(11), 'IN_STOCK');
});
