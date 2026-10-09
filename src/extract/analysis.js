// Cross-cutting analyses: one terrain pass per world (player-made block density per chunk, ore
// distribution by height, pending ticks) combined with block entities and entities into player
// bases, lag hotspots and farms; plus storage organisation, gear wear, wealth and portal links.
// Everything here is a heuristic: Bedrock does not record who placed a block or built a base.
import { decodeSubChunk, blockKey } from '../format/subchunk.js';
import { readNbtAll } from '../format/nbt.js';
import { DIMENSIONS, PLAYER_MADE_HINTS } from '../constants.js';
import { flattenItems } from './items.js';
import { itemSources } from './search.js';

const dimName = d => DIMENSIONS[d] ?? `dim${d}`;
const chunkId = (dim, x, z) => `${dim}:${x}:${z}`;

// ---------- terrain pass ----------

const ORES = [
  ['coal', /^minecraft:(deepslate_)?coal_ore$/],
  ['copper', /^minecraft:(deepslate_)?copper_ore$/],
  ['iron', /^minecraft:(deepslate_)?iron_ore$/],
  ['gold', /^minecraft:(deepslate_)?gold_ore$/],
  ['redstone', /^minecraft:(lit_)?(deepslate_)?redstone_ore$/],
  ['lapis', /^minecraft:(deepslate_)?lapis_ore$/],
  ['diamond', /^minecraft:(deepslate_)?diamond_ore$/],
  ['emerald', /^minecraft:(deepslate_)?emerald_ore$/],
  ['quartz', /^minecraft:quartz_ore$/],
  ['nether_gold', /^minecraft:nether_gold_ore$/],
  ['ancient_debris', /^minecraft:ancient_debris$/],
];
const oreOf = name => ORES.find(([, re]) => re.test(name))?.[0];
// Planks of rarer woods are in the census hints, but mansions and villages are made of them.
const isPlayerMade = name => !/_planks$/.test(name) && PLAYER_MADE_HINTS.some(re => re.test(name));

/**
 * One pass over every sub-chunk: player-made block count per chunk column, ores per Y level per
 * dimension, and pending ticks per chunk. Results are cached on the World.
 */
function terrainScan(world) {
  if (world._terrainScan) return world._terrainScan;
  const t0 = Date.now();
  const chunks = new Map();                 // chunkId -> { dim, x, z, built, blocks, ticks }
  const ores = {};                          // dimName -> { oreKey -> { y -> count } }
  const kindCache = new Map();              // block name -> null | 'built' | ore key
  const kind = n => {
    let v = kindCache.get(n);
    if (v === undefined) kindCache.set(n, v = isPlayerMade(n) ? 'built' : oreOf(n) || null);
    return v;
  };
  const chunk = ck => {
    const id = chunkId(ck.dim, ck.x, ck.z);
    let c = chunks.get(id);
    if (!c) chunks.set(id, c = { dim: dimName(ck.dim), x: ck.x, z: ck.z, built: 0, blocks: {}, ticks: 0 });
    return c;
  };
  let subchunks = 0;
  const counts = new Uint32Array(4096);
  for (const [ck, v] of world.chunkRecords(47)) {
    let sc;
    try { sc = decodeSubChunk(v, ck.subY); } catch { continue; }
    if (sc.unsupported || !sc.layers.length) continue;
    subchunks++;
    const { palette, indices } = sc.layers[0];
    const names = palette.map(e => blockKey(e));
    const kinds = names.map(kind);
    if (!kinds.some(Boolean)) continue;
    const baseY = sc.y * 16;
    const d = ores[dimName(ck.dim)] ||= {};
    counts.fill(0, 0, palette.length);
    for (let i = 0; i < 4096; i++) {
      const pi = indices ? indices[i] : 0;
      const k = kinds[pi];
      if (!k) continue;
      counts[pi]++;
      if (k === 'built') continue;
      const o = d[k] ||= {};
      const y = baseY + (i & 15);
      o[y] = (o[y] || 0) + 1;
    }
    kinds.forEach((k, pi) => {
      if (k !== 'built' || !counts[pi]) return;
      const c = chunk(ck);
      c.built += counts[pi];
      c.blocks[names[pi]] = (c.blocks[names[pi]] || 0) + counts[pi];
    });
  }
  for (const [ck, v] of world.chunkRecords(51)) {
    try {
      const n = readNbtAll(v).reduce((s, t) => s + (t.tickList?.length || 0), 0);
      if (n) chunk(ck).ticks += n;
    } catch { /* skip */ }
  }
  return (world._terrainScan = { chunks, ores, subchunks, elapsedMs: Date.now() - t0 });
}

