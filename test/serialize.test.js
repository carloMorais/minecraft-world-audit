import test from 'node:test';
import assert from 'node:assert';
import { toPlain } from '../src/serialize.js';

test('toPlain converts safe BigInts to Numbers', () => {
  assert.strictEqual(toPlain(BigInt(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.strictEqual(toPlain(BigInt(Number.MIN_SAFE_INTEGER)), Number.MIN_SAFE_INTEGER);
  assert.strictEqual(toPlain(0n), 0);
});

test('toPlain converts unsafe BigInts to strings', () => {
  assert.strictEqual(toPlain(BigInt(Number.MAX_SAFE_INTEGER) + 1n), (BigInt(Number.MAX_SAFE_INTEGER) + 1n).toString());
  assert.strictEqual(toPlain(BigInt(Number.MIN_SAFE_INTEGER) - 1n), (BigInt(Number.MIN_SAFE_INTEGER) - 1n).toString());
});

test('toPlain processes arrays recursively', () => {
  const input = [1n, [2n, 3n]];
  const expected = [1, [2, 3]];
  assert.deepStrictEqual(toPlain(input), expected);
});

test('toPlain converts Maps to plain objects', () => {
  const map = new Map([['a', 1n], ['b', 2]]);
  assert.deepStrictEqual(toPlain(map), { a: 1, b: 2 });
});

test('toPlain processes objects, omitting "raw" by default', () => {
  const input = { a: 1n, raw: 'raw_data', nested: { b: 2n, raw: 'nested_raw' } };
  const expected = { a: 1, nested: { b: 2 } };
  assert.deepStrictEqual(toPlain(input), expected);
});

test('toPlain processes objects, keeping "raw" if keepRaw is true', () => {
  const input = { a: 1n, raw: 'raw_data', nested: { b: 2n, raw: 'nested_raw' } };
  const expected = { a: 1, raw: 'raw_data', nested: { b: 2, raw: 'nested_raw' } };
  assert.deepStrictEqual(toPlain(input, true), expected);
});

test('toPlain leaves TypedArrays and primitives alone', () => {
  const typedArray = new Uint8Array([1, 2, 3]);
  assert.strictEqual(toPlain(typedArray), typedArray);

  assert.strictEqual(toPlain(null), null);
  assert.strictEqual(toPlain(undefined), undefined);
  assert.strictEqual(toPlain(42), 42);
  assert.strictEqual(toPlain('string'), 'string');
});
