// Placed blocks as small 3D models in the inventory's isometric view: full cubes, slabs, stairs,
// walls, fences, carpets, chests… Each face gets a procedural 16×16 texture for the block's
// family (planks, logs, bricks, ores, glass…) in colours from the map palette, and the model is
// rasterised to RGBA (`blockPixels`); index.js turns that into a PNG.
import { blockColor } from '../../../../src/extract/surface.js';
import { rgb, mix, WOODS, woodOf, DYES, dyeOf } from './color.js';

// --- textures ---------------------------------------------------------------
// A texture is 256 [r, g, b, a] texels, row-major (y down).

function rng(seedStr) {
  let h = 1779033703;
  for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353) >>> 0, h = (h << 13 | h >>> 19) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
const tone = (c, f, a = 255) => [clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f), a];
const tex = fn => { const t = new Array(256); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t[y * 16 + x] = fn(x, y); return t; };
const pick = (r, list) => list[Math.floor(r() * list.length)];
const C = c => (typeof c === 'string' ? rgb(c) : c);

// smooth value noise on a wrapping grid of `cell` texels
function valueNoise(r, cell) {
  const n = 16 / cell, g = Array.from({ length: n * n }, () => r());
  const at = (i, j) => g[((j + n) % n) * n + ((i + n) % n)];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (at(i, j) * (1 - sx) + at(i + 1, j) * sx) * (1 - sy) + (at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx) * sy;
  };
}
const q = (f, step = 0.06) => Math.round(f / step) * step; // quantise brightness like a hand-made palette

function noisy(base, seed, { amp = 0.12, fine = 0.06, cell = 4 } = {}) {
  const r = rng(seed), vn = valueNoise(r, cell);
  return tex((x, y) => tone(C(base), q(1 + (vn(x, y) - 0.5) * 2 * amp + (r() - 0.5) * 2 * fine)));
}

function speckle(base, seed, { dark = 0.82, light = 1.12, p = 0.18, fine = 0.04 } = {}) {
  const r = rng(seed);
  return tex(() => { const v = r(); return tone(C(base), v < p / 2 ? dark : v < p ? light : q(1 + (r() - 0.5) * 2 * fine, 0.04)); });
}

function cobble(base, seed, { cells = 9, border = 0.6, mortar } = {}) {
  const r = rng(seed), pts = Array.from({ length: cells }, () => [r() * 16, r() * 16, pick(r, [0.82, 0.9, 1, 1.06, 1.14])]);
  return tex((x, y) => {
    let d1 = 99, d2 = 99, best;
    for (const p of pts) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) {
      const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
      if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
    }
    if (d2 - d1 < 1.1) return mortar ? [...C(mortar), 255] : tone(C(base), border);
    return tone(C(base), best[2] * (d2 - d1 < 2.2 && y + 0.5 < best[1] ? 1.1 : 1) * q(1 + (r() - 0.5) * 0.08));
  });
}

function planks(base, seed) {
  const r = rng(seed), joints = [r() * 16 | 0, r() * 16 | 0, r() * 16 | 0, r() * 16 | 0];
  const grain = Array.from({ length: 16 }, () => { const row = []; while (row.length < 16) { const f = pick(r, [0.9, 0.95, 1, 1, 1.05]), n = 2 + (r() * 5 | 0); for (let i = 0; i < n; i++) row.push(f); } return row; });
  return tex((x, y) => {
    if (y % 4 === 3) return tone(C(base), 0.66);
    if (x === joints[y >> 2]) return tone(C(base), 0.74);
    return tone(C(base), grain[y][x] * (y % 4 === 0 ? 1.05 : 1));
  });
}

function logSide(bark, seed, { stripes = 0.22 } = {}) {
  const r = rng(seed), col = Array.from({ length: 16 }, () => pick(r, [1 - stripes, 1 - stripes / 2, 1, 1, 1 + stripes / 3]));
  return tex((x, y) => tone(C(bark), (r() < 0.15 ? pick(r, [0.85, 1.1]) : 1) * col[x] * (((x * 7 + y * 3) % 11 === 0) ? 0.82 : 1)));
}

function logTop(bark, inner, seed) {
  const r = rng(seed);
  return tex((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) return tone(C(bark), q(0.9 + r() * 0.15));
    return tone(C(inner), (Math.floor(d) % 2 ? 0.9 : 1.04) * q(1 + (r() - 0.5) * 0.06));
  });
}

// running-bond bricks: w×h bricks with 1-texel mortar, offset by half a brick every row
function bricks(base, mortar, seed, { w = 8, h = 4, bevel = 0.1 } = {}) {
  const r = rng(seed);
  return tex((x, y) => {
    const row = Math.floor(y / h), bx = (x + (row % 2) * (w / 2)) % w, by = y % h;
    if (by === h - 1 || bx === w - 1) return [...C(mortar), 255];
    const f = by === 0 || bx === 0 ? 1 + bevel : by === h - 2 || bx === w - 2 ? 1 - bevel / 2 : 1;
    return tone(C(base), f * q(1 + (r() - 0.5) * 0.12));
  });
}

function bevelled(base, seed, { size = 16, amp = 0.05, edge = 0.12 } = {}) {
  const r = rng(seed);
  return tex((x, y) => {
    const ix = x % size, iy = y % size;
    const f = ix === 0 || iy === 0 ? 1 + edge : ix === size - 1 || iy === size - 1 ? 1 - edge * 1.4 : q(1 + (r() - 0.5) * 2 * amp, 0.03);
    return tone(C(base), f);
  });
}

function overlay(t, fn) { return t.map((px, i) => fn(i % 16, i >> 4, px) || px); }

const ORE_SPOTS = [[2, 3], [3, 3], [3, 4], [9, 2], [10, 2], [10, 3], [11, 3], [5, 8], [6, 8], [6, 9], [12, 9], [13, 9], [12, 10], [3, 12], [4, 12], [4, 13], [9, 13], [10, 13], [10, 12]];
function ore(host, color) {
  const c = C(color), spots = new Set(ORE_SPOTS.map(([x, y]) => y * 16 + x));
  return overlay(host, (x, y) => {
    if (!spots.has(y * 16 + x)) return null;
    const lit = !spots.has((y - 1) * 16 + x) || !spots.has(y * 16 + x - 1);
    const dim = !spots.has((y + 1) * 16 + x) && !spots.has(y * 16 + x + 1);
    return tone(c, lit ? 1.18 : dim ? 0.72 : 1);
  });
}

function glass(tint, { alpha = 40, frame = 220 } = {}) {
  const c = C(tint);
  return tex((x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [...mix(c, [255, 255, 255], 0.55), frame];
    if ((x + y === 6 || x + y === 7 || x + y === 11) && x > 1 && y > 1 && x < 12 && y < 12) return [...mix(c, [255, 255, 255], 0.75), 200];
    return [...c, alpha];
  });
}

