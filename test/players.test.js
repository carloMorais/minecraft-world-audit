import test from 'node:test';
import assert from 'node:assert';
import { attributes } from '../src/extract/players.js';

test('attributes handles null or undefined inputs', () => {
  assert.deepStrictEqual(attributes(null), {});
  assert.deepStrictEqual(attributes(undefined), {});
  assert.deepStrictEqual(attributes([]), {});
});

test('attributes maps simple attributes correctly', () => {
  const input = [
    { Name: 'health', Current: 20, Max: 20, Base: 20 },
    { Name: 'absorption', Current: 4, Max: 4, Base: 4 },
  ];
  const expected = {
    'health': { current: 20, max: 20, base: 20 },
    'absorption': { current: 4, max: 4, base: 4 },
  };
  assert.deepStrictEqual(attributes(input), expected);
});

test('attributes strips minecraft: prefix from attribute names', () => {
  const input = [
    { Name: 'minecraft:health', Current: 15.5, Max: 20, Base: 20 },
    { Name: 'minecraft:player.hunger', Current: 10, Max: 20, Base: 20 },
    { Name: 'minecraft:movement', Current: 0.1, Max: 0.1, Base: 0.1 },
  ];
  const expected = {
    'health': { current: 15.5, max: 20, base: 20 },
    'player.hunger': { current: 10, max: 20, base: 20 },
    'movement': { current: 0.1, max: 0.1, base: 0.1 },
  };
  assert.deepStrictEqual(attributes(input), expected);
});

test('attributes handles mixed prefixes correctly', () => {
  const input = [
    { Name: 'minecraft:health', Current: 20, Max: 20, Base: 20 },
    { Name: 'absorption', Current: 4, Max: 4, Base: 4 },
    { Name: 'minecraft:movement', Current: 0.1, Max: 0.1, Base: 0.1 },
    { Name: 'custom:attr', Current: 1, Max: 5, Base: 2 },
  ];
  const expected = {
    'health': { current: 20, max: 20, base: 20 },
    'absorption': { current: 4, max: 4, base: 4 },
    'movement': { current: 0.1, max: 0.1, base: 0.1 },
    'custom:attr': { current: 1, max: 5, base: 2 },
  };
  assert.deepStrictEqual(attributes(input), expected);
});
