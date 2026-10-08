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
import { chunkCoverage, blockCensus, findBlocks, biomeCensus } from '../../src/extract/terrain.js';
import { extractMisc, keyStats } from '../../src/extract/misc.js';
import { findItems, worldItemTotals } from '../../src/extract/search.js';
import { renderSurface } from '../../src/extract/surface.js';

const DIM_IDS = { overworld: 0, nether: 1, the_end: 2 };
const STORAGE = new Set(['Chest', 'Barrel', 'ShulkerBox', 'Hopper', 'Dispenser', 'Dropper', 'Furnace', 'BlastFurnace', 'Smoker', 'BrewingStand', 'Crafter', 'EnderChest', 'ChiseledBookshelf', 'DecoratedPot']);
let world = null;
let cache = {};

const memo = (key, fn) => (key in cache ? cache[key] : (cache[key] = fn()));
const level = () => memo('level', () => extractLevel(world));
const players = () => memo('players', () => extractPlayers(world));
const entities = () => memo('entities', () => extractEntities(world));
const blockEntities = () => memo('blockEntities', () => extractBlockEntities(world));
const misc = () => memo('misc', () => extractMisc(world, players()));

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
  progress('entities');
  entities();
  progress('blockEntities');
  blockEntities();
  progress('done');
  return { name: L.name, file: file?.name };
}

const methods = {
  open,
  summary: () => memo('summary', () => {
    const P = players(), M = misc();
    return {
      level: level(),
      coverage: chunkCoverage(world),
      players: P.map(p => ({ key: p.key, role: p.role, identity: p.identity, gameMode: p.gameMode, dimension: p.dimension, position: p.position, xp: p.xp, health: p.health, hasDiedBefore: p.hasDiedBefore, itemCount: Object.values(p.itemTotals).reduce((a, b) => a + b, 0) })),
      entities: summarizeEntities(entities(), P),
      blockEntities: summarizeBlockEntities(blockEntities()),
      dragonFight: M.dimensions.dragonFight,
      counts: { portals: M.portals.length, villages: M.villages.length, maps: M.maps.length, structures: M.structureTemplates.length, objectives: M.scoreboard?.objectives.length ?? 0 },
    };
  }),
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
  icon: () => world.source.read('world_icon.jpeg'),
  raw: ({ key }) => {
    const k = key.startsWith('hex:') ? Buffer.from(key.slice(4), 'hex') : Buffer.from(key, 'latin1');
    const v = world.db.get(k);
    if (v === undefined) throw new Error(`chave não encontrada: ${key}`);
    try { return { nbt: toPlain(readNbtAll(v), true) }; } catch { return { hex: v.subarray(0, 4096).toString('hex'), size: v.length }; }
  },
  surface: ({ dim }) => memo(`surface:${dim}`, () => renderSurface(world, DIM_IDS[dim])),
  mapItem: ({ id }) => {
    const m = world.nbt(`map_${id}`);
    return m?.colors ? Uint8ClampedArray.from(m.colors, b => b & 0xff) : null;
  },
};

function toRegex(q) {
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
