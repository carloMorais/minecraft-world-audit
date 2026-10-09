import test from 'node:test';
import assert from 'node:assert';
import { prettyName } from '../../web/src/format.js';

test('prettyName formats item and block names correctly', () => {
  // Test falsy values
  assert.strictEqual(prettyName(null), '');
  assert.strictEqual(prettyName(undefined), '');
  assert.strictEqual(prettyName(''), '');

  // Test default namespace (minecraft) with translation mock
  const mockTranslate = (name) => name === 'diamond_sword' ? 'Espada de diamante' : null;
  assert.strictEqual(prettyName('minecraft:diamond_sword', mockTranslate), 'Espada de diamante');

  // Implicit minecraft namespace
  assert.strictEqual(prettyName('diamond_sword', mockTranslate), 'Espada de diamante');

  // Test fallback to Title Case when no translation exists
  assert.strictEqual(prettyName('minecraft:unknown_item', mockTranslate), 'Unknown Item');

  // Test removing brackets and underscores (current implementation doesn't remove equals signs, so they remain)
  assert.strictEqual(prettyName('minecraft:heavy_core[waterlogged=true]', mockTranslate), 'Heavy Core Waterlogged=true');
  assert.strictEqual(prettyName('minecraft:chest[facing=west]', mockTranslate), 'Chest Facing=west');

  // Test custom namespace (add-ons)
  assert.strictEqual(prettyName('spark_pets:shiba_inu', mockTranslate), 'Shiba Inu · spark_pets');
  assert.strictEqual(prettyName('custom_addon:magic_wand[enchanted=true]', mockTranslate), 'Magic Wand Enchanted=true · custom_addon');
});
