import test from 'node:test';
import assert from 'node:assert';
import { fmtCompact } from '../../web/src/format.js';

test('fmtCompact handles null and undefined', () => {
  assert.strictEqual(fmtCompact(null), '—');
  assert.strictEqual(fmtCompact(undefined), '—');
});

test('fmtCompact formats numbers less than 10,000 using standard fmt', () => {
  assert.strictEqual(fmtCompact(0), '0');
  assert.strictEqual(fmtCompact(5), '5');
  assert.strictEqual(fmtCompact(999), '999');
  assert.strictEqual(fmtCompact(9999), '9.999'); // Assumes standard pt-BR formatting for 9999
});

test('fmtCompact formats negative numbers less than 10,000 using standard fmt', () => {
  assert.strictEqual(fmtCompact(-5), '-5');
  assert.strictEqual(fmtCompact(-9999), '-9.999');
});

test('fmtCompact formats thousands (10k to 999k)', () => {
  assert.strictEqual(fmtCompact(10000), '10,0 mil');
  assert.strictEqual(fmtCompact(12345), '12,3 mil');
  assert.strictEqual(fmtCompact(999999), '1000,0 mil'); // Note: 999999 / 1e3 is 999.999 -> 1000.0 mil
  assert.strictEqual(fmtCompact(-15000), '-15,0 mil');
});

test('fmtCompact formats millions (1m to 999m)', () => {
  assert.strictEqual(fmtCompact(1000000), '1,0 mi');
  assert.strictEqual(fmtCompact(1234567), '1,2 mi');
  assert.strictEqual(fmtCompact(999999999), '1000,0 mi'); // Note: 999999999 / 1e6
  assert.strictEqual(fmtCompact(-2500000), '-2,5 mi');
});

test('fmtCompact formats billions (1b+)', () => {
  assert.strictEqual(fmtCompact(1000000000), '1,0 bi');
  assert.strictEqual(fmtCompact(1234567890), '1,2 bi');
  assert.strictEqual(fmtCompact(5500000000), '5,5 bi');
  assert.strictEqual(fmtCompact(-1500000000), '-1,5 bi');
});
