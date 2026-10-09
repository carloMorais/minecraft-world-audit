// High-level access to a Bedrock world: level.dat, LevelDB records, key classification.
import { LevelDB } from './format/leveldb.js';
import { readNbt, readNbtAll, readLevelDat } from './format/nbt.js';

const CHUNK_TAGS = {
  43: 'Data3D', 44: 'Version', 45: 'Data2D', 46: 'Data2DLegacy', 47: 'SubChunkPrefix', 48: 'LegacyTerrain',
  49: 'BlockEntity', 50: 'Entity', 51: 'PendingTicks', 52: 'LegacyBlockExtraData', 53: 'BiomeState',
  54: 'FinalizedState', 55: 'ConversionData', 56: 'BorderBlocks', 57: 'HardcodedSpawners', 58: 'RandomTicks',
  59: 'Checksums', 61: 'MetaDataHash', 62: 'GeneratedPreCavesAndCliffsBlending', 63: 'BlendingBiomeHeight',
  64: 'BlendingData', 65: 'ActorDigestVersion', 118: 'LegacyVersion', 119: 'AABBVolumes',
  120: 'JigsawStructureBlueprint',
};

/** Parses a binary chunk key; returns null if the key is not a chunk record. */
function parseChunkKey(k) {
  const len = k.length;
  if (![9, 10, 13, 14, 21].includes(len)) return null;
  const x = k.readInt32LE(0);
  const z = k.readInt32LE(4);
  let dim = 0, p = 8;
  if (len >= 13) { dim = k.readInt32LE(8); p = 12; }
  if (dim < 0 || dim > 2) return null;
  const tag = k[p];
  if (!(tag in CHUNK_TAGS)) return null;
  const out = { x, z, dim, tag, tagName: CHUNK_TAGS[tag] };
  if (tag === 47) {
    if (len !== p + 2) return null;
    out.subY = k.readInt8(p + 1);
  } else if (tag === 120) {
    if (len !== 21) return null;
    out.structureId = k.subarray(13).toString('hex');
  } else if (len !== p + 1) return null;
  return out;
}

function isPrintable(s) { return /^[\x20-\x7e]+$/.test(s); }

/** Classifies any key into a coarse category used by the `keys` command. */
function classifyKey(k) {
  const s = k.toString('latin1');
  if (s.startsWith('actorprefix')) return 'actorprefix';
  if (s.startsWith('digp')) return 'digp';
  const ck = parseChunkKey(k);
  if (ck) return `chunk:${ck.tagName}`;
  if (!isPrintable(s)) return 'binary(unknown)';
  if (s === '~local_player') return '~local_player';
  for (const p of ['player_server_', 'player_', 'map_', 'VILLAGE_', 'structuretemplate_', 'tickingarea_',
    'legacy_console_player_', 'RealmsStoriesData_', 'SST_']) if (s.startsWith(p)) return `${p}*`;
  return s;
}

class World {
  /** @param source a world source (see sources.js / source.js) */
  constructor(source) {
    this.source = source;
    this.files = this.source.list();
    this._db = null;
    this._level = null;
    this._actorDims = null;
  }

  /** level.dat as decoded NBT ({storageVersion, data}). */
  get level() {
    if (!this._level) {
      const buf = this.source.read('level.dat');
      if (!buf) throw new Error('level.dat not found');
      this._level = readLevelDat(buf);
    }
    return this._level;
  }

  get db() {
    if (!this._db) {
      const dbFiles = this.files.filter(f => f.startsWith('db/')).map(f => f.slice(3));
      this._db = new LevelDB(() => dbFiles, n => this.source.read(`db/${n}`));
    }
    return this._db;
  }

  readText(name) {
    const b = this.source.read(name);
    return b ? b.toString('utf8') : null;
  }

  /** Lenient JSON parse (Bedrock JSON files may contain comments / trailing commas). */
  readJson(name) {
    const t = this.readText(name);
    if (t == null) return null;
    try {
      return JSON.parse(t.replace(/^\uFEFF/, ''));
    } catch {
      try {
        const cleaned = t.replace(/^\uFEFF/, '').replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch { return null; }
    }
  }

  nbt(key) {
    const v = this.db.get(key);
    return v === undefined ? undefined : readNbt(v);
  }

  nbtAll(key) {
    const v = this.db.get(key);
    return v === undefined ? undefined : readNbtAll(v);
  }

  /** Iterates [keyBuffer, valueBuffer] for keys whose latin1 form starts with `prefix`. */
  *prefixed(prefix) {
    for (const [k, v] of this.db.entries()) if (k.toString('latin1').startsWith(prefix)) yield [k, v];
  }

  /** Iterates chunk records, optionally filtered by tag number(s) and dimension. */
  *chunkRecords(tags, dim) {
    const tagSet = tags == null ? null : new Set([].concat(tags));
    for (const [k, v] of this.db.entries()) {
      if (k.length > 21) continue;
      const ck = parseChunkKey(k);
      if (!ck) continue;
      if (tagSet && !tagSet.has(ck.tag)) continue;
      if (dim != null && ck.dim !== dim) continue;
      yield [ck, v, k];
    }
  }

  /** Map of actor storage key (hex) -> {dim, cx, cz} built from `digp` digests. */
  get actorLocations() {
    if (!this._actorDims) {
      const m = new Map();
      for (const [k, v] of this.prefixed('digp')) {
        const body = k.subarray(4);
        if (body.length !== 8 && body.length !== 12) continue;
        const cx = body.readInt32LE(0), cz = body.readInt32LE(4);
        const dim = body.length === 12 ? body.readInt32LE(8) : 0;
        for (let i = 0; i + 8 <= v.length; i += 8) m.set(v.subarray(i, i + 8).toString('hex'), { dim, cx, cz });
      }
      this._actorDims = m;
    }
    return this._actorDims;
  }

  close() { this.source.close(); }
}

export { World, parseChunkKey, classifyKey, CHUNK_TAGS };