function stripesV(base, seed, { amp = 0.1, every = 3 } = {}) {
  const r = rng(seed);
  return tex((x) => tone(C(base), x % every === 0 ? 1 - amp : q(1 + (r() - 0.3) * amp)));
}

// --- block families -------------------------------------------------------------

const STONE = '#7f7f7f', DEEPSLATE = '#4d4d50', NETHERRACK = '#6e2c2c';
const ORE_COLORS = {
  coal: '#2b2b2b', iron: '#d8af93', copper: '#e0794e', gold: '#fcee4b', redstone: '#ff1a1a', lapis: '#1d47c4', diamond: '#5decf5',
  emerald: '#17dd62', nether_gold: '#f6d33c', nether_quartz: '#ece4da', quartz: '#ece4da',
};
const METALS = {
  iron_block: '#dcdcdc', gold_block: '#f5d042', diamond_block: '#62ede4', emerald_block: '#2fd96b', netherite_block: '#443e40',
  lapis_block: '#2350b8', redstone_block: '#b31c0c', coal_block: '#1e1e1e', raw_iron_block: '#a68a6e', raw_gold_block: '#dca431',
  raw_copper_block: '#9a5a3e', copper_block: '#c06b4f', amethyst_block: '#8c63c6', quartz_block: '#ece6dc',
};
const COPPER_AGE = { '': '#c06b4f', exposed: '#a17e66', weathered: '#6c9a6e', oxidized: '#52a284' };

function grassSide(dirt, grass, seed) {
  const r = rng(seed), depth = Array.from({ length: 16 }, () => 2 + (r() * 3 | 0));
  const d = noisy(dirt, `${seed}d`, { amp: 0.1, fine: 0.08, cell: 2 });
  return overlay(d, (x, y) => (y < depth[x] ? tone(C(grass), q(0.9 + r() * 0.2)) : null));
}

function bookshelf(seed) {
  const r = rng(seed), wood = planks(WOODS.oak.planks, seed);
  const colors = ['#8a2a1e', '#2f4a8a', '#3d7a2a', '#7a5a2a', '#6a2f7a', '#b8a35a', '#3a6a6a'];
  const books = [];
  for (const top of [1, 9]) { let x = 1; while (x < 15) { const w = 1 + (r() < 0.4 ? 1 : 0), c = C(pick(r, colors)), h = 5 + (r() < 0.3 ? 1 : 0); for (let i = 0; i < w && x < 15; i++, x++) books.push([x, top, h, c]); } }
  return overlay(wood, (x, y) => {
    if (y === 0 || y === 15 || y === 7 || y === 8 || x === 0 || x === 15) return y === 0 || y === 15 ? null : tone(C(WOODS.oak.planks), y === 7 ? 1 : 0.8);
    const b = books.find(([bx, by, h]) => bx === x && y >= by + 6 - h && y < by + 6);
    if (b) return tone(b[3], y === b[1] + 6 - b[2] ? 1.25 : x % 2 ? 0.9 : 1);
    return tone(C(WOODS.oak.planks), 0.35);
  });
}

function tntSide() {
  const L = ['.###.#..#.###.', '..#..##.#..#..', '..#..#.##..#..', '..#..#..#..#..'];
  return tex((x, y) => {
    if (y >= 5 && y <= 10) {
      const ch = L[y - 6]?.[x - 1];
      if (y > 5 && y < 10 && ch === '#') return [24, 24, 24, 255];
      return y === 5 || y === 10 ? [200, 200, 200, 255] : [238, 238, 230, 255];
    }
    return tone(C('#db3a24'), x % 4 === 3 ? 0.78 : (y === 0 || y === 15) ? 0.85 : 1);
  });
}

function pumpkinSide(seed, face) {
  const t = stripesV('#e38a1d', seed, { amp: 0.16, every: 4 });
  if (!face) return t;
  const lit = face === 'lit', eye = new Set([[3, 5], [4, 5], [4, 6], [11, 5], [12, 5], [11, 6], [3, 10], [4, 10], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 10], [12, 10], [7, 10], [8, 10]].map(([x, y]) => y * 16 + x));
  return overlay(t, (x, y) => (eye.has(y * 16 + x) ? (lit ? [255, 214, 74, 255] : [40, 24, 8, 255]) : null));
}

function chestTex(base, kind) {
  const c = C(base), dark = mix(c, [0, 0, 0], 0.55), latch = kind === 'ender' ? [60, 180, 160] : [200, 200, 200];
  const side = tex((x, y) => (x === 0 || x === 15 || y === 0 || y === 13 || y === 4 ? [...dark, 255] : tone(c, y < 4 ? 1.08 : q(1 + ((x * 5 + y * 3) % 7 - 3) * 0.015))));
  const front = overlay(side, (x, y) => (x >= 7 && x <= 8 && y >= 2 && y <= 6 ? [...(y === 2 ? latch : mix(latch, [0, 0, 0], 0.25)), 255] : null));
  const top = tex((x, y) => (x === 0 || x === 15 || y === 0 || y === 15 ? [...dark, 255] : tone(c, 1.1 * q(1 + ((x * 3 + y * 7) % 5 - 2) * 0.02))));
  return { top, side, front };
}

function shulkerTex(base) {
  const c = C(base);
  const side = tex((x, y) => (y === 7 || y === 8 ? tone(c, 0.7) : tone(c, (x === 0 || x === 15) ? 0.85 : y < 7 ? 1.08 : 0.96)));
  const top = tex((x, y) => tone(c, (x === 0 || y === 0 || x === 15 || y === 15) ? 0.85 : (x > 3 && x < 12 && y > 3 && y < 12) ? 1.12 : 1.04));
  return { top, side };
}

function barrelTex(seed) {
  const wood = C('#8a6338'), band = [70, 70, 70];
  const side = overlay(stripesV(wood, seed, { amp: 0.16, every: 4 }), (x, y) => (y === 2 || y === 13 ? [...band, 255] : null));
  const top = tex((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return d > 7 ? tone(wood, 0.7) : d > 5.6 ? [...band, 255] : tone(wood, (y % 4 === 3) ? 0.8 : 1.05); });
  return { top, side };
}