/** Ore counts by Y per dimension: { dim: { ore: { total, peakY, minY, maxY, byY: {y: n} } } }. */
function oreDistribution(world) {
  const { ores } = terrainScan(world);
  const out = {};
  for (const [dim, byOre] of Object.entries(ores)) {
    out[dim] = {};
    for (const [key] of ORES) {
      const byY = byOre[key];
      if (!byY) continue;
      const ys = Object.keys(byY).map(Number);
      let total = 0, peakY = ys[0];
      for (const y of ys) { total += byY[y]; if (byY[y] > byY[peakY]) peakY = y; }
      out[dim][key] = { total, peakY, minY: Math.min(...ys), maxY: Math.max(...ys), byY };
    }
  }
  return out;
}

// ---------- per-chunk activity ----------

// Block entities the world generates by itself (structures, villages, nature): no evidence of a base.
const NATURAL_BE = new Set(['MobSpawner', 'TrialSpawner', 'Vault', 'BrushableBlock', 'SculkSensor', 'SculkCatalyst', 'SculkShrieker',
  'CalibratedSculkSensor', 'EndPortal', 'EndGateway', 'CreakingHeart', 'Bell', 'Beehive', 'BeeNest', 'StructureBlock', 'Jigsaw',
  'Skull', 'DecoratedPot', 'Lectern', 'Cauldron', 'FlowerPot', 'Campfire', 'EnchantTable', 'Banner', 'SporeBlossom', 'PotentSulfurBlock']);
const BE_WEIGHT = {
  Sign: 12, HangingSign: 12, Beacon: 200, Conduit: 100, Lodestone: 60, Jukebox: 20, BrewingStand: 15, Bed: 6,
  Hopper: 4, Comparator: 4, PistonArm: 3, DaylightDetector: 4, Crafter: 6, Dispenser: 3, Dropper: 3, ItemFrame: 8, GlowItemFrame: 8,
  Furnace: 6, BlastFurnace: 8, Smoker: 8, Chest: 6, Barrel: 6, ShulkerBox: 25, EnderChest: 30, ChiseledBookshelf: 10, Shelf: 8,
};
// Generated structures whose blocks look player-made (trial chambers, ancient cities, trail ruins).
const STRUCTURE_BE = new Set(['Vault', 'TrialSpawner', 'SculkShrieker', 'SculkCatalyst', 'BrushableBlock']);
const STORAGE_BE = new Set(['Chest', 'Barrel', 'ShulkerBox', 'Hopper', 'Dispenser', 'Dropper', 'Furnace', 'BlastFurnace', 'Smoker',
  'BrewingStand', 'Crafter', 'ChiseledBookshelf', 'DecoratedPot', 'ItemFrame', 'GlowItemFrame', 'Jukebox', 'Lectern', 'Shelf']);
const TICKING_BE = new Set(['Hopper', 'Furnace', 'BlastFurnace', 'Smoker', 'BrewingStand', 'Beacon', 'Conduit', 'MobSpawner',
  'PistonArm', 'Comparator', 'DaylightDetector', 'Crafter', 'Campfire', 'SculkSensor', 'CalibratedSculkSensor']);
// Entity types that are never mobs for farm detection.
const NOT_MOB = /^minecraft:(item|xp_orb|arrow|falling_block|painting|leash_knot|armor_stand|.*minecart.*|.*boat.*|.*_raft|fireworks_rocket|ender_crystal|tripod_camera|shulker_bullet|thrown_trident|.*potion|snowball|egg|ender_pearl|fishing_hook|lightning_bolt|area_effect_cloud|tnt)$/;
const PROJECTILE = /arrow|trident|snowball|egg|ender_pearl|potion|fireball|wind_charge|fishing_hook|fireworks|shulker_bullet|llama_spit|xp_bottle|thrown|item$|xp_orb|breeze_wind/;
const isPet = e => e.tamed || (e.ownerId && !PROJECTILE.test(e.type));
const toChunk = p => [Math.floor(p[0] / 16), Math.floor(p[2] / 16)];

