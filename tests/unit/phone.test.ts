import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLibyanPhone, isValidLibyanPhone } from '@/lib/utils/phone';

test('normalises common Libyan mobile spellings to E.164', () => {
  const expected = '218913456789';
  for (const input of [
    '0913456789',
    '+218913456789',
    '00218913456789',
    '218913456789',
    '091 345 6789',
    '091-345-6789',
  ]) {
    const n = normalizeLibyanPhone(input);
    assert.equal(n.ok, true, `should accept ${input}`);
    assert.equal(n.e164, expected, `e164 for ${input}`);
    assert.equal(n.local, '0913456789');
  }
});

test('accepts valid Libyan mobile prefixes 91-95', () => {
  for (const p of ['091', '092', '093', '094', '095']) {
    assert.equal(isValidLibyanPhone(`${p}1234567`), true, `prefix ${p}`);
  }
});

test('rejects invalid numbers', () => {
  for (const bad of ['', '123', '0812345678', '09123', '0961234567', 'abcdefghij', '218612345678']) {
    assert.equal(isValidLibyanPhone(bad), false, `should reject ${bad}`);
  }
});