function craftingTable(seed) {
  const p = C(WOODS.oak.planks), dark = mix(p, [0, 0, 0], 0.5);
  const top = tex((x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [...dark, 255] : (x === 5 || x === 10 || y === 5 || y === 10) ? tone(p, 0.72) : tone(p, 1.08)));
  const side = overlay(planks(p, seed), (x, y) => {
    if (y < 3) return tone(C('#6b4a2a'), y === 0 ? 1.15 : 0.95);
    if ((x === 3 && y > 4 && y < 12) || (y === 5 && x > 1 && x < 6)) return [130, 130, 130, 255]; // saw / hammer
    if (x >= 10 && x <= 12 && y >= 5 && y <= 7) return [150, 150, 150, 255];
    if (x === 11 && y > 7 && y < 13) return tone(p, 0.6);
    return null;
  });
  return { top, side };
}

function furnaceTex(base, kind) {
  const b = C(base), side = bevelled(b, `${kind}s`, { amp: 0.06, edge: 0.1 });
  const front = overlay(side, (x, y) => {
    if (x >= 3 && x <= 12 && y >= 8 && y <= 13) return x === 3 || x === 12 || y === 8 || y === 13 ? tone(b, 0.62) : [24, 22, 22, 255];
    if (y === 3 && x >= 3 && x <= 12) return tone(b, 0.65);
    if (kind === 'dispenser' && Math.hypot(x - 7.5, y - 6.5) < 2.4) return [20, 20, 20, 255];
    return null;
  });
  return { top: bevelled(b, `${kind}t`, { amp: 0.04 }), side, front: kind === 'dispenser' ? overlay(side, (x, y) => (Math.hypot(x - 7.5, y - 7.5) < 3 ? [24, 22, 22, 255] : null)) : front };
}

function observerTex(seed) {
  const g = C('#6e6e6e'), side = bevelled(g, seed, { amp: 0.05 });
  const front = overlay(side, (x, y) => (y >= 5 && y <= 9 && ((x >= 2 && x <= 6) || (x >= 9 && x <= 13)) ? (y === 7 && (x === 4 || x === 11) ? [140, 30, 30, 255] : [30, 30, 30, 255]) : null));
  return { top: overlay(side, (x, y) => (Math.abs(x - 7.5) < 1 && y > 3 && y < 13 ? [160, 30, 30, 255] : null)), side, front };
}

function pistonTex(seed, sticky) {
  const top = overlay(planks(WOODS.oak.planks, seed), (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [100, 100, 100, 255] : sticky && x > 3 && x < 12 && y > 3 && y < 12 ? [110, 180, 90, 255] : null));
  const side = overlay(bevelled(C('#6f6f6f'), seed, { amp: 0.05 }), (x, y) => (y < 4 ? tone(C(WOODS.oak.planks), y === 3 ? 0.7 : 1) : null));
  return { top, side };
}

function oreName(mat) {
  const m = mat.match(/^(deepslate_)?(\w+?)_ore$/);
  if (!m) return null;
  const nether = /^nether_/.test(m[2]);
  return { host: m[1] ? 'deepslate' : nether ? 'netherrack' : 'stone', color: ORE_COLORS[m[2]] || '#e0e0e0' };
}

