// Integration tests against the real worlds in samples/ (skipped when absent).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { World } from '../src/world.js';
import { openSource } from '../src/source.js';
import { extractLevel } from '../src/extract/level.js';
import { extractPlayers } from '../src/extract/players.js';
import { extractEntities } from '../src/extract/entities.js';
import { biomeCensus } from '../src/extract/terrain.js';
import { extractBlockEntities } from '../src/extract/blockentities.js';
import { extractMisc } from '../src/extract/misc.js';
import { chunkActivity, findBases, lagReport, oreDistribution } from '../src/extract/analysis.js';

const dir = path.join(import.meta.dirname, '..', 'samples');
const worlds = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.mcworld')) : [];

for (const f of worlds) {
  test(`extracts ${f}`, () => {
    const w = new World(openSource(path.join(dir, f)));
    const L = extractLevel(w);
    assert.ok(L.name);
    assert.ok(L.time.daysPlayed > 0);
    const players = extractPlayers(w);
    assert.ok(players.some(p => p.key === '~local_player'));
    assert.ok(players[0].inventory.length > 0);
    const ents = extractEntities(w);
    assert.ok(ents.length > 0);
    const biomes = biomeCensus(w);
    assert.ok(!Object.keys(biomes.overworld).some(k => k.includes('undefined')));
    w.close();
  });
}

for (const f of worlds) {
  test(`analyses ${f}`, () => {
    const w = new World(openSource(path.join(dir, f)));
    const players = extractPlayers(w), entities = extractEntities(w), blockEntities = extractBlockEntities(w);
    const ores = oreDistribution(w);
    assert.ok(ores.overworld.diamond.total > 0);
    assert.ok(ores.overworld.diamond.peakY < 16, 'diamonds peak deep underground');
    const rows = chunkActivity(w, blockEntities, entities);
    const bases = findBases({ rows, blockEntities, entities, players, villages: extractMisc(w, players).villages, value: true });
    assert.ok(bases.length > 0);
    // the host's bed spawn sits in the biggest base
    assert.ok(bases[0].spawnOf.includes('~local_player'));
    assert.ok(bases[0].containers > 0 && bases[0].value > 0);
    const lag = lagReport(rows);
    assert.ok(lag.heavy.length > 0 && lag.totals.overworld.entities > 0);
    w.close();
  });
}
