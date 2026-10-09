import { Buffer } from 'buffer';
// Minimal read-only, in-memory ZIP reader (store + deflate, ZIP64 aware). A .mcworld is a plain zip archive.
import zlib from 'zlib';

const EOCD_SIG = 0x06054b50;
const ZIP64_EOCD_LOC_SIG = 0x07064b50;
const CDH_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

class ZipArchive {
  /** @param {Buffer} data whole archive contents */
  constructor(data, label = 'archive') {
    this.file = label;
    this.data = data;
    this.size = data.length;
    this.entries = new Map();
    this._readCentralDirectory();
  }

  _read(pos, len) {
    return this.data.subarray(pos, pos + len);
  }

  _readCentralDirectory() {
    const tailLen = Math.min(this.size, 65557);
    const tail = this._read(this.size - tailLen, tailLen);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error(`${this.file}: not a zip archive (EOCD not found)`);
    let count = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOffset = tail.readUInt32LE(eocd + 16);
    if (cdOffset === 0xffffffff || count === 0xffff) {
      const loc = eocd - 20;
      if (loc >= 0 && tail.readUInt32LE(loc) === ZIP64_EOCD_LOC_SIG) {
        const z64pos = Number(tail.readBigUInt64LE(loc + 8));
        const z = this._read(z64pos, 56);
        count = Number(z.readBigUInt64LE(32));
        cdSize = Number(z.readBigUInt64LE(40));
        cdOffset = Number(z.readBigUInt64LE(48));
      }
    }
    const cd = this._read(cdOffset, cdSize);
    let p = 0;
    for (let i = 0; i < count && p < cd.length; i++) {
      if (cd.readUInt32LE(p) !== CDH_SIG) throw new Error('corrupt zip central directory');
      const method = cd.readUInt16LE(p + 10);
      let compSize = cd.readUInt32LE(p + 20);
      let size = cd.readUInt32LE(p + 24);
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      let localOffset = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nameLen).replace(/\\/g, '/');
      // ZIP64 extra field
      let e = p + 46 + nameLen;
      const eEnd = e + extraLen;
      while (e + 4 <= eEnd) {
        const id = cd.readUInt16LE(e);
        const len = cd.readUInt16LE(e + 2);
        if (id === 0x0001) {
          let q = e + 4;
          if (size === 0xffffffff) { size = Number(cd.readBigUInt64LE(q)); q += 8; }
          if (compSize === 0xffffffff) { compSize = Number(cd.readBigUInt64LE(q)); q += 8; }
          if (localOffset === 0xffffffff) localOffset = Number(cd.readBigUInt64LE(q));
        }
        e += 4 + len;
      }
      if (!name.endsWith('/')) this.entries.set(name, { name, method, compSize, size, localOffset });
      p += 46 + nameLen + extraLen + commentLen;
    }
  }

  /** Strips a common top-level folder (some exporters wrap the world in one). */
  rootPrefix() {
    if ([...this.entries.keys()].some(n => n === 'level.dat')) return '';
    const hit = [...this.entries.keys()].find(n => n.endsWith('/level.dat'));
    return hit ? hit.slice(0, -'level.dat'.length) : '';
  }

  read(name) {
    const ent = this.entries.get(name);
    if (!ent) return null;
    const lfh = this._read(ent.localOffset, 30);
    if (lfh.readUInt32LE(0) !== LFH_SIG) throw new Error(`corrupt local header for ${name}`);
    const dataStart = ent.localOffset + 30 + lfh.readUInt16LE(26) + lfh.readUInt16LE(28);
    const raw = this._read(dataStart, ent.compSize);
    if (ent.method === 0) return Buffer.from(raw);
    if (ent.method === 8) return zlib.inflateRawSync(raw);
    throw new Error(`unsupported zip compression method ${ent.method} for ${name}`);
  }

  close() { this.data = null; }
}

export { ZipArchive };