/** Face textures for a material name (a full-block id): { top, side, front?, east?, bottom? }. */
export function blockTextures(mat) {
  const base = rgb(`rgb(${blockColor(`minecraft:${mat}`).join(',')})`);
  const s = mat;
  const same = t => ({ top: t, side: t });
  const wood = woodOf(mat);
  const dye = dyeOf(mat);

  const o = oreName(mat);
  if (o) {
    const host = o.host === 'deepslate' ? noisy(DEEPSLATE, s, { amp: 0.08, cell: 4 }) : o.host === 'netherrack' ? noisy(NETHERRACK, s, { amp: 0.16, cell: 2 }) : noisy(STONE, s);
    return same(ore(host, o.color));
  }
  if (mat === 'ancient_debris') return { top: bevelled('#5e4a44', s, { amp: 0.1 }), side: stripesV('#654740', s, { amp: 0.18, every: 3 }) };
  if (mat === 'gilded_blackstone') return same(ore(noisy('#2c2629', s, { amp: 0.1 }), '#e8b12c'));

  if (/^(stripped_)?\w+_(log|wood|stem|hyphae)$/.test(mat) || /^(bamboo_block|stripped_bamboo_block)$/.test(mat)) {
    const w = WOODS[wood] || WOODS.oak, stripped = /^stripped_/.test(mat);
    const bark = stripped ? mix(rgb(w.planks), [0, 0, 0], 0.08) : rgb(w.bark);
    const side = wood === 'birch' && !stripped
      ? overlay(logSide(bark, s, { stripes: 0.06 }), (x, y) => (((x * 5 + y * 11) % 13 === 0 || (x * 3 + y * 7) % 17 === 0) ? [40, 40, 40, 255] : null))
      : logSide(bark, s, { stripes: stripped ? 0.08 : 0.22 });
    if (/_(wood|hyphae)$/.test(mat)) return same(side);
    return { top: logTop(bark, w.planks, s), side };
  }
  if (/_planks$|^bamboo_mosaic$/.test(mat)) return same(planks(WOODS[wood]?.planks || base, s));
  if (/_leaves$|^azalea_leaves/.test(mat)) {
    const r = rng(s), c = /cherry/.test(mat) ? '#e8a6bf' : /pale_oak/.test(mat) ? '#8a948a' : /azalea/.test(mat) ? '#5f7f2c' : base;
    const flowers = /flower/.test(mat);
    return same(tex(() => { const v = r(); if (flowers && v < 0.08) return [212, 106, 190, 255]; return tone(C(c), v < 0.22 ? 0.58 : v < 0.45 ? 0.82 : v < 0.85 ? 1 : 1.18); }));
  }

  if (/^(grass_block|grass)$/.test(mat)) return { top: noisy('#6da23a', s, { amp: 0.1, fine: 0.08, cell: 2 }), side: grassSide('#866043', '#6da23a', s) };
  if (mat === 'mycelium') return { top: speckle('#6f6369', s, { p: 0.3 }), side: grassSide('#866043', '#6f6369', s) };
  if (mat === 'podzol') return { top: noisy('#5b3f18', s, { amp: 0.15, cell: 2 }), side: grassSide('#866043', '#5b3f18', s) };
  if (/^(crimson|warped)_nylium$/.test(mat)) {
    const top = mat.startsWith('crimson') ? '#8a1f1f' : '#2b7265';
    return { top: noisy(top, s, { amp: 0.15, cell: 2 }), side: grassSide(NETHERRACK, top, s) };
  }
  if (/^(dirt_path|grass_path)$/.test(mat)) return { top: noisy('#94793f', s, { amp: 0.1, cell: 2 }), side: grassSide('#866043', '#94793f', s) };
  if (/^(dirt|coarse_dirt|rooted_dirt|dirt_with_roots|farmland|mud|packed_mud|clay|soul_soil)$/.test(mat)) return same(noisy(base, s, { amp: 0.12, fine: 0.1, cell: 2 }));
  if (/^(sand|red_sand|suspicious_sand|end_stone|white_concrete_powder)$/.test(mat) || /_concrete_powder$/.test(mat)) return same(speckle(dye ? DYES[dye] : base, s));
  if (/^(gravel|suspicious_gravel)$/.test(mat)) return same(cobble('#857d7b', s, { cells: 16, border: 0.7 }));
  if (mat === 'soul_sand') return same(overlay(noisy('#513e32', s, { amp: 0.12, cell: 2 }), (x, y) => ((x % 8 === 2 || x % 8 === 4) && y % 8 === 3) || (x % 8 > 1 && x % 8 < 6 && y % 8 === 6) ? [40, 28, 22, 255] : null));
  if (mat === 'netherrack') return same(noisy(NETHERRACK, s, { amp: 0.18, cell: 2, fine: 0.08 }));
  if (mat === 'obsidian' || mat === 'crying_obsidian') {
    const r = rng(s);
    return same(tex(() => { const v = r(); return v < 0.1 ? (mat === 'crying_obsidian' && v < 0.05 ? [140, 60, 230, 255] : [60, 40, 90, 255]) : tone(C('#14121e'), v < 0.5 ? 1 : 1.5); }));
  }
  if (/^(stone|smooth_stone|infested_stone|normal_stone)$/.test(mat)) return same(mat === 'smooth_stone' ? bevelled('#9e9e9e', s, { amp: 0.03, edge: 0.06 }) : noisy(STONE, s));
  if (/^(cobblestone|mossy_cobblestone|cobbled_deepslate|infested_cobblestone)$/.test(mat)) {
    const t = cobble(mat === 'cobbled_deepslate' ? '#555558' : '#808080', s, { border: 0.55 });
    if (mat !== 'mossy_cobblestone') return same(t);
    const r = rng(`${s}m`), vn = valueNoise(r, 4);
    return same(overlay(t, (x, y) => (vn(x, y) > 0.55 ? tone(C('#5e7a33'), q(0.9 + r() * 0.2)) : null)));
  }
  if (/^(granite|diorite|andesite)$/.test(mat)) {
    const look = { granite: ['#9a6b58', 0.8, 1.2, 0.35], diorite: ['#c0c0c2', 0.62, 1.12, 0.3], andesite: ['#888889', 0.8, 1.14, 0.3] }[mat];
    return same(speckle(look[0], s, { dark: look[1], light: look[2], p: look[3], fine: 0.05 }));
  }
  if (/_shelf$/.test(mat)) {
    const p = C(WOODS[wood]?.planks || base);
    return { top: planks(p, s), side: tex((x, y) => (x === 0 || x === 15 || y === 0 || y === 15 ? tone(p, 0.62) : y === 7 || y === 8 ? tone(p, y === 7 ? 1.12 : 0.9) : tone(p, 0.42))) };
  }
  if (/^(tuff|calcite|dripstone_block|basalt|smooth_basalt|blackstone|deepslate|bedrock|end_stone|moss_block|pale_moss_block|sculk|magma_block|nether_wart_block|warped_wart_block|shroomlight|glowstone|sponge|wet_sponge|snow|snow_block|powder_snow|cinnabar|sulfur|potent_sulfur|amethyst_block|budding_amethyst|prismarine|sea_lantern|honeycomb_block|bone_block|dried_kelp_block)$/.test(mat)) {
    if (mat === 'deepslate') return { top: noisy(DEEPSLATE, s, { amp: 0.08 }), side: overlay(noisy(DEEPSLATE, s, { amp: 0.06 }), (x, y) => ((y * 5 + (x >> 2) * 3) % 7 === 0 ? tone(C(DEEPSLATE), 0.75) : null)) };
    if (mat === 'basalt') return { top: cobble('#555559', s, { cells: 5 }), side: stripesV('#535357', s, { amp: 0.2, every: 3 }) };
    if (mat === 'bone_block') return { top: tex((x, y) => tone(C('#e1dcc3'), Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) > 6 ? 1 : 0.86)), side: stripesV('#e1dcc3', s, { amp: 0.08, every: 4 }) };
    if (mat === 'magma_block') { const r = rng(s); return same(tex(() => (r() < 0.22 ? [255, 160, 40, 255] : tone(C('#7a3416'), q(0.8 + r() * 0.3))))); }
    if (mat === 'sculk') { const r = rng(s); return same(tex(() => (r() < 0.08 ? [40, 220, 230, 255] : tone(C('#0e2a33'), q(0.8 + r() * 0.5))))); }
    if (mat === 'glowstone' || mat === 'shroomlight' || mat === 'sea_lantern') return same(cobble(mat === 'glowstone' ? '#d9a95a' : mat === 'shroomlight' ? '#f19446' : '#b7d6cc', s, { cells: 7, border: mat === 'sea_lantern' ? 1.25 : 0.72 }));
    if (mat === 'sponge' || mat === 'wet_sponge') { const r = rng(s); return same(tex(() => tone(C(mat === 'sponge' ? '#c9c44e' : '#a39f3a'), r() < 0.18 ? 0.6 : q(0.95 + r() * 0.1)))); }
    if (mat === 'honeycomb_block') return same(tex((x, y) => tone(C('#e5a02c'), ((x + (y >> 2) % 2 * 2) % 4 === 0 || y % 4 === 0) ? 0.72 : 1.05)));
    const amps = { calcite: 0.05, snow: 0.03, snow_block: 0.03, powder_snow: 0.03, bedrock: 0.3, blackstone: 0.1, smooth_basalt: 0.06, prismarine: 0.2, amethyst_block: 0.16 };
    return same(noisy(base, s, { amp: amps[mat] ?? 0.12, cell: mat === 'bedrock' ? 2 : 4 }));
  }

  if (/^(bricks|brick_block)$/.test(mat)) return same(bricks('#9a5a46', '#b3a69a', s, { w: 8, h: 4, bevel: 0.08 }));
  if (/^mud_bricks$/.test(mat)) return same(bricks('#8b6a4f', '#5f4a38', s));
  if (/stone_bricks$|^stonebrick$/.test(mat) || /^infested_\w*stone_bricks$/.test(mat)) {
    let t = bricks(/^(end_stone)/.test(mat) ? '#dcdc9f' : '#7d7d7d', /^(end_stone)/.test(mat) ? '#b8b783' : '#5a5a5a', s, { w: 8, h: 4, bevel: 0.12 });
    if (/^mossy/.test(mat)) { const r = rng(`${s}m`), vn = valueNoise(r, 4); t = overlay(t, (x, y) => (vn(x, y) > 0.6 ? tone(C('#5e7a33'), q(0.9 + r() * 0.2)) : null)); }
    if (/^cracked/.test(mat)) t = overlay(t, (x, y) => ((x === 5 && y > 2 && y < 9) || (y === 9 && x > 5 && x < 10) || (x === 11 && y > 11) ? [60, 60, 60, 255] : null));
    if (/^chiseled/.test(mat)) t = bevelled('#7d7d7d', s, { size: 16, edge: 0.15 }).map((p, i) => ((i % 16 > 3 && i % 16 < 12 && i >> 4 > 3 && i >> 4 < 12 && (i % 16 === 4 || i % 16 === 11 || i >> 4 === 4 || i >> 4 === 11)) ? tone(C('#7d7d7d'), 0.7) : p));
    return same(t);
  }
  if (/^(nether_bricks|red_nether_bricks|cracked_nether_bricks|chiseled_nether_bricks)$/.test(mat) || /^nether_brick/.test(mat)) {
    const red = /^red_/.test(mat);
    return same(bricks(red ? '#5a0a0c' : '#2e171b', red ? '#3a0507' : '#180c0e', s, { w: 8, h: 4, bevel: 0.15 }));
  }
  if (/^(deepslate_bricks|cracked_deepslate_bricks|polished_blackstone_bricks|cracked_polished_blackstone_bricks|tuff_bricks|end_bricks|end_stone_bricks|prismarine_bricks|quartz_bricks|resin_bricks|cinnabar_bricks|sulfur_bricks)$/.test(mat)) {
    const cols = { deepslate: ['#505054', '#323234'], polished_blackstone: ['#3a3439', '#201c20'], tuff: ['#6c6e66', '#4c4d48'], end: ['#dcdc9f', '#b8b783'], prismarine: ['#5fa898', '#3b6e66'], quartz: ['#ece6dc', '#c6bfb5'], resin: ['#d0601c', '#8a3c10'] };
    const key = Object.keys(cols).find(k => mat.includes(k)) || 'deepslate';
    return same(bricks(cols[key][0], cols[key][1], s, { w: 8, h: 4, bevel: 0.1 }));
  }
  if (/deepslate_tiles$/.test(mat)) return same(bricks('#3f3f42', '#28282a', s, { w: 4, h: 4, bevel: 0.12 }));
  if (/^(polished_|smooth_|cut_)/.test(mat) || /^chiseled_/.test(mat)) {
    const src = mat.replace(/^(polished|smooth|cut|chiseled)_/, '');
    const b = rgb(`rgb(${blockColor(`minecraft:${src}`).join(',')})`);
    if (/sandstone/.test(mat)) return { top: bevelled(b, s, { amp: 0.03 }), side: overlay(bevelled(b, s, { amp: 0.04 }), (x, y) => (/^cut_/.test(mat) && (y === 4 || y === 11) ? tone(b, 0.8) : null)) };
    if (/copper/.test(mat)) return same(bricks(b, mix(b, [0, 0, 0], 0.3), s, { w: 8, h: 8, bevel: 0.12 }));
    return same(bevelled(/^chiseled/.test(mat) ? b : b, s, { size: /^chiseled/.test(mat) ? 8 : 16, amp: 0.04, edge: 0.1 }));
  }
  if (/sandstone$/.test(mat)) {
    const b = /red/.test(mat) ? C('#b5621f') : C('#d8cb9b');
    return { top: bevelled(b, s, { amp: 0.04 }), side: tex((x, y) => tone(b, y < 3 ? 1.06 : y > 12 ? 0.86 : q(1 + ((x * 7 + y * 3) % 5 - 2) * 0.02))) };
  }

  if (METALS[mat]) {
    const b = C(METALS[mat]), r = rng(s);
    return same(tex((x, y) => {
      if (x === 0 || y === 0) return tone(b, 1.18);
      if (x === 15 || y === 15) return tone(b, 0.7);
      if (/raw_|amethyst/.test(mat)) return tone(b, q(0.85 + r() * 0.3));
      return tone(b, (y === 2 && x > 1 && x < 7) || (x === 2 && y > 1 && y < 5) ? 1.16 : (x + y === 20 || y === 13) ? 0.9 : 1);
    }));
  }
  const cu = mat.match(/^(?:waxed_)?(?:(exposed|weathered|oxidized)_)?(copper|copper_block|cut_copper|chiseled_copper|copper_grate|copper_bulb)$/);
  if (cu) {
    const b = C(COPPER_AGE[cu[1] || '']), kind = cu[2];
    if (kind === 'cut_copper') return same(bricks(b, mix(b, [0, 0, 0], 0.35), s, { w: 8, h: 8, bevel: 0.12 }));
    if (kind === 'copper_grate') return same(tex((x, y) => (x % 4 === 0 || y % 4 === 0 ? tone(b, x % 4 === 0 && y % 4 === 0 ? 0.8 : 1) : [0, 0, 0, 0])));
    if (kind === 'copper_bulb') return same(tex((x, y) => (x < 2 || y < 2 || x > 13 || y > 13 ? tone(b, 1) : x > 4 && y > 4 && x < 11 && y < 11 ? [90, 70, 60, 255] : tone(b, 0.75))));
    if (kind === 'chiseled_copper') return same(bevelled(b, s, { size: 8, edge: 0.15 }));
    return same(bevelled(b, s, { amp: 0.06, edge: 0.12 }));
  }

  if (/_wool$|^wool$/.test(mat)) { const c = C(DYES[dye] || DYES.white), r = rng(s); return same(tex((x, y) => tone(c, q((((x + y * 2) % 4) === 0 ? 0.92 : 1) * (1 + (r() - 0.5) * 0.1), 0.04)))); }
  if (/_concrete$/.test(mat)) return same(noisy(DYES[dye] || base, s, { amp: 0.02, fine: 0.02 }));
  if (/_glazed_terracotta$/.test(mat)) {
    const c = C(DYES[dye] || base), w = mix(c, [255, 255, 255], 0.55), d = mix(c, [0, 0, 0], 0.4);
    return same(tex((x, y) => { const a = Math.min(x, 15 - x), b2 = Math.min(y, 15 - y); return [...((a + b2) % 5 === 0 ? d : (a * b2) % 7 < 2 ? w : c), 255]; }));
  }
  if (/terracotta$/.test(mat)) {
    const c = dye ? mix(C(DYES[dye]), [152, 94, 67], 0.45) : C('#985e43');
    return same(noisy(c, s, { amp: 0.04, fine: 0.04 }));
  }
  if (/glass$/.test(mat)) {
    if (mat === 'tinted_glass') return same(glass('#2c2430', { alpha: 190, frame: 240 }));
    return same(glass(dye ? DYES[dye] : '#c9e3ea', { alpha: dye ? 120 : 30, frame: dye ? 230 : 210 }));
  }
  if (/^(ice|packed_ice|blue_ice|frosted_ice)$/.test(mat)) {
    const c = C(mat === 'blue_ice' ? '#74a7fd' : mat === 'packed_ice' ? '#8db4fa' : '#91b7fd');
    return same(tex((x, y) => (x + y === 9 || x + y === 10 || x + y === 18 ? [...mix(c, [255, 255, 255], 0.6), 235] : [...c, mat === 'ice' ? 200 : 255])));
  }

  if (mat === 'bookshelf') return { top: planks(WOODS.oak.planks, s), side: bookshelf(s) };
  if (mat === 'chiseled_bookshelf') return { top: planks(WOODS.oak.planks, s), side: overlay(bookshelf(s), x => (x === 5 || x === 10 ? tone(C(WOODS.oak.planks), 0.8) : null)) };
  if (mat === 'crafting_table') return craftingTable(s);
  if (/^(furnace|lit_furnace|blast_furnace|smoker|dispenser|dropper)$/.test(mat)) return furnaceTex(mat === 'blast_furnace' ? '#5d5d61' : mat === 'smoker' ? '#6b5a48' : '#7a7a7a', mat === 'dispenser' || mat === 'dropper' ? 'dispenser' : mat);
  if (mat === 'observer') return observerTex(s);
  if (/^(sticky_)?piston$/.test(mat)) return pistonTex(s, /sticky/.test(mat));
  if (mat === 'tnt') return { top: tex((x, y) => (Math.hypot(x - 7.5, y - 7.5) < 2 ? [60, 60, 60, 255] : tone(C('#db3a24'), 0.9))), side: tntSide() };
  if (/^(pumpkin|carved_pumpkin|jack_o_lantern)$/.test(mat)) {
    const top = tex((x, y) => (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5 ? [90, 70, 30, 255] : tone(C('#e38a1d'), Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) > 6 ? 0.85 : 1)));
    return { top, side: pumpkinSide(s), front: pumpkinSide(s, mat === 'jack_o_lantern' ? 'lit' : mat === 'carved_pumpkin' ? 'dark' : null) };
  }
  if (/^(melon|melon_block)$/.test(mat)) return { top: noisy('#9bb33a', s, { amp: 0.1 }), side: stripesV('#6f9a1e', s, { amp: 0.25, every: 3 }) };
  if (mat === 'hay_block') return { top: noisy('#c8a23a', s, { amp: 0.12, cell: 2 }), side: overlay(stripesV('#c8a23a', s, { amp: 0.12, every: 2 }), (x, y) => (y === 3 || y === 12 ? [130, 40, 30, 255] : null)) };
  if (/^(chest|trapped_chest|copper_chest)$/.test(mat)) return chestTex(mat === 'copper_chest' ? COPPER_AGE[''] : '#a2742f', 'wood');
  if (mat === 'ender_chest') return chestTex('#1f3532', 'ender');
  if (mat === 'barrel') return barrelTex(s);
  if (/shulker_box$/.test(mat)) return shulkerTex(dye ? DYES[dye] : '#976997');
  if (/^(note_block|jukebox)$/.test(mat)) {
    const t = bevelled('#6b4a33', s, { amp: 0.06 });
    return { top: mat === 'jukebox' ? overlay(t, (x, y) => (y >= 7 && y <= 8 && x > 2 && x < 13 ? [24, 24, 24, 255] : null)) : t, side: t };
  }
  if (mat === 'redstone_lamp') return same(tex((x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [90, 50, 30, 255] : tone(C('#7a4a2a'), ((x + y) % 4 === 0) ? 1.3 : 1))));
  if (mat === 'cactus') return { top: tex((x, y) => tone(C('#5e8d33'), Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) > 6 ? 0.8 : 1.05)), side: overlay(stripesV('#4f7d29', s, { amp: 0.2, every: 4 }), (x, y) => ((x % 4 === 1 && y % 5 === 2) ? [20, 20, 20, 255] : null)) };
  if (mat === 'target') return { top: noisy('#e5d4c3', s, { amp: 0.04 }), side: tex((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d < 1.5 || (d > 3 && d < 5) ? [200, 40, 40, 255] : [230, 220, 210, 255]; }) };
  if (/^(beehive|bee_nest)$/.test(mat)) return { top: planks('#b8904e', s), side: overlay(planks('#b8904e', s), (x, y) => (y > 6 && y < 10 && x > 3 && x < 12 ? [235, 170, 40, 255] : null)) };
  if (mat === 'scaffolding') return same(tex((x, y) => (x < 2 || y < 2 || x > 13 || y > 13 || x === y || x + y === 15 ? tone(C('#c4a65c'), x < 2 || y < 2 ? 1.1 : 0.9) : [0, 0, 0, 0])));
  if (/^(spawner|mob_spawner|trial_spawner)$/.test(mat)) return same(tex((x, y) => (x % 4 === 0 || y % 4 === 0 ? [40, 46, 56, 255] : [20, 24, 30, 90])));
  if (/^(slime_block|slime)$/.test(mat)) return same(tex((x, y) => (x > 3 && y > 3 && x < 12 && y < 12 ? [110, 190, 80, 235] : [130, 210, 100, 140])));
  if (mat === 'honey_block') return same(tex((x, y) => [235, 160, 30, x > 2 && y > 2 && x < 13 && y < 13 ? 230 : 170]));
  if (mat === 'beacon') return same(tex((x, y) => (x > 2 && y > 2 && x < 13 && y < 13 ? [120, 230, 225, 255] : [200, 235, 240, 140])));
  if (/(^|_)coral_block$/.test(mat)) return same(speckle(/^dead/.test(mat) ? '#857e79' : base, s, { p: 0.4, dark: 0.8, light: 1.25 }));
  if (/^(red_mushroom_block|brown_mushroom_block|mushroom_stem)$/.test(mat)) return same(mat === 'red_mushroom_block' ? overlay(noisy('#b5251f', s, { amp: 0.06 }), (x, y) => ((x % 6 === 2 && y % 5 === 1) ? [230, 220, 210, 255] : null)) : noisy(mat === 'mushroom_stem' ? '#cfc8b8' : '#97704f', s, { amp: 0.06 }));
  if (/^(lodestone|lectern|loom|stonecutter|grindstone|smithing_table|cartography_table|fletching_table|composter|crafter|enchanting_table|end_portal_frame|daylight_detector|sculk_sensor|sculk_catalyst|sculk_shrieker|anvil|chipped_anvil|damaged_anvil|vault)$/.test(mat)) {
    const looks = {
      lodestone: ['#9a9aa0', '#6a6a70'], lectern: ['#b8904e', '#8a6a3a'], loom: ['#c9a87a', '#8a6a3a'], stonecutter: ['#8a8a8a', '#6b6b6b'],
      grindstone: ['#8f8f8f', '#6b4a33'], smithing_table: ['#3a3a44', '#5a3a2a'], cartography_table: ['#d9c9a0', '#5a3a2a'], fletching_table: ['#d8c48a', '#c4a76a'],
      composter: ['#8a6a3a', '#6a4a2a'], crafter: ['#7a7a7a', '#5a5a5a'], enchanting_table: ['#a8282c', '#24182e'], end_portal_frame: ['#3d6e5a', '#d8d8a0'],
      daylight_detector: ['#d8cbb0', '#8a6a3a'], sculk_sensor: ['#0f4a5a', '#0e2a33'], sculk_catalyst: ['#2a3a3a', '#0e2a33'], sculk_shrieker: ['#cfc6a8', '#0e2a33'],
      anvil: ['#4a4a4a', '#3a3a3a'], chipped_anvil: ['#4a4a4a', '#3a3a3a'], damaged_anvil: ['#4a4a4a', '#3a3a3a'], vault: ['#3a3e44', '#2a2e33'],
    }[mat];
    return { top: bevelled(looks[0], s, { amp: 0.06, edge: 0.14 }), side: bevelled(looks[1], `${s}s`, { amp: 0.06, edge: 0.1 }) };
  }
  if (/^purpur_(block|pillar)$|^purpur$/.test(mat)) return mat === 'purpur_pillar' ? { top: bevelled('#a97ea9', s), side: stripesV('#a97ea9', s, { amp: 0.12, every: 4 }) } : same(bevelled('#a97ea9', s, { size: 8, edge: 0.14 }));
  if (/^quartz_pillar$/.test(mat)) return { top: bevelled('#ece6dc', s), side: stripesV('#ece6dc', s, { amp: 0.06, every: 4 }) };
  if (/froglight$/.test(mat)) { const c = /ochre/.test(mat) ? '#f5e3a0' : /verdant/.test(mat) ? '#d4ecc4' : '#ecd2e4'; return same(bevelled(c, s, { size: 8, edge: 0.15 })); }
  if (mat === 'dragon_egg') return same(speckle('#0e0b14', s, { p: 0.25, light: 2.8 }));

  // generic block: the map colour with light noise and a soft bevel
  return same(bevelled(wood ? rgb(WOODS[wood].planks) : dye ? rgb(DYES[dye]) : base, s, { amp: 0.07, edge: 0.07 }));
}

