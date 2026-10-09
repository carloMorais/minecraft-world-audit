import test from 'node:test';
import assert from 'node:assert';
import { flattenItems } from '../src/extract/items.js';

test('flattenItems handles null/undefined', () => {
  assert.deepStrictEqual(Array.from(flattenItems(null)), []);
  assert.deepStrictEqual(Array.from(flattenItems(undefined)), []);
});

test('flattenItems flattens a basic list of items', () => {
  const items = [
    { item: 'minecraft:stone', count: 64 },
    { item: 'minecraft:dirt', count: 32 }
  ];
  const flat = Array.from(flattenItems(items));
  assert.deepStrictEqual(flat, [
    { item: 'minecraft:stone', count: 64, path: [] },
    { item: 'minecraft:dirt', count: 32, path: [] }
  ]);
});

test('flattenItems handles nested items (e.g. shulker boxes)', () => {
  const items = [
    {
      item: 'minecraft:red_shulker_box',
      count: 1,
      contents: [
        { item: 'minecraft:diamond', count: 10 },
        { item: 'minecraft:gold_ingot', count: 5 }
      ]
    }
  ];
  const flat = Array.from(flattenItems(items));
  assert.deepStrictEqual(flat, [
    { item: 'minecraft:red_shulker_box', count: 1, contents: items[0].contents, path: [] },
    { item: 'minecraft:diamond', count: 10, path: ['red_shulker_box'] },
    { item: 'minecraft:gold_ingot', count: 5, path: ['red_shulker_box'] }
  ]);
});

test('flattenItems uses customName for path when available', () => {
  const items = [
    {
      item: 'minecraft:chest',
      customName: 'Treasure Chest',
      count: 1,
      contents: [
        { item: 'minecraft:emerald', count: 1 }
      ]
    }
  ];
  const flat = Array.from(flattenItems(items));
  assert.deepStrictEqual(flat, [
    { item: 'minecraft:chest', customName: 'Treasure Chest', count: 1, contents: items[0].contents, path: [] },
    { item: 'minecraft:emerald', count: 1, path: ['Treasure Chest'] }
  ]);
});

test('flattenItems handles deep nesting correctly', () => {
  const items = [
    {
      item: 'minecraft:bundle',
      count: 1,
      contents: [
        {
          item: 'minecraft:shulker_box',
          count: 1,
          customName: 'Deep Storage',
          contents: [
            { item: 'minecraft:stick', count: 2 }
          ]
        }
      ]
    }
  ];
  const flat = Array.from(flattenItems(items));
  assert.deepStrictEqual(flat, [
    { item: 'minecraft:bundle', count: 1, contents: items[0].contents, path: [] },
    { item: 'minecraft:shulker_box', count: 1, customName: 'Deep Storage', contents: items[0].contents[0].contents, path: ['bundle'] },
    { item: 'minecraft:stick', count: 2, path: ['bundle', 'Deep Storage'] }
  ]);
});
