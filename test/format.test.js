import { Buffer } from 'buffer';
import test from 'node:test';
import assert from 'node:assert';
import { readNbt, readLevelDat } from '../src/format/nbt.js';
import { decodeSubChunk, decodeData3D } from '../src/format/subchunk.js';
import { parseChunkKey } from '../src/world.js';

// Tiny LE-NBT writer for building fixtures.
function str(s) { const b = Buffer.from(s, 'utf8'); const h = Buffer.alloc(2); h.writeUInt16LE(b.length); return Buffer.concat([h, b]); }
function named(type, name, payload) { return Buffer.concat([Buffer.from([type]), str(name), payload]); }
function i32(n) { const b = Buffer.alloc(4); b.writeInt32LE(n); return b; }
function compound(...entries) { return Buffer.concat([...entries, Buffer.from([0])]); }
function blockState(name) { return named(10, '', compound(named(8, 'name', str(name)), named(10, 'states', compound()), named(3, 'version', i32(1)))); }

test('reads little-endian NBT compound with nested list and long', () => {
  const long = Buffer.alloc(8); long.writeBigInt64LE(-4294967295n);
  const list = Buffer.concat([Buffer.from([3]), i32(2), i32(7), i32(9)]);
  const buf = named(10, '', compound(named(8, 'Name', str('minecraft:stone')), named(4, 'Id', long), named(9, 'L', list)));
  assert.deepStrictEqual(readNbt(buf), { Name: 'minecraft:stone', Id: -4294967295n, L: [7, 9] });
});

test('reads level.dat header', () => {
  const body = named(10, '', compound(named(3, 'GameType', i32(1))));
  const buf = Buffer.concat([i32(10), i32(body.length), body]);
  const ld = readLevelDat(buf);
  assert.strictEqual(ld.storageVersion, 10);
  assert.strictEqual(ld.data.GameType, 1);
});

test('decodes a v9 sub-chunk with 1-bit palette', () => {
  const words = Buffer.alloc(128 * 4);           // 4096 indices / 32 per word
  words.writeUInt32LE(1, 0);                      // index 0 (x0 z0 y0) -> palette[1]
  const buf = Buffer.concat([Buffer.from([9, 1, 0xfc, 1 << 1]), words, i32(2), blockState('minecraft:air'), blockState('minecraft:diamond_ore')]);
  const sc = decodeSubChunk(buf, -4);
  assert.strictEqual(sc.y, -4);
  assert.deepStrictEqual(sc.layers[0].palette.map(p => p.name), ['minecraft:air', 'minecraft:diamond_ore']);
  assert.strictEqual(sc.layers[0].indices[0], 1);
  assert.strictEqual(sc.layers[0].indices[1], 0);
  const counted = decodeSubChunk(buf, -4, { countsOnly: true });
  assert.deepStrictEqual(Array.from(counted.layers[0].counts), [4095, 1]);
});

test('decodes single-block sub-chunk layers with and without the palette count', () => {
  const withCount = Buffer.concat([Buffer.from([9, 1, 0xfd, 0]), i32(1), blockState('minecraft:deepslate')]);
  const without = Buffer.concat([Buffer.from([9, 2, 4, 0]), blockState('minecraft:stone'), Buffer.from([0]), blockState('minecraft:air')]);
  assert.strictEqual(decodeSubChunk(withCount, -3).layers[0].palette[0].name, 'minecraft:deepslate');
  const sc = decodeSubChunk(without, 4, { countsOnly: true });
  assert.deepStrictEqual(sc.layers.map(l => l.palette[0].name), ['minecraft:stone', 'minecraft:air']);
  assert.strictEqual(sc.layers[1].counts[0], 4096);
});

test('decodes Data3D single-value and copy biome storages', () => {
  const buf = Buffer.concat([Buffer.alloc(512), Buffer.from([1]), i32(190), Buffer.from([0xff])]);
  const d3 = decodeData3D(buf);
  assert.strictEqual(d3.sections.length, 2);
  assert.strictEqual(d3.sections[1], d3.sections[0]);
  assert.strictEqual(d3.sections[0].counts.get(190), 4096);
});

test('parses chunk keys', () => {
  const k = Buffer.concat([i32(-3), i32(5), i32(1), Buffer.from([47, 0xfe])]);
  assert.deepStrictEqual(parseChunkKey(k), { x: -3, z: 5, dim: 1, tag: 47, tagName: 'SubChunkPrefix', subY: -2 });
  assert.strictEqual(parseChunkKey(Buffer.from('~local_player')), null);
});