// --- shapes -------------------------------------------------------------------
// Boxes in texel units (0..16), listed back to front.
const FULL = [[0, 0, 0, 16, 16, 16]];
const SHAPES = {
  cube: FULL,
  slab: [[0, 0, 0, 16, 8, 16]],
  stairs: [[0, 8, 0, 16, 16, 8], [0, 0, 0, 16, 8, 16]],
  wall: [[0, 0, 5, 4, 13, 11], [4, 0, 4, 12, 16, 12], [12, 0, 5, 16, 13, 11]],
  fence: [[0, 0, 6, 4, 16, 10], [4, 12, 7, 12, 15, 9], [4, 6, 7, 12, 9, 9], [12, 0, 6, 16, 16, 10]],
  fence_gate: [[0, 5, 7, 2, 16, 9], [2, 12, 7, 6, 15, 9], [2, 6, 7, 6, 9, 9], [6, 6, 7, 10, 15, 9], [10, 12, 7, 14, 15, 9], [10, 6, 7, 14, 9, 9], [14, 5, 7, 16, 16, 9]],
  carpet: [[0, 0, 0, 16, 1, 16]],
  plate: [[1, 0, 1, 15, 1, 15]],
  button: [[5, 0, 6, 11, 2, 10]],
  trapdoor: [[0, 0, 0, 16, 3, 16]],
  chest: [[1, 0, 1, 15, 14, 15]],
  inset: [[1, 0, 1, 15, 16, 15]],
  path: [[0, 0, 0, 16, 15, 16]],
  table: [[0, 0, 0, 16, 12, 16]],
  frame: [[0, 0, 0, 16, 13, 16]],
  sensor: [[0, 0, 0, 16, 8, 16]],
  detector: [[0, 0, 0, 16, 6, 16]],
  cutter: [[0, 0, 0, 16, 9, 16]],
  layer: [[0, 0, 0, 16, 2, 16]],
  anvil: [[2, 0, 2, 14, 4, 14], [4, 4, 4, 12, 9, 12], [0, 9, 3, 16, 16, 13]],
  egg: [[3, 0, 3, 13, 12, 13], [5, 12, 5, 11, 15, 11]],
};

