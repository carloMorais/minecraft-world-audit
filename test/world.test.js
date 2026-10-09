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
