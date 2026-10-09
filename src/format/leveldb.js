import { Buffer } from 'buffer';
// Read-only LevelDB reader supporting Mojang's fork (zlib / raw-deflate block compression).
// Reads MANIFEST to find live .ldb/.sst tables and replays .log write-ahead logs, then resolves
// every user key to its newest value (honouring deletions) by sequence number.
import zlib from 'zlib';

const COMPRESSION = { NONE: 0, SNAPPY: 1, ZLIB: 2, ZSTD: 3, ZLIB_RAW: 4 };
const TYPE_DELETION = 0;
const TYPE_VALUE = 1;

function readVarint(buf, pos) {
  let result = 0;
  let shift = 0;
  for (;;) {
    const b = buf[pos++];
    result += (b & 0x7f) * 2 ** shift;
    if (!(b & 0x80)) break;
    shift += 7;
  }
  return [result, pos];
}

function snappyDecompress(src) {
  let [len, p] = readVarint(src, 0);
  const out = Buffer.alloc(len);
  let o = 0;
  while (p < src.length) {
    const tag = src[p++];
    const kind = tag & 3;
    if (kind === 0) {
      let n = tag >> 2;
      if (n >= 60) {
        const bytes = n - 59;
        n = 0;
        for (let i = 0; i < bytes; i++) n |= src[p++] << (8 * i);
      }
      n += 1;
      src.copy(out, o, p, p + n);
      p += n; o += n;
    } else {
      let n, off;
      if (kind === 1) { n = ((tag >> 2) & 7) + 4; off = ((tag >> 5) << 8) | src[p++]; }
      else if (kind === 2) { n = (tag >> 2) + 1; off = src.readUInt16LE(p); p += 2; }
      else { n = (tag >> 2) + 1; off = src.readUInt32LE(p); p += 4; }
      for (let i = 0; i < n; i++, o++) out[o] = out[o - off];
    }
  }
  return out;
}

function decompressBlock(raw, type) {
  switch (type) {
    case COMPRESSION.NONE: return raw;
    case COMPRESSION.SNAPPY: return snappyDecompress(raw);
    case COMPRESSION.ZLIB: return zlib.inflateSync(raw);
    case COMPRESSION.ZLIB_RAW: return zlib.inflateRawSync(raw);
    case COMPRESSION.ZSTD:
      if (zlib.zstdDecompressSync) return zlib.zstdDecompressSync(raw);
      throw new Error('zstd-compressed block not supported by this Node version');
    default: throw new Error(`unknown leveldb block compression ${type}`);
  }
}

/** Iterates the key/value entries of a decoded table block. */
function* blockEntries(block) {
  if (block.length < 4) return;
  const numRestarts = block.readUInt32LE(block.length - 4);
  const end = block.length - 4 - numRestarts * 4;
  let p = 0;
  let lastKey = Buffer.alloc(0);
  while (p < end) {
    let shared, nonShared, valueLen;
    [shared, p] = readVarint(block, p);
    [nonShared, p] = readVarint(block, p);
    [valueLen, p] = readVarint(block, p);
    const key = Buffer.allocUnsafe(shared + nonShared);
    lastKey.copy(key, 0, 0, shared);
    block.copy(key, shared, p, p + nonShared);
    p += nonShared;
    const value = block.subarray(p, p + valueLen);
    p += valueLen;
    lastKey = key;
    yield [key, value];
  }
}

function readBlockHandle(buf, pos) {
  let offset, size;
  [offset, pos] = readVarint(buf, pos);
  [size, pos] = readVarint(buf, pos);
  return [{ offset, size }, pos];
}

function readTableBlock(file, handle) {
  const raw = file.subarray(handle.offset, handle.offset + handle.size);
  const type = file[handle.offset + handle.size];
  return decompressBlock(raw, type);
}

/** Yields {key (user key), seq, type, value} for every record in an .ldb/.sst table. */
function* tableRecords(file) {
  if (file.length < 48) return;
  const footer = file.subarray(file.length - 48);
  let p = 0;
  [, p] = readBlockHandle(footer, p); // metaindex handle, unused
  const [indexHandle] = readBlockHandle(footer, p);
  const index = readTableBlock(file, indexHandle);
  for (const [, handleBuf] of blockEntries(index)) {
    const [handle] = readBlockHandle(handleBuf, 0);
    const block = readTableBlock(file, handle);
    for (const [ikey, value] of blockEntries(block)) {
      const n = ikey.length - 8;
      const trailer = ikey.readBigUInt64LE(n);
      yield { key: ikey.subarray(0, n), seq: Number(trailer >> 8n), type: Number(trailer & 0xffn), value };
    }
  }
}

