// Item art (web/src/components/sprites): sprite templates are well formed, every rule points at a
// sprite, and every vanilla item resolves to a picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES, itemArt, itemArtUrl, canonicalName, setPngEncoder } from '../web/src/components/sprites/index.js';
import { checkSprite, spriteSvg } from '../web/src/components/sprites/draw.js';
import { blockPixels, blockModel, SIZE } from '../web/src/components/sprites/blocks.js';
import { encodePng } from '../src/format/png.js';
import { VANILLA } from '../scripts/vanilla-items.js';

setPngEncoder(encodePng);

test('every sprite template is 16×16 with a complete palette', () => {
  for (const [name, sprite] of Object.entries(SPRITES)) checkSprite(name, sprite);
});

test('every vanilla item resolves to an existing sprite or a block model', () => {
  for (const name of VANILLA) {
    const art = itemArt(`minecraft:${name}`);
    if (art.kind === 'sprite') assert.ok(SPRITES[art.sprite], `${name} → missing sprite ${art.sprite}`);
    assert.match(itemArtUrl(`minecraft:${name}`).url, /^data:image\/(svg\+xml|png)/, name);
  }
});

test('items that are not blocks never fall back to a cube', () => {
  for (const name of ['diamond_sword', 'iron_ingot', 'apple', 'poppy', 'oak_door', 'torch', 'iron_helmet', 'water_bucket', 'enchanted_book']) {
    assert.equal(itemArt(`minecraft:${name}`).kind, 'sprite', name);
  }
});

test('flat items that used to fall back to a cube get their own sprite', () => {
  const expect = {
    end_crystal: 'end_crystal', ender_crystal: 'end_crystal', debug_stick: 'stick', bowl: 'bowl', red_harness: 'harness',
    iron_nautilus_armor: 'nautilus_armor', light: 'light', light_block_15: 'light', structure_void: 'structure_void',
    cave_vines: 'glow_berries', cave_vines_body_with_berries: 'glow_berries', pottery_sherd: 'pottery_sherd',
    heart_pottery_sherd: 'heart_pottery_sherd', white_dye: 'dye_powder', black_dye: 'dye_lump', lime_dye: 'dye_round', red_dye: 'dye',
  };
  for (const [id, sprite] of Object.entries(expect)) assert.equal(itemArt(`minecraft:${id}`).sprite, sprite, id);
  assert.equal(itemArt('minecraft:debug_stick').glint, true);
  assert.notEqual(itemArt('minecraft:red_harness').a, itemArt('minecraft:blue_harness').a);
  assert.equal(itemArt('myaddon:thing').sprite, 'unknown');
});

test('Bedrock ids are mapped to the names the art is drawn for', () => {
  assert.equal(canonicalName('minecraft:netherbrick'), 'nether_brick');
  assert.equal(canonicalName('minecraft:nether_brick'), 'nether_bricks');
  assert.equal(canonicalName('minecraft:yellow_flower'), 'dandelion');
  assert.equal(itemArt('minecraft:appleenchanted').glint, true);
});

test('block shapes come from the id suffix', () => {
  assert.deepEqual(blockModel('oak_stairs'), { shape: 'stairs', mat: 'oak_planks' });
  assert.deepEqual(blockModel('stone_brick_slab'), { shape: 'slab', mat: 'stone_bricks' });
  assert.deepEqual(blockModel('cobblestone_wall'), { shape: 'wall', mat: 'cobblestone' });
  assert.equal(blockModel('white_carpet').mat, 'white_wool');
});

test('blocks render opaque in the middle and transparent in the corners', () => {
  for (const name of ['stone', 'oak_log', 'grass_block', 'diamond_ore', 'chest', 'oak_stairs']) {
    const px = blockPixels(name);
    assert.equal(px.length, SIZE * SIZE * 4);
    assert.equal(px[((SIZE / 2) * SIZE + SIZE / 2) * 4 + 3], 255, `${name} centre`);
    assert.equal(px[3], 0, `${name} corner`);
  }
});

test('tints change the sprite colours', () => {
  const sword = itemArt('minecraft:diamond_sword');
  const other = itemArt('minecraft:golden_sword');
  assert.equal(sword.sprite, other.sprite);
  assert.notEqual(spriteSvg(SPRITES[sword.sprite], sword.a, sword.b), spriteSvg(SPRITES[other.sprite], other.a, other.b));
});