// Bedrock/Java block ids whose material name differs from the shape's prefix.
const MATERIAL_OF = {
  stone_brick: 'stone_bricks', mossy_stone_brick: 'mossy_stone_bricks', brick: 'bricks', nether_brick: 'nether_bricks', red_nether_brick: 'red_nether_bricks',
  mud_brick: 'mud_bricks', deepslate_brick: 'deepslate_bricks', deepslate_tile: 'deepslate_tiles', polished_blackstone_brick: 'polished_blackstone_bricks',
  tuff_brick: 'tuff_bricks', end_stone_brick: 'end_stone_bricks', prismarine_brick: 'prismarine_bricks', resin_brick: 'resin_bricks', quartz: 'quartz_block',
  purpur: 'purpur_block', smooth_quartz: 'quartz_block', stone_block: 'smooth_stone', normal_stone: 'stone', petrified_oak: 'oak_planks', wooden: 'oak_planks',
  light_weighted: 'gold_block', heavy_weighted: 'iron_block', polished_blackstone: 'polished_blackstone', cut_copper: 'cut_copper',
};

function materialFor(prefix) {
  if (!prefix) return 'stone';
  const plain = prefix.replace(/^waxed_/, '').replace(/_block\d?$/, '_block');
  if (MATERIAL_OF[plain]) return MATERIAL_OF[plain];
  if (WOODS[plain]) return plain === 'bamboo' ? 'bamboo_planks' : `${plain}_planks`;
  const w = plain.match(/^(\w+)_wool$/);
  if (w) return plain;
  return plain;
}