/** Per-chunk activity table joining the terrain pass with block entities and entities. */
function chunkActivity(world, blockEntities, entities) {
  const { chunks } = terrainScan(world);
  const dimId = Object.fromEntries(Object.entries(DIMENSIONS).map(([k, v]) => [v, +k]));
  const rows = new Map();
  for (const [id, c] of chunks) rows.set(id, { ...c, strong: 0, weak: c.built, be: {}, entities: 0, items: 0, xpOrbs: 0, mobs: {}, villagers: 0, pets: 0, named: 0 });
  const row = (dim, p) => {
    if (!p || dim === 'unknown') return null;
    const [x, z] = toChunk(p);
    const id = chunkId(dimId[dim] ?? dim, x, z);
    let r = rows.get(id);
    if (!r) rows.set(id, r = { dim, x, z, built: 0, blocks: {}, ticks: 0, strong: 0, weak: 0, be: {}, entities: 0, items: 0, xpOrbs: 0, mobs: {}, villagers: 0, pets: 0, named: 0 });
    return r;
  };
  for (const b of blockEntities) {
    const r = row(b.dimension, b.position);
    if (!r) continue;
    r.be[b.id] = (r.be[b.id] || 0) + 1;
    if (NATURAL_BE.has(b.id) || b.lootTable) continue;
    // strong evidence survives inside generated structures; furniture-like blocks do not
    if (b.customName) r.strong += 30;
    else if (b.items?.length && STORAGE_BE.has(b.id)) r.strong += BE_WEIGHT[b.id] ?? 6;
    else if (/Sign$|Beacon|Conduit|Lodestone|EnderChest|ShulkerBox|Jukebox/.test(b.id)) r.strong += BE_WEIGHT[b.id];
    else r.weak += BE_WEIGHT[b.id] ?? 3;
  }
  for (const e of entities) {
    const r = row(e.dimension, e.position);
    if (!r) continue;
    r.entities++;
    if (e.type === 'minecraft:item') r.items++;
    else if (e.type === 'minecraft:xp_orb') r.xpOrbs++;
    else if (!NOT_MOB.test(e.type)) r.mobs[e.type] = (r.mobs[e.type] || 0) + 1;
    if (/villager/.test(e.type)) r.villagers++;
    if (isPet(e)) { r.pets++; r.strong += 20; } else if (e.customName) { r.named++; r.strong += 10; }
    if (e.type === 'minecraft:armor_stand') r.strong += 10;
  }
  // chunks near a generated structure only count their strong evidence
  const dimKey = r => `${r.dim}:${r.x}:${r.z}`;
  const nearStructure = new Set();
  for (const r of rows.values()) {
    if (!Object.keys(r.be).some(id => STRUCTURE_BE.has(id))) continue;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) nearStructure.add(`${r.dim}:${r.x + dx}:${r.z + dz}`);
  }
  for (const r of rows.values()) {
    r.structure = nearStructure.has(dimKey(r));
    r.score = r.strong + (r.structure ? 0 : r.weak);
    const ticking = Object.entries(r.be).reduce((s, [id, n]) => s + (TICKING_BE.has(id) ? n : 0), 0);
    r.lag = Math.round(r.entities + r.items * 1.5 + (r.be.Hopper || 0) * 2 + ticking + r.ticks * 0.05);
  }
  return rows;
}

// ---------- bases ----------

const BASE_CHUNK_MIN = 48;      // chunk score that counts as "built"
const BASE_MIN = 160;           // total score for a cluster to be reported as a base
const LINK = 2;                 // chunks within this Chebyshev distance join the same base

const stripCodes = s => (s || '').replace(/§./g, '');

