# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Web UI (client-side only, no backend): `npm run dev` (Vite at :5173), `npm run build` (→ `web/dist`), `npm run preview`.
- CLI: `node bin/mcx.js <command> <world.mcworld|world-folder> [args] [--json] [--raw]` (`--help` lists commands). Set `MCX_DEBUG=1` to print stack traces.
- Tests: `npm test`. Single file: `node --test test/format.test.js`. Single test: `node --test --test-name-pattern="sub-chunk" "test/*.test.js"`. `test/samples.test.js` runs end-to-end against every `samples/*.mcworld` (~8s each).
- ESM throughout (`"type": "module"`), Node >= 22. Python is not installed on this machine.

## Architecture

The extractor core in `src/` is **shared by the CLI and the browser**. It must stay environment-neutral:
- Import `Buffer` with `import { Buffer } from 'buffer'`. Node resolves this to the built-in; Vite resolves it to the npm `buffer` polyfill.
- Import `zlib` with `import zlib from 'zlib'`. `vite.config.js` aliases it to `web/src/shims/zlib.js` (fflate), which provides only `inflateSync`, `inflateRawSync` and `deflateSync`.
- Do not use `fs`, `path` or `process` in `src/` outside `src/source.js` and `src/cli.js`. Those two are Node-only.

Layers, bottom-up:

1. **`src/format/`**: binary decoders.
   - `zip.js`: in-memory archive reader.
   - `leveldb.js`: Mojang LevelDB. It replays the MANIFEST, reads `.ldb` tables and `.log` files, keeps the highest sequence number per key, and holds everything in a `Map` keyed by the latin1 string of the key.
   - `nbt.js`: little-endian NBT. Longs come back as `BigInt`; use `jsonReplacer` or `src/serialize.js#toPlain` before output or `postMessage`.
   - `subchunk.js`: blocks and Data3D biomes.
   - `png.js`: PNG writer, used by the CLI only.
2. **Sources and world.**
   - `src/sources.js` holds the isomorphic sources: `ZipSource(buffer)` and `MapSource(Map)`.
   - `src/source.js#openSource(path)` is the Node path loader.
   - `World(source)` (`src/world.js`) exposes lazy `level`/`db`, `prefixed()`, `chunkRecords(tags, dim)` and `actorLocations` (from `digp`). Actor NBT has no dimension field, so dimension comes only from that map. Actors missing from every digest are orphans the game no longer loads; they are flagged `orphan: true` with dimension `unknown`.
3. **`src/extract/*.js`**: NBT → readable objects. Each object keeps the original NBT under `raw`. `surface.js` renders the top-down map: it scans sub-chunks top-down and does not use the Data3D heightmap, which ignores stairs, glass and similar blocks.
4. **Front ends.**
   - `src/cli.js` (Portuguese text output).
   - `web/`: React app.
     - `web/src/worker.js` owns the `World` inside a Web Worker and exposes RPC methods.
     - `web/src/client.js` holds `call()` and the caching hook `useQuery(method, args)`.
     - Pages live in `web/src/pages/`.
     - The surface map comes back as transferable RGBA and is drawn on a canvas.
     - Item and mob icons are lucide shapes plus a material colour (`components/icons.jsx`). No game textures are shipped.

## Format gotchas (verified against the sample worlds)

- Chunk key: `x:int32LE z:int32LE [dim:int32LE if not overworld] tag:u8 [subY:i8 for tag 47]`.
- Players:
  - `~local_player` is the host.
  - Other players have an identity record `player_<uuid>` → `{ServerId}`.
  - Their data lives in `player_server_<uuid>`.
- Sub-chunk palettes always carry an int32 count, even with bits=0. Data3D biome storages **do not**: with bits=0 the single int32 id follows the header directly. `bits == 127` means "copy the section below".
- Block index order is XZY: `i = x<<8 | z<<4 | y`. Map item `colors` are 128×128 RGBA as a signed byte array.
- Vanilla kill/mining statistics and achievement progress are not stored in the world. Addon stats appear as scoreboard fake players. Item names may contain `§` colour codes (`web/src/components/McText.jsx`).
