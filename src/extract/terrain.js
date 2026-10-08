// Terrain-wide analyses: chunk coverage, block census, block search, biome census.
import { decodeSubChunk, decodeData3D, blockKey } from '../format/subchunk.js';
import { DIMENSIONS, DIMENSION_Y, BIOMES, PLAYER_MADE_HINTS } from '../constants.js';

const dimName = d => DIMENSIONS[d] ?? `dim${d}`;
const AIR = new Set(['minecraft:air', 'minecraft:structure_void']);

/** Chunk coverage per dimension: generated chunk count, bounding box, area in blocks². */
function chunkCoverage(world) {
  const dims = {};
  for (const [ck] of world.chunkRecords([44, 118])) {
    const d = dims[dimName(ck.dim)] ||= { chunks: 0, minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    d.chunks++;
    d.minX = Math.min(d.minX, ck.x); d.maxX = Math.max(d.maxX, ck.x);
    d.minZ = Math.min(d.minZ, ck.z); d.maxZ = Math.max(d.maxZ, ck.z);
  }
  for (const d of Object.values(dims)) {
    d.areaBlocks2 = d.chunks * 256;
    d.boundsBlocks = { x: [d.minX * 16, d.maxX * 16 + 15], z: [d.minZ * 16, d.maxZ * 16 + 15] };
    delete d.minX; delete d.maxX; delete d.minZ; delete d.maxZ;
  }
  return dims;
}

function* subChunks(world, filter) {
  for (const [ck, v] of world.chunkRecords(47, filter.dim)) {
    if (filter.box && !boxHitsChunk(filter.box, ck)) continue;
    yield [ck, v];
  }
}

function boxHitsChunk(box, ck) {
  const x0 = ck.x * 16, z0 = ck.z * 16;
  return x0 + 15 >= box.x1 && x0 <= box.x2 && z0 + 15 >= box.z1 && z0 <= box.z2;
}

/**
 * Counts every block per dimension. Layer 0 = main block, layer 1+ = extra block in the same
 * position (mostly water in waterlogged blocks).
 */
function blockCensus(world, opts = {}) {
  const t0 = Date.now();
  const result = {};
  let subchunks = 0, unsupported = 0;
  for (const [ck, v] of subChunks(world, opts)) {
    let sc;
    try { sc = decodeSubChunk(v, ck.subY, { countsOnly: true }); } catch { unsupported++; continue; }
    if (sc.unsupported) { unsupported++; continue; }
    subchunks++;
    const dim = result[dimName(ck.dim)] ||= { blocks: new Map(), extraLayer: new Map() };
    sc.layers.forEach((layer, li) => {
      const target = li === 0 ? dim.blocks : dim.extraLayer;
      layer.palette.forEach((entry, i) => {
        const n = layer.counts[i];
        if (!n) return;
        const key = blockKey(entry, opts.states);
        target.set(key, (target.get(key) || 0) + n);
      });
    });
  }
  const out = { subchunksScanned: subchunks, subchunksUnsupported: unsupported, elapsedMs: 0, dimensions: {} };
  for (const [d, { blocks, extraLayer }] of Object.entries(result)) {
    const sorted = [...blocks].sort((a, b) => b[1] - a[1]);
    const solid = sorted.filter(([k]) => !AIR.has(k.split('[')[0]));
    const playerMade = solid.filter(([k]) => PLAYER_MADE_HINTS.some(re => re.test(k.split('[')[0])));
    out.dimensions[d] = {
      totalNonAir: solid.reduce((s, [, n]) => s + n, 0),
      distinctBlockTypes: solid.length,
      blocks: Object.fromEntries(sorted),
      waterloggedOrSecondLayer: Object.fromEntries([...extraLayer].filter(([k]) => !AIR.has(k)).sort((a, b) => b[1] - a[1])),
      likelyPlayerPlaced: Object.fromEntries(playerMade),
    };
  }
  out.elapsedMs = Date.now() - t0;
  return out;
}

/** Finds coordinates of blocks whose name matches `pattern` (RegExp). */
function findBlocks(world, pattern, opts = {}) {
  const limit = opts.limit ?? 1000;
  const hits = [];
  let total = 0;
  for (const [ck, v] of subChunks(world, opts)) {
    let sc;
    try { sc = decodeSubChunk(v, ck.subY); } catch { continue; }
    for (const layer of sc.layers) {
      const match = layer.palette.map(e => pattern.test(blockKey(e, true)));
      if (!match.some(Boolean)) continue;
      for (let i = 0; i < 4096; i++) {
        const pi = layer.indices ? layer.indices[i] : 0;
        if (!match[pi]) continue;
        const x = ck.x * 16 + ((i >> 8) & 15), z = ck.z * 16 + ((i >> 4) & 15), y = sc.y * 16 + (i & 15);
        if (opts.box && (x < opts.box.x1 || x > opts.box.x2 || z < opts.box.z1 || z > opts.box.z2 || y < opts.box.y1 || y > opts.box.y2)) continue;
        total++;
        if (hits.length < limit) hits.push({ dimension: dimName(ck.dim), x, y, z, block: blockKey(layer.palette[pi], true) });
      }
    }
  }
  return { total, shown: hits.length, hits };
}

/** Biome census per dimension from Data3D (Bedrock stores one biome per block, so counts are in blocks). */
function biomeCensus(world) {
  const out = {};
  for (const [ck, v] of world.chunkRecords(43)) {
    let d3;
    try { d3 = decodeData3D(v); } catch { continue; }
    const dim = out[dimName(ck.dim)] ||= {};
    const yr = DIMENSION_Y[ck.dim] || { min: 0, max: 15 };
    d3.sections.forEach((s, i) => {
      if (!s || i > yr.max - yr.min) return;
      for (const [b, n] of s.counts) {
        const name = BIOMES[b] || `biome_${b}`;
        dim[name] = (dim[name] || 0) + n;
      }
    });
  }
  for (const k of Object.keys(out)) {
    const total = Object.values(out[k]).reduce((a, b) => a + b, 0);
    out[k] = Object.fromEntries(Object.entries(out[k]).sort((a, b) => b[1] - a[1])
      .map(([n, c]) => [n, { blocks: c, percent: +(100 * c / total).toFixed(2) }]));
  }
  return out;
}

/** Full block grid of one chunk column (for exporting / inspecting a specific chunk). */
function readChunk(world, cx, cz, dim = 0) {
  const sections = [];
  for (const [ck, v] of world.chunkRecords(47, dim)) {
    if (ck.x !== cx || ck.z !== cz) continue;
    const sc = decodeSubChunk(v, ck.subY);
    sections.push({
      y: sc.y,
      layers: sc.layers.map(l => ({
        palette: l.palette.map(e => blockKey(e, true)),
        indices: l.indices ? Array.from(l.indices) : null,
      })),
    });
  }
  return sections.sort((a, b) => a.y - b.y);
}

export { chunkCoverage, blockCensus, findBlocks, biomeCensus, readChunk };
