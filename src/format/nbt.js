// Little-endian NBT (Bedrock disk format). Values are decoded to plain JS:
//   byte/short/int/float/double -> number, long -> BigInt (converted to number/string in JSON output),
//   string -> string, list -> array, compound -> object, byte/int/long arrays -> arrays.
// Use `readNbt(buf, {typed:true})` to keep tag types ({type, value}) when exact round-tripping matters.

const TAG = {
  END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6,
  BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12,
};

class NbtReader {
  constructor(buf, offset = 0) {
    this.buf = buf;
    this.pos = offset;
  }
  u8() { return this.buf.readUInt8(this.pos++); }
  i8() { return this.buf.readInt8(this.pos++); }
  i16() { const v = this.buf.readInt16LE(this.pos); this.pos += 2; return v; }
  u16() { const v = this.buf.readUInt16LE(this.pos); this.pos += 2; return v; }
  i32() { const v = this.buf.readInt32LE(this.pos); this.pos += 4; return v; }
  i64() { const v = this.buf.readBigInt64LE(this.pos); this.pos += 8; return v; }
  f32() { const v = this.buf.readFloatLE(this.pos); this.pos += 4; return v; }
  f64() { const v = this.buf.readDoubleLE(this.pos); this.pos += 8; return v; }
  str() {
    const len = this.u16();
    const s = this.buf.toString('utf8', this.pos, this.pos + len);
    this.pos += len;
    return s;
  }

  payload(type) {
    switch (type) {
      case TAG.BYTE: return this.i8();
      case TAG.SHORT: return this.i16();
      case TAG.INT: return this.i32();
      case TAG.LONG: return this.i64();
      case TAG.FLOAT: return this.f32();
      case TAG.DOUBLE: return this.f64();
      case TAG.BYTE_ARRAY: {
        const n = this.i32();
        const out = Array.from(this.buf.subarray(this.pos, this.pos + n), b => (b << 24) >> 24);
        this.pos += n;
        return out;
      }
      case TAG.STRING: return this.str();
      case TAG.LIST: {
        const et = this.u8();
        const n = this.i32();
        const out = new Array(Math.max(n, 0));
        for (let i = 0; i < n; i++) out[i] = this.payload(et);
        return out;
      }
      case TAG.COMPOUND: {
        const obj = {};
        for (;;) {
          const t = this.u8();
          if (t === TAG.END) break;
          const name = this.str();
          obj[name] = this.payload(t);
        }
        return obj;
      }
      case TAG.INT_ARRAY: {
        const n = this.i32();
        const out = new Array(n);
        for (let i = 0; i < n; i++) out[i] = this.i32();
        return out;
      }
      case TAG.LONG_ARRAY: {
        const n = this.i32();
        const out = new Array(n);
        for (let i = 0; i < n; i++) out[i] = this.i64();
        return out;
      }
      default:
        throw new Error(`unknown NBT tag type ${type} at offset ${this.pos - 1}`);
    }
  }

  /** Reads one named root tag. Returns {name, value}. */
  root() {
    const t = this.u8();
    if (t === TAG.END) return { name: '', value: null };
    const name = this.str();
    return { name, value: this.payload(t) };
  }
}

/** Reads a single root tag and returns its value. */
function readNbt(buf, offset = 0) {
  return new NbtReader(buf, offset).root().value;
}

/** Reads all concatenated root tags in a buffer (block entity / legacy entity records). */
function readNbtAll(buf) {
  const r = new NbtReader(buf);
  const out = [];
  while (r.pos < buf.length) out.push(r.root().value);
  return out;
}

/** level.dat: 8-byte header (int32 storage version, int32 payload length) + LE NBT. */
function readLevelDat(buf) {
  const storageVersion = buf.readInt32LE(0);
  const length = buf.readInt32LE(4);
  const data = readNbt(buf, 8);
  return { storageVersion, length, data };
}

/** JSON replacer that makes BigInt safe and keeps precision when needed. */
function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') {
    return (value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER))
      ? Number(value) : value.toString();
  }
  return value;
}

export { TAG, NbtReader, readNbt, readNbtAll, readLevelDat, jsonReplacer };