/** Clusters built-up chunks into bases with what each one holds. */
function findBases({ rows, blockEntities, entities, players, villages = [], value }) {
  const built = [...rows.values()].filter(r => r.score >= BASE_CHUNK_MIN);
  const byKey = new Map(built.map(r => [`${r.dim}:${r.x}:${r.z}`, r]));
  const seen = new Set();
  const clusters = [];
  for (const start of built) {
    const k0 = `${start.dim}:${start.x}:${start.z}`;
    if (seen.has(k0)) continue;
    seen.add(k0);
    const members = [], queue = [start];
    while (queue.length) {
      const r = queue.pop();
      members.push(r);
      for (let dx = -LINK; dx <= LINK; dx++) {
        for (let dz = -LINK; dz <= LINK; dz++) {
          const k = `${r.dim}:${r.x + dx}:${r.z + dz}`;
          if (seen.has(k) || !byKey.has(k)) continue;
          seen.add(k);
          queue.push(byKey.get(k));
        }
      }
    }
    const score = members.reduce((s, r) => s + r.score, 0);
    if (score >= BASE_MIN) clusters.push({ dim: start.dim, members, score });
  }
  clusters.sort((a, b) => b.score - a.score);

  const inBase = (base, dim, p) => {
    if (!p || dim !== base.dimension) return false;
    const [cx, cz] = toChunk(p);
    return base._keys.has(`${cx}:${cz}`);
  };
  const ownerName = {};
  for (const p of players) if (p.uniqueId) ownerName[p.uniqueId] = p.key;

  return clusters.map((c, i) => {
    const xs = c.members.map(r => r.x), zs = c.members.map(r => r.z);
    let wx = 0, wz = 0;
    for (const r of c.members) { wx += (r.x * 16 + 8) * r.score; wz += (r.z * 16 + 8) * r.score; }
    const base = {
      id: i + 1,
      dimension: c.dim,
      score: Math.round(c.score),
      chunks: c.members.length,
      center: [Math.round(wx / c.score), Math.round(wz / c.score)],
      bounds: { x: [Math.min(...xs) * 16, Math.max(...xs) * 16 + 15], z: [Math.min(...zs) * 16, Math.max(...zs) * 16 + 15] },
      chunkList: c.members.map(r => [r.x, r.z]),
      builtBlocks: c.members.reduce((s, r) => s + r.built, 0),
      builtTop: Object.entries(c.members.reduce((acc, r) => { for (const [k, n] of Object.entries(r.blocks || {})) acc[k] = (acc[k] || 0) + n; return acc; }, {}))
        .sort((a, b) => b[1] - a[1]).slice(0, 12),
      _keys: new Set(c.members.map(r => `${r.x}:${r.z}`)),
    };
    const bes = blockEntities.filter(b => inBase(base, b.dimension, b.position));
    const ents = entities.filter(e => inBase(base, e.dimension, e.position));
    const storage = bes.filter(b => STORAGE_BE.has(b.id) && !b.lootTable);
    const items = {};
    let stored = 0;
    for (const b of storage) {
      for (const it of flattenItems([...(b.items || []), ...[b.item, b.record, b.book].filter(Boolean)])) {
        items[it.item] = (items[it.item] || 0) + it.count;
        stored += it.count;
      }
    }
    const signs = bes.filter(b => b.text && (b.text.front || b.text.back))
      .map(b => ({ text: stripCodes(b.text.front || b.text.back).trim(), position: b.position }))
      .filter(s => /[\p{L}\d]/u.test(s.text));
    const named = storage.filter(b => b.customName).map(b => stripCodes(b.customName));
    const dist = p => Math.hypot(p[0] - base.center[0], p[2] - base.center[1]);
    const sign = [...signs].sort((a, b) => dist(a.position) - dist(b.position))[0];
    const be = {};
    for (const b of bes) be[b.id] = (be[b.id] || 0) + 1;
    const mobs = {};
    for (const e of ents) if (!NOT_MOB.test(e.type)) mobs[e.type] = (mobs[e.type] || 0) + 1;
    const spawns = players.filter(p => p.spawnPoint && p.spawnPoint.dimension === base.dimension
      && base._keys.has(`${Math.floor(p.spawnPoint.x / 16)}:${Math.floor(p.spawnPoint.z / 16)}`)).map(p => p.key);
    const here = players.filter(p => inBase(base, p.dimension, p.position)).map(p => p.key);
    const village = villages.find(v => v.bounds && (v.dimension || '').toLowerCase() === base.dimension
      && v.bounds.max[0] >= base.bounds.x[0] && v.bounds.min[0] <= base.bounds.x[1]
      && v.bounds.max[2] >= base.bounds.z[0] && v.bounds.min[2] <= base.bounds.z[1]);
    delete base._keys;
    return {
      ...base,
      name: sign?.text.split('\n').find(l => l.trim())?.trim() || named[0] || null,
      signs: signs.slice(0, 40),
      blockEntities: Object.fromEntries(Object.entries(be).sort((a, b) => b[1] - a[1])),
      containers: storage.length,
      storedItems: stored,
      items: Object.fromEntries(Object.entries(items).sort((a, b) => b[1] - a[1])),
      value: value ? Math.round(itemsValue(items)) : undefined,
      entities: ents.length,
      mobs: Object.fromEntries(Object.entries(mobs).sort((a, b) => b[1] - a[1])),
      villagers: ents.filter(e => /villager/.test(e.type)).length,
      pets: ents.filter(isPet).map(e => ({ type: e.type, name: e.customName, owner: ownerName[e.ownerId] || null })),
      beds: be.Bed || 0,
      spawnOf: spawns,
      playersHere: here,
      village: village ? { id: village.id, dwellers: village.dwellers } : null,
      lag: c.members.reduce((s, r) => s + r.lag, 0),
    };
  });
}

