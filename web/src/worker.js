// Web Worker: owns the World and runs every extraction off the UI thread.
import { Buffer } from 'buffer';
import { World } from '../../src/world.js';
import { ZipSource, MapSource } from '../../src/sources.js';
import { toPlain } from '../../src/serialize.js';
import { readNbtAll } from '../../src/format/nbt.js';
import { extractLevel } from '../../src/extract/level.js';
import { extractPlayers } from '../../src/extract/players.js';
import { extractEntities, summarizeEntities } from '../../src/extract/entities.js';
import { extractBlockEntities, summarizeBlockEntities } from '../../src/extract/blockentities.js';
import { chunkCoverage, blockCensus, findBlocks, biomeCensus, biomeSurface } from '../../src/extract/terrain.js';
import { extractMisc, keyStats } from '../../src/extract/misc.js';
import { findItems, worldItemTotals } from '../../src/extract/search.js';
import { totalByItem } from '../../src/extract/items.js';
import { renderSurface } from '../../src/extract/surface.js';
import {
  chunkActivity, findBases, lagReport, chunkHeat, oreDistribution, storageReport, gearReport, wealthReport, portalLinks,
} from '../../src/extract/analysis.js';
import { DIMENSIONS } from '../../src/constants.js';

const DIM_IDS = { overworld: 0, nether: 1, the_end: 2 };
const STORAGE = new Set(['Chest', 'Barrel', 'ShulkerBox', 'Hopper', 'Dispenser', 'Dropper', 'Furnace', 'BlastFurnace', 'Smoker', 'BrewingStand', 'Crafter', 'EnderChest', 'ChiseledBookshelf', 'DecoratedPot', 'Shelf']);
let world = null;
let cache = {};

const memo = (key, fn) => (key in cache ? cache[key] : (cache[key] = fn()));
const level = () => memo('level', () => extractLevel(world));
const players = () => memo('players', () => extractPlayers(world));
const entities = () => memo('entities', () => extractEntities(world));
const blockEntities = () => memo('blockEntities', () => extractBlockEntities(world));
const misc = () => memo('misc', () => extractMisc(world, players()));
const surface = dim => memo(`surface:${dim}`, () => renderSurface(world, DIM_IDS[dim]));
const activity = () => memo('activity', () => chunkActivity(world, blockEntities(), entities()));
const bases = () => memo('bases', () => findBases({ rows: activity(), blockEntities: blockEntities(), entities: entities(), players: players(), villages: misc().villages, value: true }));

function progress(step, detail) { postMessage({ type: 'progress', step, detail }); }

async function open({ file, files }) {
  world?.close?.();
  world = null; cache = {};
  let source;
  if (file) {
    progress('read', `${(file.size / 1048576).toFixed(1)} MB`);
    const buf = Buffer.from(await file.arrayBuffer());
    progress('unzip');
    source = new ZipSource(buf, file.name);
  } else {
    progress('read', `${files.length} arquivos`);
    const map = new Map();
    for (const { path, file: f } of files) map.set(path, Buffer.from(await f.arrayBuffer()));
    source = new MapSource(map);
  }
  world = new World(source);
  progress('level');
  const L = level();
  progress('db');
  const db = world.db;
  progress('players', `${db.size.toLocaleString('pt-BR')} chaves`);
  players();
  progress('done');
  return { name: L.name, file: file?.name };
}

