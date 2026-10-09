// Item art: which picture an item id gets, as a cached SVG data: URL. No game textures are
// shipped; everything is drawn here.
//   - Items are 16×16 pixel sprites (items/*.js), each with its own palette, optionally tinted
//     by material (see draw.js). Each group file exports `sprites` and `rules`.
//   - Placed blocks are a small 3D model (cube, slab, stairs…) with a procedural texture per
//     block family (blocks.js).
import { spriteSvg } from './draw.js';
import { blockPixels, looksLikeBlock, SIZE } from './blocks.js';
import { DYES } from './color.js';
import * as tools from './items/tools.js';
import * as gear from './items/gear.js';
import * as materials from './items/materials.js';
import * as food from './items/food.js';
import * as plants from './items/plants.js';
import * as blockitems from './items/blockitems.js';

const GROUPS = [tools, gear, materials, food, plants, blockitems];

// Add-on items we know nothing about: a pale cloth sack tied with string, tinted per id.
const UNKNOWN = {
  pal: { o: '@0', d: '@1', s: '@2', a: '@3', l: '@4', w: '@5', t: '#a08458', T: '#5e4a2e' },
  rows: [
    '................',
    '................',
    '....oo.oo.oo....',
    '....olollolso...',
    '.....olaaaso....',
    '......oaaso.....',
    '.....otTTTto....',
    '....olaaaaaso...',
    '...olwlaaaaasdo.',
    '..olwlaaaaaassdo',
    '..olaaaaaaaasdo.',
    '..oaaaaaaaassdo.',
    '..osaaaaaasssdo.',
    '...ossssssssdo..',
    '....oooooooooo..',
    '................',
  ],
};

export const SPRITES = Object.assign({ unknown: UNKNOWN }, ...GROUPS.map(g => g.sprites));
// [regex, sprite, tint?]. tint is a ramp name, a colour, {a, b, glint} or (name, match) => one of those.
const RULES = GROUPS.flatMap(g => g.rules);

// Bedrock ids that differ from the Java names the rules are written against.
const ALIASES = {
  netherbrick: 'nether_brick', nether_brick: 'nether_bricks', red_nether_brick: 'red_nether_bricks', yellow_flower: 'dandelion', red_flower: 'poppy', waterlily: 'lily_pad', deadbush: 'dead_bush',
  frame: 'item_frame', glow_frame: 'glow_item_frame', reeds: 'sugar_cane', wooden_door: 'oak_door', trapdoor: 'oak_trapdoor',
  fence_gate: 'oak_fence_gate', wooden_button: 'oak_button', wooden_pressure_plate: 'oak_pressure_plate', iron_chain: 'chain',
  hardened_clay: 'terracotta', stonebrick: 'stone_bricks', brick_block: 'bricks', magma: 'magma_block', lit_pumpkin: 'jack_o_lantern',
  stonecutter_block: 'stonecutter', web: 'cobweb', melon_block: 'melon', noteblock: 'note_block', slime: 'slime_block',
  turtle_shell_piece: 'turtle_scute', scute: 'turtle_scute', empty_map: 'map', fireworks: 'firework_rocket', firework: 'firework_rocket',
  carrotonastick: 'carrot_on_a_stick', appleenchanted: 'enchanted_golden_apple', speckled_melon: 'glistering_melon_slice',
  sign: 'oak_sign', boat: 'oak_boat', chest_boat: 'oak_chest_boat', normal_stone_slab: 'stone_slab', normal_stone_stairs: 'stone_stairs',
  golden_rail: 'powered_rail', silver_glazed_terracotta: 'light_gray_glazed_terracotta', grass: 'grass_block', tallgrass: 'short_grass',
  snow_layer: 'snow', double_plant: 'sunflower', mob_spawner: 'spawner', quartz_ore: 'nether_quartz_ore', redstone_wire: 'redstone',
  unpowered_repeater: 'repeater', unpowered_comparator: 'comparator', lit_redstone_lamp: 'redstone_lamp', lit_furnace: 'furnace',
  undyed_shulker_box: 'shulker_box', skull: 'skeleton_skull', banner_pattern: 'flower_banner_pattern', invisible_bedrock: 'barrier',
};

function hashColor(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 28% 70%)`;
}

/** Canonical (Java-style) name for an id: namespace stripped, Bedrock aliases applied. */
export function canonicalName(id) {
  const name = (id || '').replace(/^[^:]+:/, '').replace(/\.block$/, '');
  return ALIASES[name] || name;
}

/** What to draw for an item id: `{ kind: 'sprite', sprite, a, b, glint }` or `{ kind: 'block', name }`. */
export function itemArt(id) {
  const name = canonicalName(id);
  const vanilla = !/:/.test(id || '') || /^minecraft:/.test(id);
  for (const [re, sprite, tint] of RULES) {
    const m = name.match(re);
    if (!m) continue;
    let t = typeof tint === 'function' ? tint(name, m) : tint;
    if (typeof t === 'string' || Array.isArray(t)) t = { a: t };
    return { kind: 'sprite', sprite, a: t?.a, b: t?.b, glint: !!t?.glint };
  }
  if (vanilla || looksLikeBlock(name) || /\.block$/.test(id || '')) return { kind: 'block', name };
  return { kind: 'sprite', sprite: 'unknown', a: hashColor(name), b: DYES.white };
}

const cache = new Map();

// Blocks are rasterised; the browser encodes them with a canvas, Node (scripts, tests) must call
// setPngEncoder with src/format/png.js#encodePng.
let encodePng = null;
export function setPngEncoder(fn) { encodePng = fn; }

function blockUrl(name) {
  const px = blockPixels(name);
  if (encodePng) return `data:image/png;base64,${encodePng(SIZE, SIZE, new Uint8Array(px.buffer)).toString('base64')}`;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  canvas.getContext('2d').putImageData(new ImageData(px, SIZE, SIZE), 0, 0);
  return canvas.toDataURL('image/png');
}

/** Cached data: URL of the item's picture, plus whether it shimmers like an enchanted item. */
export function itemArtUrl(id) {
  let hit = cache.get(id);
  if (!hit) {
    const art = itemArt(id);
    hit = art.kind === 'block'
      ? { url: blockUrl(art.name), glint: false, block: true }
      : { url: `data:image/svg+xml,${encodeURIComponent(spriteSvg(SPRITES[art.sprite] || SPRITES.unknown, art.a, art.b))}`, glint: art.glint };
    cache.set(id, hit);
  }
  return hit;
}