// ---------- lag and farms ----------

/** Heaviest chunks and probable farms / trading halls. */
function lagReport(rows) {
  const all = [...rows.values()];
  const totals = {};
  for (const r of all) {
    const t = totals[r.dim] ||= { chunks: 0, entities: 0, items: 0, xpOrbs: 0, hoppers: 0, ticking: 0, pendingTicks: 0 };
    t.chunks++;
    t.entities += r.entities; t.items += r.items; t.xpOrbs += r.xpOrbs; t.hoppers += r.be.Hopper || 0;
    t.ticking += Object.entries(r.be).reduce((s, [id, n]) => s + (TICKING_BE.has(id) ? n : 0), 0);
    t.pendingTicks += r.ticks;
  }
  const pick = r => ({
    dimension: r.dim, x: r.x, z: r.z, center: [r.x * 16 + 8, r.z * 16 + 8], lag: r.lag, entities: r.entities, items: r.items, xpOrbs: r.xpOrbs,
    hoppers: r.be.Hopper || 0, ticking: Object.entries(r.be).reduce((s, [id, n]) => s + (TICKING_BE.has(id) ? n : 0), 0),
    pendingTicks: r.ticks, villagers: r.villagers,
    topMobs: Object.entries(r.mobs).sort((a, b) => b[1] - a[1]).slice(0, 3),
  });
  // top 100 per dimension, so a busy Nether does not hide the Overworld
  const perDim = {};
  const heavy = all.filter(r => r.lag > 0).sort((a, b) => b.lag - a.lag)
    .filter(r => (perDim[r.dim] = (perDim[r.dim] || 0) + 1) <= 100).map(pick);

  // farms: one mob type packed into a 3×3 chunk window
  const farms = [];
  const used = new Set();
  const byKey = new Map(all.map(r => [`${r.dim}:${r.x}:${r.z}`, r]));
  const windowCount = (r, type) => {
    let n = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) n += byKey.get(`${r.dim}:${r.x + dx}:${r.z + dz}`)?.mobs[type] || 0;
    return n;
  };
  const candidates = [];
  for (const r of all) for (const [type, n] of Object.entries(r.mobs)) if (n >= 4) candidates.push([r, type, n]);
  candidates.sort((a, b) => b[2] - a[2]);
  for (const [r, type] of candidates) {
    const k = `${r.dim}:${r.x}:${r.z}:${type}`;
    if (used.has(k)) continue;
    const n = windowCount(r, type);
    const villager = /villager/.test(type);
    if (n < (villager ? 6 : 12)) continue;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) used.add(`${r.dim}:${r.x + dx}:${r.z + dz}:${type}`);
    farms.push({
      kind: villager ? 'villagers' : /iron_golem/.test(type) ? 'iron' : 'mobs',
      type, count: n, dimension: r.dim, center: [r.x * 16 + 8, r.z * 16 + 8], chunk: [r.x, r.z],
    });
  }
  const groundItems = all.filter(r => r.items >= 30).sort((a, b) => b.items - a.items).slice(0, 30).map(pick);
  return { totals, heavy, farms: farms.slice(0, 60), groundItems };
}

/** Compact per-chunk values for the map heat layers: { dim: [[x, z, built, lag], …] }. */
function chunkHeat(rows) {
  const out = {};
  for (const r of rows.values()) {
    if (!r.score && !r.lag) continue;
    (out[r.dim] ||= []).push([r.x, r.z, Math.round(r.score), r.lag]);
  }
  return out;
}

// ---------- items: stack sizes, durability, value ----------

const UNSTACKABLE = /(_sword|_pickaxe|_axe|_shovel|_hoe|_helmet|_chestplate|_leggings|_boots|_horse_armor|shulker_box|_bed|potion|music_disc_|_boat|_raft|minecart|^minecraft:(bow|crossbow|trident|shield|elytra|saddle|totem_of_undying|fishing_rod|shears|flint_and_steel|carrot_on_a_stick|warped_fungus_on_a_stick|mace|brush|enchanted_book|writable_book|written_book|cake|milk_bucket|water_bucket|lava_bucket|powder_snow_bucket|.*_bucket|spyglass|goat_horn|wolf_armor|bundle|.*_bundle|mushroom_stew|rabbit_stew|beetroot_soup|suspicious_stew|filled_map|turtle_helmet|knowledge_book|debug_stick))$/;
const STACK16 = /^minecraft:(ender_pearl|egg|blue_egg|brown_egg|snowball|bucket|honey_bottle|armor_stand|.*_sign|.*_hanging_sign|.*banner|wind_charge)$/;
const stackSize = id => (UNSTACKABLE.test(id) ? 1 : STACK16.test(id) ? 16 : 64);

