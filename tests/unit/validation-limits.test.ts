import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSchema, quoteSchema, analyticsSchema } from '@/lib/validation/schemas';
import { MAX_QTY_PER_LINE, MAX_CART_LINES } from '@/config/constants';

const V1 = '11111111-1111-4111-8111-111111111111';
const V2 = '22222222-2222-4222-8222-222222222222';
const ZONE = '33333333-3333-4333-8333-333333333333';
const base = {
  customer_name: 'أحمد علي',
  phone: '0919774260',
  city: 'بنغازي',
  address: 'الكيش، شارع الجزائر',
  delivery_zone_id: ZONE,
};

test('duplicate variant lines are merged before reaching the database', () => {
  const r = checkoutSchema.parse({ ...base, items: [{ variant_id: V1, quantity: 2 }, { variant_id: V1, quantity: 3 }, { variant_id: V2, quantity: 1 }] });
  assert.deepEqual(r.items, [{ variant_id: V1, quantity: 5 }, { variant_id: V2, quantity: 1 }]);
});

test('merged quantity above the per-line cap is rejected', () => {
  const r = quoteSchema.safeParse({ items: [{ variant_id: V1, quantity: MAX_QTY_PER_LINE }, { variant_id: V1, quantity: 1 }] });
  assert.equal(r.success, false);
});

test('per-line quantity and line count are bounded', () => {
  assert.equal(quoteSchema.safeParse({ items: [{ variant_id: V1, quantity: MAX_QTY_PER_LINE + 1 }] }).success, false);
  assert.equal(quoteSchema.safeParse({ items: [{ variant_id: V1, quantity: 0 }] }).success, false);
  const many = Array.from({ length: MAX_CART_LINES + 1 }, (_, i) => ({
    variant_id: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
    quantity: 1,
  }));
  assert.equal(quoteSchema.safeParse({ items: many }).success, false);
});

test('client cannot send a total, price or fee — unknown keys are stripped', () => {
  const r = checkoutSchema.parse({ ...base, total: 0.001, delivery_fee: 0, items: [{ variant_id: V1, quantity: 1, price: 0.001 }] });
  assert.equal('total' in r, false);
  assert.equal('delivery_fee' in r, false);
  assert.equal('price' in r.items[0]!, false);
});

test('analytics meta is small, flat and allowlisted', () => {
  assert.equal(analyticsSchema.safeParse({ event_type: 'add_to_cart', meta: { variant: V1, qty: 2 } }).success, true);
  assert.equal(analyticsSchema.safeParse({ event_type: 'not_an_event' }).success, false);
  assert.equal(analyticsSchema.safeParse({ event_type: 'product_view', meta: { q: 'x'.repeat(201) } }).success, false);
  assert.equal(analyticsSchema.safeParse({ event_type: 'product_view', meta: { nested: { a: 1 } } }).success, false);
  const wide = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`k${i}`, i]));
  assert.equal(analyticsSchema.safeParse({ event_type: 'product_view', meta: wide }).success, false);
});
