// Browser stand-in for the parts of node:zlib used by src/ (aliased in vite.config.js).
import { Buffer } from 'buffer';
import { inflateSync as rawInflate, unzlibSync, zlibSync } from 'fflate';

const wrap = u8 => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);

export const inflateRawSync = data => wrap(rawInflate(data));
export const inflateSync = data => wrap(unzlibSync(data));
export const deflateSync = (data, opts = {}) => wrap(zlibSync(data, { level: opts.level ?? 6 }));

export default { inflateRawSync, inflateSync, deflateSync };