const TOOL = { wooden: 59, stone: 131, iron: 250, golden: 32, diamond: 1561, netherite: 2031 };
const ARMOR = {
  leather: [55, 80, 75, 65], chainmail: [165, 240, 225, 195], iron: [165, 240, 225, 195],
  golden: [77, 112, 105, 91], diamond: [363, 528, 495, 429], netherite: [407, 592, 555, 481], copper: [121, 176, 165, 143],
};
const OTHER_DURABILITY = {
  turtle_helmet: 275, elytra: 432, bow: 384, crossbow: 465, trident: 250, shield: 336, fishing_rod: 384, shears: 238,
  flint_and_steel: 64, carrot_on_a_stick: 25, warped_fungus_on_a_stick: 100, mace: 500, brush: 64, wolf_armor: 64,
};
/** Max durability of a tool / armour piece, or undefined. */
function maxDurability(id) {
  const n = id.replace(/^minecraft:/, '');
  if (OTHER_DURABILITY[n]) return OTHER_DURABILITY[n];
  let m = n.match(/^(wooden|stone|iron|golden|diamond|netherite|copper)_(sword|pickaxe|axe|shovel|hoe|spear)$/);
  if (m) return m[1] === 'copper' ? 190 : TOOL[m[1]];
  m = n.match(/^(leather|chainmail|iron|golden|diamond|netherite|copper)_(helmet|chestplate|leggings|boots)$/);
  if (m) return ARMOR[m[1]][['helmet', 'chestplate', 'leggings', 'boots'].indexOf(m[2])];
  return undefined;
}

// Rough value in diamonds, to compare players and bases. Not an in-game price.
const VALUE = {
  diamond: 1, diamond_block: 9, netherite_ingot: 5, netherite_block: 45, netherite_scrap: 1.1, ancient_debris: 1.1,
  emerald: 0.25, emerald_block: 2.25, gold_ingot: 0.08, gold_block: 0.72, gold_nugget: 0.009, raw_gold: 0.08, raw_gold_block: 0.72,
  iron_ingot: 0.02, iron_block: 0.18, raw_iron: 0.02, raw_iron_block: 0.18, lapis_lazuli: 0.01, lapis_block: 0.09,
  totem_of_undying: 3, elytra: 25, nether_star: 20, beacon: 22, enchanted_golden_apple: 15, golden_apple: 0.8,
  shulker_shell: 1, shulker_box: 2, heavy_core: 15, mace: 16, trident: 6, heart_of_the_sea: 6, conduit: 8, dragon_egg: 50,
  netherite_upgrade_smithing_template: 4, echo_shard: 0.5, recovery_compass: 4, wither_skeleton_skull: 3, dragon_breath: 0.3,
  enchanted_book: 0.5, experience_bottle: 0.03, ender_pearl: 0.05, blaze_rod: 0.05, breeze_rod: 0.08, trial_key: 0.3, ominous_trial_key: 1,
  music_disc_pigstep: 3, music_disc_otherside: 3, music_disc_5: 3, music_disc_relic: 3, sniffer_egg: 2,
};
const GEAR_MATERIAL = { diamond: 1, netherite: 1 };
const GEAR_PIECES = { sword: 2, pickaxe: 3, axe: 3, shovel: 1, hoe: 2, helmet: 5, chestplate: 8, leggings: 7, boots: 4 };

/** Value of one stack, in diamonds. */
function itemValue(it) {
  const n = it.item.replace(/^minecraft:/, '');
  let v = VALUE[n];
  if (v === undefined) {
    const m = n.match(/^(diamond|netherite)_(sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots)$/);
    if (m && GEAR_MATERIAL[m[1]]) v = GEAR_PIECES[m[2]] + (m[1] === 'netherite' ? 5 : 0);
    else if (/shulker_box$/.test(n)) v = 2;
    else if (/^music_disc_/.test(n)) v = 0.5;
    else if (/_smithing_template$/.test(n)) v = 1;
    else v = 0;
  }
  const levels = (it.enchantments || []).reduce((s, e) => s + (e.level || 0), 0);
  return (v + levels * 0.3) * it.count;
}

