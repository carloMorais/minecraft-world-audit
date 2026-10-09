import test from 'node:test';
import assert from 'node:assert';
import { Buffer } from 'buffer';
import { World } from '../src/world.js';

test('World.readJson leniently parses JSON', () => {
  const files = {
    'valid.json': '{"a": 1}',
    'bom.json': '\uFEFF{"a": 1}',
    'trailing.json': '{\n  "a": 1,\n  "b": [2, 3, ],\n}',
    'single_comment.json': '{\n  // comment\n  "a": 1\n}',
    'multi_comment.json': '{\n  /* comment \n  multiline */\n  "a": 1\n}',
    'mixed.json': '\uFEFF{\n  // single line\n  "a": 1,\n  /* multi\n  line */\n  "b": [2,],\n}',
    'invalid.json': '{"a": 1',
  };

  const source = {
    list: () => [],
    read: (name) => {
      if (name === 'missing.json') return null;
      if (name in files) return Buffer.from(files[name], 'utf8');
      return null;
    }
  };

  const world = new World(source);

  assert.deepStrictEqual(world.readJson('valid.json'), { a: 1 });
  assert.deepStrictEqual(world.readJson('bom.json'), { a: 1 });
  assert.deepStrictEqual(world.readJson('trailing.json'), { a: 1, b: [2, 3] });
  assert.deepStrictEqual(world.readJson('single_comment.json'), { a: 1 });
  assert.deepStrictEqual(world.readJson('multi_comment.json'), { a: 1 });
  assert.deepStrictEqual(world.readJson('mixed.json'), { a: 1, b: [2] });
  assert.strictEqual(world.readJson('invalid.json'), null);
  assert.strictEqual(world.readJson('missing.json'), null);
});

test('World.readJson handles comments and trailing commas securely', async () => {
  const mockSource = {
    list: () => ['test.json', 'redos.json', 'normal.json'],
    read: (name) => {
      if (name === 'test.json') {
        return Buffer.from('{\n  // comment\n  "a": "/* not comment */",\n  "b": [1, 2, ],\n  /* block\n  comment */\n  "c": 3\n}');
      }
      if (name === 'normal.json') {
        return Buffer.from('{"test": "hello, }", "arr": [1, 2, ],}');
      }
      if (name === 'redos.json') {
        // A malicious string that would cause ReDoS with the old regex
        return Buffer.from('/* ' + 'a'.repeat(10000000));
      }
      return null;
    },
    close: () => {}
  };

  const world = new World(mockSource);

  // Test normal parsing with comments and trailing commas
  const parsed1 = world.readJson('test.json');
  assert.deepEqual(parsed1, { a: '/* not comment */', b: [1, 2], c: 3 });

  const parsed2 = world.readJson('normal.json');
  // Original regex replace(/,(\s*[}\]])/g, '$1') intentionally but incorrectly
  // modified strings if they had ', }' inside them. We preserved this exact logic.
  assert.deepEqual(parsed2, { test: 'hello }', arr: [1, 2] });

  // Test ReDoS vulnerability
  // If the old regex was still in place, this would hang for a very long time.
  const start = Date.now();
  const parsed3 = world.readJson('redos.json');
  const elapsed = Date.now() - start;

  assert.equal(parsed3, null); // Invalid JSON returns null
  assert.ok(elapsed < 1000, `Parsing should be fast, took ${elapsed}ms`);
});
