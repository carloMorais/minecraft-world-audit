// Unit tests for the analysis helpers that do not need a world.
import test from 'node:test';
import assert from 'node:assert';
import { itemValue, maxDurability, stackSize, portalLinks, storageReport } from '../src/extract/analysis.js';

test('max durability of tools, armour and specials', () => {
  assert.strictEqual(maxDurability('minecraft:diamond_pickaxe'), 1561);
  assert.strictEqual(maxDurability('minecraft:netherite_chestplate'), 592);
  assert.strictEqual(maxDurability('minecraft:elytra'), 432);
  assert.strictEqual(maxDurability('minecraft:stick'), undefined);
});

test('stack sizes', () => {
  assert.strictEqual(stackSize('minecraft:cobblestone'), 64);
  assert.strictEqual(stackSize('minecraft:ender_pearl'), 16);
  assert.strictEqual(stackSize('minecraft:oak_sign'), 16);
  assert.strictEqual(stackSize('minecraft:diamond_sword'), 1);
  assert.strictEqual(stackSize('minecraft:red_shulker_box'), 1);
});

test('item value counts stack size and enchantments', () => {
  assert.strictEqual(itemValue({ item: 'minecraft:diamond', count: 10 }), 10);
  assert.strictEqual(itemValue({ item: 'minecraft:diamond_block', count: 1 }), 9);
  assert.ok(itemValue({ item: 'minecraft:netherite_sword', count: 1 }) > itemValue({ item: 'minecraft:diamond_sword', count: 1 }));
  assert.ok(itemValue({ item: 'minecraft:diamond_sword', count: 1, enchantments: [{ name: 'sharpness', level: 5 }] }) > 2);
  assert.strictEqual(itemValue({ item: 'minecraft:dirt', count: 64 }), 0);
});

test('portal links follow the 8:1 scale', () => {
  const portals = [
    { dimension: 'overworld', position: [800, 70, -160] },
    { dimension: 'nether', position: [101, 60, -19] },
    { dimension: 'overworld', position: [5000, 70, 5000] },
  ];
  const { links } = portalLinks(portals);
  const a = links.find(l => l.from === 0);
  assert.strictEqual(a.to, 1);
  assert.ok(a.twoWay);
  const lonely = links.find(l => l.from === 2);
  assert.strictEqual(lonely.to, null);
  assert.deepStrictEqual(lonely.target, [625, 625]);
});

test('storage report finds stacks that can be merged', () => {
  const chest = (x, items) => ({ id: 'Chest', dimension: 'overworld', position: [x, 64, 0], items });
  const r = storageReport([
    chest(0, [{ item: 'minecraft:bone', count: 10 }, { item: 'minecraft:bone', count: 10 }]),
    chest(1, [{ item: 'minecraft:bone', count: 10 }]),
    chest(2, []),
    { id: 'Chest', dimension: 'overworld', position: [3, 64, 0], lootTable: 'loot_tables/chests/x.json' },
  ]);
  assert.strictEqual(r.containers, 3);
  assert.strictEqual(r.empty, 1);
  assert.strictEqual(r.freeableSlots, 2);
  assert.strictEqual(r.mergeable[0].item, 'minecraft:bone');
});