/** Value of an {itemId: count} map (enchantments unknown, so only base values). */
function itemsValue(totals) {
  let v = 0;
  for (const [item, count] of Object.entries(totals)) v += itemValue({ item, count });
  return v;
}

// ---------- storage organisation ----------

const CAPACITY = { Chest: 27, Barrel: 27, ShulkerBox: 27, Hopper: 5, Dispenser: 9, Dropper: 9, Furnace: 3, BlastFurnace: 3, Smoker: 3, BrewingStand: 5, Crafter: 9, ChiseledBookshelf: 6, Shelf: 3 };

/** Fullness of each container, items spread over many containers and slots that merging stacks would free. */
function storageReport(blockEntities, bases = []) {
  const baseOf = (dim, p) => bases.find(b => b.dimension === dim && b.chunkList.some(([x, z]) => x === Math.floor(p[0] / 16) && z === Math.floor(p[2] / 16)));
  const containers = [];
  const spread = {};
  let used = 0, capacity = 0;
  for (const b of blockEntities) {
    const cap = CAPACITY[b.id];
    if (!cap || b.lootTable) continue;
    const items = b.items || [];
    const base = baseOf(b.dimension, b.position);
    containers.push({ id: b.id, customName: b.customName, dimension: b.dimension, position: b.position, slots: items.length, capacity: cap, base: base?.id ?? null, total: items.reduce((s, it) => s + it.count, 0) });
    used += items.length; capacity += cap;
    if (b.id === 'Hopper' || b.id === 'Furnace' || b.id === 'BlastFurnace' || b.id === 'Smoker' || b.id === 'BrewingStand') continue; // working blocks, not storage
    for (const it of items) {
      const s = spread[it.item] ||= { item: it.item, total: 0, slots: 0, partial: 0, containers: new Set() };
      s.total += it.count; s.slots++;
      if (it.count < stackSize(it.item)) s.partial++;
      s.containers.add(`${b.dimension}:${b.position}`);
    }
  }
  const items = Object.values(spread).map(s => {
    const minSlots = Math.ceil(s.total / stackSize(s.item));
    return { item: s.item, total: s.total, slots: s.slots, partialStacks: s.partial, containers: s.containers.size, minSlots, freeable: s.slots - minSlots };
  });
  const scattered = items.filter(i => i.containers >= 3).sort((a, b) => b.containers - a.containers || b.total - a.total).slice(0, 60);
  const mergeable = items.filter(i => i.freeable > 0).sort((a, b) => b.freeable - a.freeable).slice(0, 60);
  const real = containers.filter(c => !['Hopper', 'Furnace', 'BlastFurnace', 'Smoker', 'BrewingStand'].includes(c.id));
  return {
    containers: real.length,
    slotsUsed: used, slotsTotal: capacity,
    full: real.filter(c => c.slots >= c.capacity).length,
    nearlyFull: real.filter(c => c.slots >= c.capacity * 0.9).sort((a, b) => b.slots / b.capacity - a.slots / a.capacity).slice(0, 80),
    empty: real.filter(c => !c.slots).length,
    freeableSlots: items.reduce((s, i) => s + Math.max(0, i.freeable), 0),
    scattered, mergeable,
    distinctItems: items.length,
  };
}

// ---------- gear ----------

const KEY_ENCHANTS = ['mending', 'unbreaking'];

/** Worn-out tools and armour, best gear missing Mending/Unbreaking, and enchanted books available. */
function gearReport(players, blockEntities, entities) {
  const worn = [], missing = [], books = {};
  for (const src of itemSources(players, blockEntities, entities)) {
    if (/^minecraft:/.test(src.where) && !/player/.test(src.where)) continue; // mob equipment / dropped items
    for (const it of flattenItems(src.items)) {
      const where = src.where + (it.path.length ? ` > ${it.path.join(' > ')}` : '');
      const max = maxDurability(it.item);
      if (max && !it.unbreakable) {
        const left = max - (it.durabilityUsed || 0);
        if (left / max <= 0.25) worn.push({ item: it.item, customName: it.customName, enchantments: it.enchantments, left, max, percent: Math.round((100 * left) / max), where, dimension: src.dimension, position: src.position });
        if (/^minecraft:(diamond|netherite)_|^minecraft:(elytra|trident|mace|bow|crossbow)$/.test(it.item)) {
          const has = new Set((it.enchantments || []).map(e => e.name));
          const lacks = KEY_ENCHANTS.filter(e => !has.has(e));
          if (lacks.length) missing.push({ item: it.item, customName: it.customName, lacks, enchantments: it.enchantments, where, dimension: src.dimension, position: src.position });
        }
      }
      if (it.item === 'minecraft:enchanted_book') {
        for (const e of it.enchantments || []) {
          const k = `${e.name}|${e.level}`;
          const b = books[k] ||= { name: e.name, level: e.level, count: 0, where: [] };
          b.count += it.count;
          if (b.where.length < 5) b.where.push({ where, dimension: src.dimension, position: src.position });
        }
      }
    }
  }
  worn.sort((a, b) => a.percent - b.percent);
  return { worn: worn.slice(0, 150), missing: missing.slice(0, 150), books: Object.values(books).sort((a, b) => a.name.localeCompare(b.name) || b.level - a.level) };
}