/** Shape name and the full-block material to texture it with. */
export function blockModel(name) {
  const n = name.replace(/^waxed_/, '');
  let m;
  if ((m = n.match(/^(\w+?)_stairs$/))) return { shape: 'stairs', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_double_slab$/))) return { shape: 'cube', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_slab\d?$/))) return { shape: 'slab', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_wall$/))) return { shape: 'wall', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_fence_gate$/))) return { shape: 'fence_gate', mat: materialFor(m[1]) };
  if (n === 'fence_gate') return { shape: 'fence_gate', mat: 'oak_planks' };
  if ((m = n.match(/^(\w+?)_fence$/))) return { shape: 'fence', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_carpet$/))) return { shape: 'carpet', mat: m[1] === 'moss' ? 'moss_block' : m[1] === 'pale_moss' ? 'pale_moss_block' : `${m[1]}_wool` };
  if ((m = n.match(/^(\w+?)_pressure_plate$/))) return { shape: 'plate', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_button$/))) return { shape: 'button', mat: materialFor(m[1]) };
  if ((m = n.match(/^(\w+?)_trapdoor$/))) return { shape: 'trapdoor', mat: materialFor(m[1]), trapdoor: true };
  if (/^(chest|trapped_chest|ender_chest|copper_chest|\w+_copper_chest)$/.test(n)) return { shape: 'chest', mat: /copper/.test(n) ? 'copper_chest' : n };
  if (/^(cactus)$/.test(n)) return { shape: 'inset', mat: n };
  if (/^(dirt_path|grass_path|farmland)$/.test(n)) return { shape: 'path', mat: n };
  if (/^(enchanting_table)$/.test(n)) return { shape: 'table', mat: n };
  if (/^(end_portal_frame)$/.test(n)) return { shape: 'frame', mat: n };
  if (/^(sculk_sensor|calibrated_sculk_sensor|sculk_shrieker)$/.test(n)) return { shape: 'sensor', mat: n === 'calibrated_sculk_sensor' ? 'sculk_sensor' : n };
  if (/^(daylight_detector|daylight_detector_inverted)$/.test(n)) return { shape: 'detector', mat: 'daylight_detector' };
  if (/^stonecutter$/.test(n)) return { shape: 'cutter', mat: n };
  if (/^(anvil|chipped_anvil|damaged_anvil)$/.test(n)) return { shape: 'anvil', mat: n };
  if (n === 'dragon_egg') return { shape: 'egg', mat: n };
  if (n === 'snow_layer') return { shape: 'layer', mat: 'snow' };
  return { shape: 'cube', mat: n };
}

