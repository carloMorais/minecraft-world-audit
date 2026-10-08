// SubChunkPrefix (tag 47) and Data3D (tag 43) decoders.
import { NbtReader } from './nbt.js';

/**
 * Unpacks the palette indices of one paletted storage into `out` (Uint16Array(4096)).
 * Index order is XZY: i = (x << 8) | (z << 4) | y.
 */
function unpackIndices(buf, pos, bits, out) {
  const perWord = Math.floor(32 / bits);
  const words = Math.ceil(4096 / perWord);
  const mask = (1 << bits) - 1;
  let i = 0;
  for (let w = 0; w < words; w++) {
    let word = buf.readUInt32LE(pos + w * 4);
    for (let j = 0; j < perWord && i < 4096; j++, i++) {
      out[i] = word & mask;
      word >>>= bits;
    }
  }
  return pos + words * 4;
}

const scratch = new Uint16Array(4096);

/**
 * Decodes a sub-chunk. Returns {version, y, layers:[{palette:[{name,states,version}], indices}]}.
 * `indices` is a Uint16Array(4096), or null when the palette has a single entry.
 * With opts.countsOnly the indices are not kept; each layer gets `counts` (per palette entry).
 */
function decodeSubChunk(buf, subY, opts = {}) {
  let pos = 0;
  const version = buf[pos++];
  let numLayers = 1;
  let y = subY;
  if (version === 8 || version === 9) {
    numLayers = buf[pos++];
    if (version === 9) y = buf.readInt8(pos++);
  } else if (version !== 1) {
    return { version, y, layers: [], unsupported: true };
  }
  const layers = [];
  for (let l = 0; l < numLayers; l++) {
    const header = buf[pos++];
    const bits = header >> 1;
    let indices = null;
    if (bits > 0) {
      indices = opts.countsOnly ? scratch : new Uint16Array(4096);
      pos = unpackIndices(buf, pos, bits, indices);
    }
    const paletteSize = buf.readInt32LE(pos); pos += 4;
    const r = new NbtReader(buf, pos);
    const palette = new Array(paletteSize);
    for (let i = 0; i < paletteSize; i++) palette[i] = r.root().value;
    pos = r.pos;
    const layer = { palette };
    if (opts.countsOnly) {
      const counts = new Uint32Array(paletteSize || 1);
      if (indices) for (let i = 0; i < 4096; i++) counts[indices[i]]++;
      else counts[0] = 4096;
      layer.counts = counts;
    } else {
      layer.indices = indices;
    }
    layers.push(layer);
  }
  return { version, y, layers };
}

/** Builds a stable key for a palette entry ("minecraft:oak_log" or with states "[axis=y]"). */
function blockKey(entry, withStates) {
  if (!entry) return 'unknown';
  const name = entry.name || `legacy:${entry.val}`;
  if (!withStates || !entry.states) return name;
  const st = Object.entries(entry.states).map(([k, v]) => `${k}=${typeof v === 'bigint' ? v.toString() : v}`).join(',');
  return st ? `${name}[${st}]` : name;
}

/**
 * Data3D: 256 int16 heightmap followed by one biome storage per sub-chunk (bottom to top).
 * Biome storages use the same bit-packing as blocks but with an int32 palette; a header of 0xFF
 * means "same as the storage below". Returns {heightMap, sections:[{counts: Map(biomeId->n)}]}.
 */
function decodeData3D(buf, opts = {}) {
  const heightMap = [];
  for (let i = 0; i < 256; i++) heightMap.push(buf.readInt16LE(i * 2));
  let pos = 512;
  const sections = [];
  let prev = null;
  while (pos < buf.length) {
    const header = buf[pos++];
    const bits = header >> 1;
    if (bits === 127) { sections.push(prev); continue; }
    if (bits > 16) throw new Error(`invalid biome storage header ${header}`);
    let idx = null;
    if (bits > 0) { idx = scratch; pos = unpackIndices(buf, pos, bits, idx); }
    // A single-value biome storage has no palette length: the one int32 biome id follows directly.
    let size = 1;
    if (bits > 0) { size = buf.readInt32LE(pos); pos += 4; }
    const palette = [];
    for (let i = 0; i < size; i++) { palette.push(buf.readInt32LE(pos)); pos += 4; }
    const counts = new Map();
    if (idx) for (let i = 0; i < 4096; i++) { const b = palette[idx[i]]; counts.set(b, (counts.get(b) || 0) + 1); }
    else counts.set(palette[0], 4096);
    prev = { counts };
    if (opts.keepIndices) Object.assign(prev, { indices: idx ? Uint16Array.from(idx) : null, palette });
    sections.push(prev);
  }
  return { heightMap, sections };
}

export { decodeSubChunk, decodeData3D, blockKey };
