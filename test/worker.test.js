import test from 'node:test';
import assert from 'node:assert';

// Mock worker environment to allow importing worker.js without throwing
global.performance = { now: () => 0 };
global.onmessage = null;
global.postMessage = () => {};

const worker = await import('../web/src/worker.js');

test('worker toRegex handles normal and invalid regex patterns', () => {
  // Empty search should throw
  assert.throws(() => worker.toRegex(''), { message: 'busca vazia' });

  // Happy path: valid regular expression should compile
  const validRegex = worker.toRegex('diamond');
  assert.strictEqual(validRegex.source, 'diamond');
  assert.strictEqual(validRegex.flags, 'i');

  // Happy path: valid regular expression with syntax
  const complexRegex = worker.toRegex('^diamond_.*$');
  assert.strictEqual(complexRegex.source, '^diamond_.*$');

  // Fallback path: invalid regular expression should be escaped and compiled
  // An unclosed bracket '[' throws a SyntaxError during normal RegExp compilation
  const invalidRegex = worker.toRegex('[');
  assert.strictEqual(invalidRegex.source, '\\[');
  assert.strictEqual(invalidRegex.flags, 'i');

  // Test another invalid pattern
  const invalidRegex2 = worker.toRegex('(');
  assert.strictEqual(invalidRegex2.source, '\\(');
});
