# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Web UI (client-side only, no backend): `npm run dev` (Vite at :5173), `npm run build` (→ `web/dist`), `npm run preview`.
- CLI: `node bin/mcx.js <command> <world.mcworld|world-folder> [args] [--json] [--raw]` (`--help` lists commands). Set `MCX_DEBUG=1` to print stack traces.
- Tests: `npm test`. Single file: `node --test test/format.test.js`. Single test: `node --test --test-name-pattern="sub-chunk" "test/*.test.js"`.
  - `test/samples.test.js` runs end-to-end against every `samples/*.mcworld` (~8s each).
  - `samples/` and `*.mcworld` are gitignored (personal worlds of ~100 MB), so on a fresh clone those tests simply don't run.
  - `npm run test:web` builds and runs `test/web/smoke.test.js`: opens the first sample world (or `SAMPLE=<file name>`) in headless Chrome over the DevTools protocol and visits every page, failing on exceptions, console errors or an error box (~40s). Skipped without a sample or Chrome (`CHROME=<path>` to override).
- Lint: `npm run lint` (ESLint 10 flat config in `eslint.config.js`, with react-hooks rules for `web/`). No formatter.
- ESM throughout (`"type": "module"`), Node >= 22. Python is not installed on this machine.

## Deploy and git

- The site is static and hosted on Vercel (https://minecraft-world-audit.vercel.app). `vercel.json` sets the build to `npm run build` with output in `web/dist`.
- **Every push to `main` on GitHub (`carloMorais/minecraft-world-audit`) deploys to production.** Ask the user whether to push to `main` or open a branch/PR; Vercel creates preview URLs for PRs.
- The user's global git config has `push.default = nothing`, so plain `git push` fails. Use `git push origin <branch>`.
- User-facing text (UI and CLI output) is in Portuguese (pt-BR). Code and comments are in English.

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
   - `analysis.js` holds the cross-cutting heuristics (bases, lag/farms, ores by Y, storage, gear, wealth, portal links). `terrainScan` decodes every sub-chunk once (~10 s on the samples) and caches the result on the World. Bases come from per-chunk scores: chunks within 2 chunks of a generated-structure block entity (Vault, TrialSpawner, SculkShrieker…) keep only their strong evidence, so trial chambers and ancient cities aren't reported as bases. Chunk `Version` (tag 44) is the same for every chunk once the game upgrades a world, so it can't date exploration.
4. **Front ends.**
   - `src/cli.js` (Portuguese text output).
   - `web/`: React app.
     - `web/src/worker.js` owns the `World` inside a Web Worker and exposes RPC methods. Extractions are memoised per opened world.
     - `web/src/client.js` holds `call()` and the caching hook `useQuery(method, args)`.
     - To add a new data view: add a method to `methods` in `worker.js`, then read it with `useQuery('name', args)` in a page. The worker passes results through `toPlain`, which strips `raw` and converts BigInt. The exceptions are typed-array results such as `surface`, `biomeMap`, `icon` and `mapItem`, which are sent as transferables.
     - Pages live in `web/src/pages/` and are routed by URL hash in `App.jsx`. Page state lives in hash params (`#items?q=elytra`, `#map?dim=nether&x=10&z=-4&label=…`): `go(page, params)` navigates, `useHashParam(key, fallback)` in `web/src/route.js` mirrors a filter into the URL with `replaceState`. Coordinates link to the map through `CoordLink` (`components/ui.jsx`); sortable tables use `useSort`. Every hash navigation remounts the page (`seq` in `App.jsx`), so pages read their params once at mount.
     - Navigation has 8 entries. Anything with a position in the world is a **view of the map**, not a page: `map?view=bases|containers|villagers|portals|mobs|lag|biomes|search`. A view is a set of layers + an overlay + a side panel (`VIEWS` in `web/src/map/panels.jsx`); layers and their markers are in `map/layers.js` (slow layers fetch only while on), marker detail cards in `map/cards.jsx`. `?sel=layer:key` selects a marker. The other pages are tabs (`?tab=`) built in `pages/sections.jsx` with `components/TabbedPage.jsx`; tab bodies have no page header. Old page hashes (`#bases`, `#entities`…) are redirected by `MOVED` in `App.jsx`. Villager, mob and biome labels/heuristics shared by map and pages live in `web/src/domain.js`.
     - Container labels, slot layouts and colours live in `web/src/containers.js`. The Itens › Baús tab and the map's containers layer both use them; the map layer gets its data from the worker's `storage` method, which also returns empty and never-opened loot containers.
     - The save comparison (`pages/Compare.jsx`) opens the second world in its own worker (`compare` channel in `client.js`) and diffs the `snapshot` of both; `compare.terminate()` frees it.
     - `components/ReloadGuard.jsx` intercepts F5/Ctrl+R with a custom dialog while a world is open. There is no persistence: a reload means re-importing the file. The user decided the site must **never** store anything on the user's machine (no IndexedDB/localStorage/caches), so don't propose it; state that must survive navigation goes in the URL.
     - The surface map comes back as transferable RGBA and is drawn on a canvas. `renderSurface` also keeps each column's top Y (`heights`); `biomeSurface` (`terrain.js`) samples the Data3D biome at that Y for the biome overlay.
     - Item icons live in `components/sprites/` (no game textures are shipped). Items are 16×16 pixel sprites drawn as text templates in `items/*.js`, one file per group, each exporting `sprites` and `rules` (`[regex, sprite, tint]`, matched against the id after the Bedrock `ALIASES` in `index.js`); palettes use fixed colours or `@0…@5`/`%0…%5` tones of a material ramp (`color.js`). Blocks are small 3D models (cube, slab, stairs, wall, fence…) with procedural per-family textures, rasterised in `blocks.js` and encoded to PNG. Review changes by eye with `npm run sprites -- --match <regex>` (contact sheet PNG through headless Chrome; `--ids` adds a `mcx items --json` file). Mob icons are lucide shapes on a coloured disc.
     - Display names are pt-BR: `prettyName(id)` translates vanilla items/blocks via `web/src/names.js` (exact table plus family rules) and `mobName(id)` does the same for entities (ids like `chicken` differ between mob and item). Unknown ids fall back to English title case; add-on ids keep their namespace.
     - The worker's `open` only reads level, the DB and players; entities and block entities load on first use, so the Overview renders the hero and players first.

## Format gotchas (verified against the sample worlds)

- Chunk key: `x:int32LE z:int32LE [dim:int32LE if not overworld] tag:u8 [subY:i8 for tag 47]`.
- Players:
  - `~local_player` is the host.
  - Other players have an identity record `player_<uuid>` → `{ServerId}`.
  - Their data lives in `player_server_<uuid>`.
- Sub-chunk palettes usually carry an int32 count even with bits=0, but some records (End, structure areas, second layers) omit it and the compound tag `0x0a` follows the header directly. Data3D biome storages never have it: with bits=0 the single int32 id follows the header directly. `bits == 127` means "copy the section below".
- Players without a bed spawn store `SpawnY = -32768` (older saves) or `SpawnX/Y/Z = INT32_MIN` with `SpawnDimension = 3` (newer ones).
- Block index order is XZY: `i = x<<8 | z<<4 | y`. Map item `colors` are 128×128 RGBA as a signed byte array.
- Vanilla kill/mining statistics and achievement progress are not stored in the world. Addon stats appear as scoreboard fake players. Item names may contain `§` colour codes (`web/src/components/McText.jsx`).
