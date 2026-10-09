import test from 'node:test';
import assert from 'node:assert';
import { formatItem, flattenItems, stripNs, totalByItem, decodeItem, decodeItems } from '../src/extract/items.js';

test('stripNs removes minecraft: prefix', () => {
  assert.strictEqual(stripNs('minecraft:stone'), 'stone');
  assert.strictEqual(stripNs('diamond'), 'diamond');
  assert.strictEqual(stripNs(undefined), undefined);
});

test('decodeItem ignores empty items', () => {
  assert.strictEqual(decodeItem(null), null);
  assert.strictEqual(decodeItem({}), null);
  assert.strictEqual(decodeItem({ Name: 'minecraft:air', Count: 0 }), null);
});

test('decodeItem parses regular items', () => {
  const parsed = decodeItem({ Name: 'minecraft:stone', Count: 64, Slot: 1 });
  assert.deepStrictEqual(parsed, { item: 'minecraft:stone', count: 64, slot: 1 });
});

test('decodeItem parses items with NBT tags', () => {
  const item = {
    Name: 'minecraft:diamond_sword',
    Count: 1,
    tag: {
      Damage: 10,
      display: { Name: 'Excalibur' },
      ench: [{ id: 9, lvl: 5 }] // Sharpness
    }
  };
  const parsed = decodeItem(item);
  assert.strictEqual(parsed.item, 'minecraft:diamond_sword');
  assert.strictEqual(parsed.count, 1);
  assert.strictEqual(parsed.durabilityUsed, 10);
  assert.strictEqual(parsed.customName, 'Excalibur');
  assert.strictEqual(parsed.enchantments[0].level, 5);
});

test('decodeItems parses lists of items', () => {
  const items = [
    { Name: 'minecraft:stone', Count: 64, Slot: 0 },
    null,
    { Name: 'minecraft:dirt', Count: 32 }
  ];
  const parsed = decodeItems(items);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].slot, 0);
  assert.strictEqual(parsed[1].slot, 2); // default index
});

test('flattenItems yields nested items with paths', () => {
  const items = [
    { item: 'minecraft:shulker_box', count: 1, contents: [
      { item: 'minecraft:diamond', count: 64 }
    ]}
  ];
  const flattened = Array.from(flattenItems(items));
  assert.strictEqual(flattened.length, 2);
  assert.strictEqual(flattened[0].item, 'minecraft:shulker_box');
  assert.deepStrictEqual(flattened[0].path, []);
  assert.strictEqual(flattened[1].item, 'minecraft:diamond');
  assert.deepStrictEqual(flattened[1].path, ['shulker_box']);
});

test('totalByItem counts items correctly', () => {
  const items = [
    { item: 'minecraft:stone', count: 64 },
    { item: 'minecraft:shulker_box', count: 1, contents: [
      { item: 'minecraft:stone', count: 32 },
      { item: 'minecraft:diamond', count: 5 }
    ]}
  ];
  const totals = totalByItem(items);
  assert.strictEqual(totals['minecraft:stone'], 96);
  assert.strictEqual(totals['minecraft:diamond'], 5);
  assert.strictEqual(totals['minecraft:shulker_box'], 1);
});

test('formatItem formats simple items', () => {
  assert.strictEqual(formatItem({ count: 64, item: 'minecraft:stone' }), '64x stone');
  assert.strictEqual(formatItem({ count: 1, item: 'diamond' }), '1x diamond');
});

test('formatItem formats items with custom names', () => {
  assert.strictEqual(formatItem({ count: 1, item: 'minecraft:diamond_sword', customName: 'Excalibur' }), '1x diamond_sword "Excalibur"');
});

test('formatItem formats items with enchantments', () => {
  assert.strictEqual(
    formatItem({
      count: 1,
      item: 'minecraft:bow',
      enchantments: [{ name: 'power', level: 5 }, { name: 'unbreaking', level: 3 }]
    }),
    '1x bow [power 5, unbreaking 3]'
  );
});

test('formatItem formats items with durability used', () => {
  assert.strictEqual(formatItem({ count: 1, item: 'minecraft:iron_pickaxe', durabilityUsed: 100 }), '1x iron_pickaxe (dano 100)');
});

test('formatItem formats written books', () => {
  assert.strictEqual(
    formatItem({ count: 1, item: 'minecraft:written_book', book: { title: 'Diary', author: 'Steve' } }),
    '1x written_book livro "Diary" por Steve'
  );
});

test('formatItem formats containers with contents', () => {
  assert.strictEqual(
    formatItem({ count: 1, item: 'minecraft:shulker_box', contents: [{}, {}, {}] }),
    '1x shulker_box {3 itens dentro}'
  );
});

test('formatItem formats items with multiple properties', () => {
  assert.strictEqual(
    formatItem({
      count: 1,
      item: 'minecraft:diamond_sword',
      customName: 'Excalibur',
      enchantments: [{ name: 'sharpness', level: 5 }],
      durabilityUsed: 10
    }),
    '1x diamond_sword "Excalibur" [sharpness 5] (dano 10)'
  );
});

test('formatItem formats items with paths', () => {
  assert.strictEqual(
    formatItem({ count: 1, item: 'minecraft:diamond', path: ['shulker_box', 'chest'] }),
    '1x diamond [em shulker_box > chest]'
  );
});
