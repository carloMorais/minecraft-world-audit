import test from 'node:test';
import assert from 'node:assert';
import { safe } from '../src/extract/misc.js';

test('safe utility function', () => {
  // Test happy path
  assert.strictEqual(safe(() => 42), 42);

  // Test object return
  assert.deepStrictEqual(safe(() => ({ a: 1 })), { a: 1 });

  // Test error condition
  const result = safe(() => { throw new Error('test error'); });
  assert.deepStrictEqual(result, { error: 'test error' });

  // Test non-error throw (though typically it's an Error object)
  const result2 = safe(() => { throw 'string error'; });
  assert.deepStrictEqual(result2, { error: undefined }); // 'string error'.message is undefined
});