// ---------- wealth ----------

/** Estimated value (in diamonds) per player, per base and for the whole world. */
function wealthReport(players, blockEntities, entities, bases) {
  const ranked = [];
  for (const p of players) {
    const carried = [...p.inventory, ...p.armor.filter(Boolean), ...p.offhand];
    let inv = 0, ender = 0;
    for (const it of flattenItems(carried)) inv += itemValue(it);
    for (const it of flattenItems(p.enderChest)) ender += itemValue(it);
    ranked.push({ key: p.key, role: p.role, carried: Math.round(inv), enderChest: Math.round(ender), total: Math.round(inv + ender) });
  }
  const top = [];
  let world = 0;
  for (const src of itemSources(players, blockEntities, entities)) {
    for (const it of flattenItems(src.items)) {
      const v = itemValue(it);
      world += v;
      if (v >= 3) top.push({ item: it.item, count: it.count, customName: it.customName, enchantments: it.enchantments, value: Math.round(v * 10) / 10, where: src.where + (it.path.length ? ` > ${it.path.join(' > ')}` : ''), dimension: src.dimension, position: src.position });
    }
  }
  top.sort((a, b) => b.value - a.value);
  return {
    world: Math.round(world),
    players: ranked.sort((a, b) => b.total - a.total),
    bases: bases.map(b => ({ id: b.id, name: b.name, dimension: b.dimension, center: b.center, value: b.value })).sort((a, b) => b.value - a.value),
    top: top.slice(0, 100),
  };
}

// ---------- portals ----------

/**
 * Pairs Overworld and Nether portals the way the game searches for a destination: the target is
 * the coordinate scaled by 8 (÷8 into the Nether), and the closest existing portal within
 * 16 blocks (Nether) or 128 blocks (Overworld) is used. Approximate: the game also looks at Y.
 */
function portalLinks(portals) {
  const ow = portals.filter(p => p.dimension === 'overworld');
  const ne = portals.filter(p => p.dimension === 'nether');
  const nearest = (list, x, z, radius) => {
    let best = null, bd = Infinity;
    for (const p of list) {
      const d = Math.max(Math.abs(p.position[0] - x), Math.abs(p.position[2] - z));
      if (d <= radius && d < bd) { bd = d; best = p; }
    }
    return best;
  };
  const idx = p => portals.indexOf(p);
  const links = [];
  for (const p of ow) {
    const tx = p.position[0] / 8, tz = p.position[2] / 8;
    const to = nearest(ne, tx, tz, 16);
    const back = to ? nearest(ow, to.position[0] * 8, to.position[2] * 8, 128) : null;
    links.push({ from: idx(p), dimension: 'overworld', target: [Math.floor(tx), Math.floor(tz)], to: to ? idx(to) : null, back: back ? idx(back) : null, twoWay: back === p });
  }
  for (const p of ne) {
    const tx = p.position[0] * 8, tz = p.position[2] * 8;
    const to = nearest(ow, tx, tz, 128);
    const back = to ? nearest(ne, to.position[0] / 8, to.position[2] / 8, 16) : null;
    links.push({ from: idx(p), dimension: 'nether', target: [Math.floor(tx), Math.floor(tz)], to: to ? idx(to) : null, back: back ? idx(back) : null, twoWay: back === p });
  }
  return { portals: portals.map((p, i) => ({ ...p, index: i })), links };
}

export {
  terrainScan, oreDistribution, chunkActivity, findBases, lagReport, chunkHeat, storageReport, gearReport, wealthReport, portalLinks,
  itemValue, itemsValue, maxDurability, stackSize, ORES,
};