// Names that are clearly placed blocks even when they come from an add-on namespace.
const BLOCKISH = /stone|ore$|deepslate|cobble|granite|diorite|andesite|tuff|dirt|sand|gravel|clay|terracotta|brick|_block$|planks|_log$|_wood$|stem$|hyphae|leaves|wool|concrete|glass|slab|stairs|wall$|fence|carpet|ice$|netherrack|obsidian|basalt|blackstone|prismarine|purpur|moss|mud|calcite|bookshelf|table$|furnace|chest|barrel|crate|shelf|cabinet|drawers|bench|chair|stool|sofa|shutter/;
export const looksLikeBlock = name => BLOCKISH.test(name);

// --- rasteriser ---------------------------------------------------------------

export const SIZE = 64;
const EDGE = 9.8 * SIZE / 16; // cube edge in output pixels
const U = EDGE * Math.SQRT1_2, V = U / 2, D = EDGE * Math.cos(Math.PI / 6);
const CX = SIZE / 2, Y0 = (SIZE - (2 * V + D)) / 2;
const LIGHT = { top: 1, south: 0.8, east: 0.62 };

// Face textures pre-multiplied by the face's light, as [r, g, b, alpha 0..1] floats.
const litCache = new Map();
function litFaces(mat, trapdoor) {
  const key = `${mat}|${trapdoor ? 't' : ''}`;
  let faces = litCache.get(key);
  if (faces) return faces;
  const t = blockTextures(mat);
  const lit = (texture, f) => {
    const out = new Float32Array(1024);
    texture.forEach((p, i) => { out[i * 4] = p[0] * f; out[i * 4 + 1] = p[1] * f; out[i * 4 + 2] = p[2] * f; out[i * 4 + 3] = p[3] / 255; });
    return out;
  };
  faces = [lit(trapdoor ? trapdoorTex(t) : t.top, LIGHT.top), lit(t.front || t.side, LIGHT.south), lit(t.east || t.side, LIGHT.east)];
  litCache.set(key, faces);
  return faces;
}

function trapdoorTex(t) {
  return overlay(t.top, (x, y) => ((x > 2 && x < 7 && y > 2 && y < 7) || (x > 8 && x < 13 && y > 2 && y < 7) ? tone(t.top[y * 16 + x], 0.45) : null));
}

const SS = 3; // supersampling per axis
const texel = v => (v >= 16 ? 15 : v | 0);

/** RGBA pixels (SIZE×SIZE) of a block item. */
export function blockPixels(name) {
  const { shape, mat, trapdoor } = blockModel(name);
  const [top, south, east] = litFaces(mat, trapdoor);
  const boxes = SHAPES[shape] || FULL;
  const out = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        const y = py + (sy + 0.5) / SS;
        for (let sx = 0; sx < SS; sx++) {
          const dx = (px + (sx + 0.5) / SS - CX) * 16 / U; // = X - Z
          // composite every box's visible face under the sample, back to front (premultiplied)
          let pr = 0, pg = 0, pb = 0, pa = 0;
          for (const [x0, y0, z0, x1, y1, z1] of boxes) {
            let tx = null, i = 0;
            const sum = (y - Y0 - (16 - y1) * D / 16) * 16 / V; // = X + Z on the top face
            const X = (sum + dx) / 2, Z = (sum - dx) / 2;
            if (X >= x0 && X < x1 && Z >= z0 && Z < z1) { tx = top; i = texel(Z) * 16 + texel(X); } else {
              const Xs = z1 + dx, Ys = 16 - (y - Y0 - (Xs + z1) * V / 16) * 16 / D;
              if (Xs >= x0 && Xs < x1 && Ys >= y0 && Ys < y1) { tx = south; i = texel(16 - Ys) * 16 + texel(Xs); } else {
                const Ze = x1 - dx, Ye = 16 - (y - Y0 - (x1 + Ze) * V / 16) * 16 / D;
                if (Ze >= z0 && Ze < z1 && Ye >= y0 && Ye < y1) { tx = east; i = texel(16 - Ye) * 16 + texel(16 - Ze); }
              }
            }
            if (!tx) continue;
            const al = tx[i * 4 + 3];
            if (!al) continue;
            pr = tx[i * 4] * al + pr * (1 - al); pg = tx[i * 4 + 1] * al + pg * (1 - al); pb = tx[i * 4 + 2] * al + pb * (1 - al);
            pa = al + pa * (1 - al);
          }
          r += pr; g += pg; b += pb; a += pa;
        }
      }
      if (!a) continue;
      const o = (py * SIZE + px) * 4;
      out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = a / (SS * SS) * 255;
    }
  }
  return out;
}