/** Splits a leveldb log file (also used by MANIFEST) into logical records. */
function* logRecords(file) {
  const BLOCK = 32768;
  let pos = 0;
  let pending = [];
  while (pos + 7 <= file.length) {
    const blockLeft = BLOCK - (pos % BLOCK);
    if (blockLeft < 7) { pos += blockLeft; continue; }
    const len = file.readUInt16LE(pos + 4);
    const type = file[pos + 6];
    const data = file.subarray(pos + 7, pos + 7 + len);
    pos += 7 + len;
    if (type === 0) { if (pos % BLOCK) pos += BLOCK - (pos % BLOCK); pending = []; continue; } // zero padding
    if (type === 1) { yield data; pending = []; }            // FULL
    else if (type === 2) { pending = [data]; }               // FIRST
    else if (type === 3) { pending.push(data); }             // MIDDLE
    else if (type === 4) { pending.push(data); yield Buffer.concat(pending); pending = []; } // LAST
  }
}

/** Yields records of a .log write batch file. */
function* logFileRecords(file) {
  for (const batch of logRecords(file)) {
    if (batch.length < 12) continue;
    let seq = Number(batch.readBigUInt64LE(0));
    const count = batch.readUInt32LE(8);
    let p = 12;
    for (let i = 0; i < count && p < batch.length; i++) {
      const type = batch[p++];
      let klen, vlen;
      [klen, p] = readVarint(batch, p);
      const key = batch.subarray(p, p + klen);
      p += klen;
      let value = null;
      if (type === TYPE_VALUE) {
        [vlen, p] = readVarint(batch, p);
        value = batch.subarray(p, p + vlen);
        p += vlen;
      }
      yield { key, seq: seq++, type, value };
    }
  }
}

/** Parses MANIFEST version edits -> {logNumber, prevLogNumber, liveFiles:Set<number>}. */
function parseManifest(file) {
  let logNumber = 0, prevLogNumber = 0;
  const live = new Set();
  for (const rec of logRecords(file)) {
    let p = 0;
    while (p < rec.length) {
      let tag;
      [tag, p] = readVarint(rec, p);
      const skipSlice = () => { let l; [l, p] = readVarint(rec, p); p += l; };
      switch (tag) {
        case 1: skipSlice(); break;                                   // comparator
        case 2: [logNumber, p] = readVarint(rec, p); break;           // log number
        case 3: [, p] = readVarint(rec, p); break;                    // next file number
        case 4: [, p] = readVarint(rec, p); break;                    // last sequence
        case 5: [, p] = readVarint(rec, p); skipSlice(); break;       // compact pointer
        case 6: { let n; [, p] = readVarint(rec, p); [n, p] = readVarint(rec, p); live.delete(n); break; }
        case 7: {                                                     // new file
          let n; [, p] = readVarint(rec, p); [n, p] = readVarint(rec, p);
          [, p] = readVarint(rec, p); skipSlice(); skipSlice();
          live.add(n); break;
        }
        case 9: [prevLogNumber, p] = readVarint(rec, p); break;       // prev log number
        default: p = rec.length;                                      // unknown tag, stop
      }
    }
  }
  return { logNumber, prevLogNumber, liveFiles: live };
}

/**
 * Opens a LevelDB database given a `files` map: { 'CURRENT': Buffer, '000123.ldb': Buffer, ... }
 * (loaded lazily through a getter function so large worlds are read file by file).
 */
class LevelDB {
  constructor(listFiles, readFile) {
    this.map = new Map(); // key (latin1 string) -> {seq, value}
    const names = listFiles();
    const num = n => parseInt(n, 10);
    let live = null, logMin = 0;
    const current = names.includes('CURRENT') ? readFile('CURRENT').toString('utf8').trim() : null;
    if (current && names.includes(current)) {
      try {
        const m = parseManifest(readFile(current));
        if (m.liveFiles.size) live = m.liveFiles;
        logMin = Math.min(m.logNumber || 0, m.prevLogNumber || m.logNumber || 0);
      } catch (e) { live = null; }
    }
    const tables = names.filter(n => /^\d+\.(ldb|sst)$/.test(n)).filter(n => !live || live.has(num(n)));
    const logs = names.filter(n => /^\d+\.log$/.test(n)).filter(n => num(n) >= logMin);
    this.stats = { tables: tables.length, logs: logs.length, records: 0, deletions: 0 };
    for (const t of tables) this._ingest(tableRecords(readFile(t)));
    for (const l of logs.sort((a, b) => num(a) - num(b))) this._ingest(logFileRecords(readFile(l)));
    for (const [k, v] of this.map) if (v.type === TYPE_DELETION) { this.map.delete(k); this.stats.deletions++; }
  }

  _ingest(records) {
    for (const r of records) {
      this.stats.records++;
      const k = r.key.toString('latin1');
      const prev = this.map.get(k);
      if (!prev || r.seq >= prev.seq) this.map.set(k, { seq: r.seq, type: r.type, value: r.value });
    }
  }

  get size() { return this.map.size; }
  get(key) {
    const k = Buffer.isBuffer(key) ? key.toString('latin1') : key;
    const v = this.map.get(k);
    return v ? v.value : undefined;
  }
  *entries() {
    for (const [k, v] of this.map) yield [Buffer.from(k, 'latin1'), v.value];
  }
  *keys() { for (const k of this.map.keys()) yield Buffer.from(k, 'latin1'); }
}

export { LevelDB, COMPRESSION, readVarint };