const methods = {
  open,
  summary: () => memo('summary', () => {
    const P = players(), M = misc();
    return {
      level: level(),
      coverage: methods.coverage(),
      players: P.map(p => ({ key: p.key, role: p.role, identity: p.identity, gameMode: p.gameMode, dimension: p.dimension, position: p.position, xp: p.xp, health: p.health, hasDiedBefore: p.hasDiedBefore, itemCount: Object.values(p.itemTotals).reduce((a, b) => a + b, 0) })),
      entities: summarizeEntities(entities(), P),
      blockEntities: summarizeBlockEntities(blockEntities()),
      dragonFight: M.dimensions.dragonFight,
      counts: { portals: M.portals.length, villages: M.villages.length, maps: M.maps.length, structures: M.structureTemplates.length, objectives: M.scoreboard?.objectives.length ?? 0 },
    };
  }),
  level: () => level(),
  coverage: () => memo('coverage', () => chunkCoverage(world)),
  players: () => players(),
  entities: () => entities(),
  containers: () => blockEntities().filter(b => b.items?.length || b.item || b.record || b.book),
  // Every item-holding block, including empty ones and never-opened loot containers (map layer).
  storage: () => memo('storage', () => blockEntities()
    .filter(b => STORAGE.has(b.id) || b.items?.length || b.item || b.record || b.book)
    .map(b => ({ id: b.id, customName: b.customName, dimension: b.dimension, position: b.position, items: b.items, item: b.item, record: b.record, book: b.book, lootTable: b.lootTable, pairedWith: b.pairedWith }))),
  misc: () => misc(),
  biomes: () => memo('biomes', () => biomeCensus(world)),
  blocks: () => memo('blocks', () => blockCensus(world)),
  keys: () => memo('keys', () => keyStats(world)),
  items: () => memo('items', () => worldItemTotals(players(), blockEntities(), entities())),
  findItem: ({ q }) => findItems(toRegex(q), players(), blockEntities(), entities()),
  findBlock: ({ q, dim, limit = 500 }) => findBlocks(world, toRegex(q), { limit, dim: dim ? DIM_IDS[dim] : undefined }),
  // analyses (src/extract/analysis.js); the first one pays for the terrain pass
  bases: () => bases(),
  lag: () => memo('lag', () => lagReport(activity())),
  heat: () => memo('heat', () => chunkHeat(activity())),
  ores: () => memo('ores', () => oreDistribution(world)),
  storageReport: () => memo('storageReport', () => storageReport(blockEntities(), bases())),
  gear: () => memo('gear', () => gearReport(players(), blockEntities(), entities())),
  wealth: () => memo('wealth', () => wealthReport(players(), blockEntities(), entities(), bases())),
  portals: () => memo('portalLinks', () => portalLinks(misc().portals)),
  villagers: () => memo('villagers', () => ({
    villagers: entities().filter(e => /villager|wandering_trader/.test(e.type))
      .map(e => ({ type: e.type, uniqueId: e.uniqueId, customName: e.customName, profession: e.profession, tradeTier: e.tradeTier, dimension: e.dimension, position: e.position, trades: e.trades, baby: e.baby })),
    villages: misc().villages.map(v => ({ id: v.id, dimension: v.dimension, bounds: v.bounds, dwellers: v.dwellers, dwellerGroups: v.dwellerGroups, pointsOfInterest: v.pointsOfInterest, raid: !!v.raid })),
  })),
  // Compact picture of the world for the save comparison (each save lives in its own worker).
  snapshot: () => memo('snapshot', () => {
    const L = level();
    const chunks = {};
    for (const [ck] of world.chunkRecords([44, 118])) (chunks[DIMENSIONS[ck.dim] ?? `dim${ck.dim}`] ||= []).push(ck.x, ck.z);
    const byType = {};
    for (const e of entities()) byType[e.type] = (byType[e.type] || 0) + 1;
    const beTypes = {};
    for (const b of blockEntities()) beTypes[b.id] = (beTypes[b.id] || 0) + 1;
    return {
      name: L.name, lastPlayed: L.lastPlayed, daysPlayed: L.time.daysPlayed, playHours: L.time.approxPlayTimeHours,
      chunks,
      players: players().map(p => ({ key: p.key, role: p.role, xp: p.xp, health: p.health, dimension: p.dimension, position: p.position, itemTotals: p.itemTotals, enderChestTotals: p.enderChestTotals, hasDiedBefore: p.hasDiedBefore, lastDeath: p.lastDeath })),
      entities: byType,
      blockEntities: beTypes,
      items: methods.items(),
      containers: blockEntities().filter(b => b.items?.length || STORAGE.has(b.id)).map(b => ({ id: b.id, customName: b.customName, dimension: b.dimension, position: b.position, totals: totalByItem(b.items || []) })),
    };
  }),
  icon: () => world.source.read('world_icon.jpeg'),
  raw: ({ key }) => {
    const k = key.startsWith('hex:') ? Buffer.from(key.slice(4), 'hex') : Buffer.from(key, 'latin1');
    const v = world.db.get(k);
    if (v === undefined) throw new Error(`chave não encontrada: ${key}`);
    try { return { nbt: toPlain(readNbtAll(v), true) }; } catch { return { hex: v.subarray(0, 4096).toString('hex'), size: v.length }; }
  },
  surface: ({ dim }) => surface(dim),
  // biome of the top block of each column, same grid as the surface
  biomeMap: ({ dim }) => memo(`biomeMap:${dim}`, () => { const s = surface(dim); return s && biomeSurface(world, DIM_IDS[dim], s); }),
  mapItem: ({ id }) => {
    const m = world.nbt(`map_${id}`);
    return m?.colors ? Uint8ClampedArray.from(m.colors, b => b & 0xff) : null;
  },
};

export function toRegex(q) {
  if (!q) throw new Error('busca vazia');
  try { return new RegExp(q, 'i'); } catch { return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
}

onmessage = async ({ data: { id, method, args } }) => {
  try {
    if (!methods[method]) throw new Error(`método desconhecido: ${method}`);
    if (method !== 'open' && !world) throw new Error('nenhum mundo aberto');
    const t0 = performance.now();
    let result = await methods[method](args || {});
    const transfer = [];
    if (method === 'surface' && result) {
      const rgba = new Uint8ClampedArray(result.rgba); // copy: keep the cached original
      result = { minX: result.minX, minZ: result.minZ, width: result.width, height: result.height, chunks: result.chunks, rgba };
      transfer.push(rgba.buffer);
    } else if (method === 'biomeMap' && result) {
      const ids = new Uint16Array(result.ids);
      result = { minX: result.minX, minZ: result.minZ, width: result.width, height: result.height, names: result.names, counts: result.counts, ids };
      transfer.push(ids.buffer);
    } else if (method === 'icon' && result) {
      result = new Uint8Array(result);
      transfer.push(result.buffer);
    } else if (method === 'mapItem' && result) {
      transfer.push(result.buffer);
    } else if (method !== 'raw') {
      result = toPlain(result);
    }
    postMessage({ id, result, ms: Math.round(performance.now() - t0) }, transfer);
  } catch (e) {
    postMessage({ id, error: e.message || String(e) });
  }
};
