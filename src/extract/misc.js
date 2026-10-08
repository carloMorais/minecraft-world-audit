// Global (non-chunk) records: scoreboard, maps, villages, portals, dragon fight, mob events, etc.
import { readNbt, readNbtAll } from '../format/nbt.js';
import { DIMENSIONS, BIOMES } from '../constants.js';
import { classifyKey } from '../world.js';

const safe = fn => { try { return fn(); } catch (e) { return { error: e.message }; } };

/** Scoreboard with ScoreboardIds resolved to player / entity / fake-player names. */
function extractScoreboard(world, players = []) {
  const sb = world.nbt('scoreboard');
  if (!sb) return null;
  const byUnique = {};
  for (const p of players) if (p.uniqueId) byUnique[p.uniqueId] = p.role === 'local (host)' ? 'host (~local_player)' : p.key;
  const ids = {};
  for (const e of sb.Entries || []) {
    const id = e.ScoreboardId?.toString();
    if (e.IdentityType === 1) ids[id] = { kind: 'player', name: byUnique[e.PlayerId?.toString()] || `player ${e.PlayerId}` };
    else if (e.IdentityType === 2) ids[id] = { kind: 'entity', name: `entity ${e.EntityID}` };
    else ids[id] = { kind: 'fake', name: e.FakePlayerName };
  }
  const objectives = (sb.Objectives || []).map(o => ({
    name: o.Name, displayName: o.DisplayName, criteria: o.Criteria,
    scores: (o.Scores || []).map(s => ({ holder: ids[s.ScoreboardId?.toString()]?.name ?? `#${s.ScoreboardId}`, kind: ids[s.ScoreboardId?.toString()]?.kind, score: s.Score })),
  }));
  return {
    objectives,
    display: (sb.DisplayObjectives || []).map(d => ({ slot: d.Name, objective: d.ObjectiveName, sortOrder: d.SortOrder })),
    holders: Object.keys(ids).length,
  };
}

function extractMaps(world) {
  const maps = [];
  for (const [k, v] of world.prefixed('map_')) {
    const m = safe(() => readNbt(v));
    if (m.error) continue;
    const colors = m.colors || [];
    let painted = 0;
    for (let i = 3; i < colors.length; i += 4) if (colors[i]) painted++;
    maps.push({
      id: k.toString('latin1').slice(4), parentMapId: m.parentMapId?.toString(),
      dimension: DIMENSIONS[m.dimension] ?? m.dimension, center: [m.xCenter, m.zCenter], scale: m.scale,
      locked: Boolean(m.mapLocked), fullyExplored: Boolean(m.fullyExplored), unlimitedTracking: Boolean(m.unlimitedTracking),
      width: m.width, height: m.height, exploredPercent: colors.length ? +(100 * painted / (colors.length / 4)).toFixed(1) : 0,
      decorations: (m.decorations || []).map(d => ({ type: d.data?.type, x: d.data?.x, y: d.data?.y, rot: d.data?.rot, key: d.key })),
    });
  }
  return maps;
}

function extractVillages(world) {
  const v = {};
  for (const [k, val] of world.prefixed('VILLAGE_')) {
    const m = k.toString('latin1').match(/^VILLAGE_(\w+?)_([0-9a-f-]{36})_(\w+)$/);
    if (!m) continue;
    const [, dim, id, part] = m;
    const rec = v[id] ||= { id, dimension: dim };
    const n = safe(() => readNbt(val));
    if (part === 'INFO') {
      rec.bounds = { min: [n.X0, n.Y0, n.Z0], max: [n.X1, n.Y1, n.Z1] };
      rec.lastTick = n.Tick;
    } else if (part === 'DWELLERS') {
      const d = n.Dwellers || [];
      rec.dwellers = d.reduce((s, g) => s + (g.actors?.length || 0), 0);
      rec.dwellerGroups = d.map(g => g.actors?.length || 0);
    } else if (part === 'POI') {
      const pois = (n.POI || []).flatMap(p => p.instances || []);
      const by = {};
      for (const p of pois) by[p.Name] = (by[p.Name] || 0) + 1;
      rec.pointsOfInterest = by;
    } else if (part === 'PLAYERS') {
      rec.playerReputation = (n.Players || []).map(p => ({ playerId: p.ID?.toString(), standing: p.S }));
    } else if (part === 'RAID') {
      rec.raid = n;
    }
  }
  return Object.values(v);
}

function extractPortals(world) {
  const p = world.nbt('portals');
  return (p?.data?.PortalRecords || []).map(r => ({
    dimension: DIMENSIONS[r.DimId] ?? r.DimId, position: [r.TpX, r.TpY, r.TpZ], span: r.Span,
    orientation: r.Xa ? 'x' : 'z',
  }));
}

function extractDimensionsData(world) {
  const out = {};
  for (const name of ['Overworld', 'Nether', 'TheEnd']) {
    const d = world.nbt(name);
    if (d) out[name] = d.data || d;
  }
  const end = out.TheEnd?.DragonFight;
  return {
    dragonFight: end ? {
      dragonKilled: Boolean(end.DragonKilled), previouslyKilled: Boolean(end.PreviouslyKilled),
      dragonSpawned: Boolean(end.DragonSpawned), respawning: Boolean(end.IsRespawning),
      exitPortalLocation: end.ExitPortalLocation, gatewaysRemaining: end.Gateways?.length,
    } : null,
    limboEntities: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, (v.LimboEntities || []).length])),
    raw: out,
  };
}

function extractStructures(world) {
  const out = [];
  for (const [k, v] of world.prefixed('structuretemplate_')) {
    const s = safe(() => readNbt(v));
    const palette = s.structure?.palette?.default?.block_palette || [];
    out.push({
      name: k.toString('latin1').slice('structuretemplate_'.length), size: s.size, origin: s.structure_world_origin,
      blockTypes: palette.length, entities: (s.structure?.entities || []).length,
      palette: palette.map(b => b.name),
    });
  }
  return out;
}

function extractTickingAreas(world) {
  const out = [];
  for (const [, v] of world.prefixed('tickingarea_')) {
    const t = safe(() => readNbt(v));
    out.push({ name: t.Name, dimension: DIMENSIONS[t.Dimension] ?? t.Dimension, min: [t.MinX, t.MinZ], max: [t.MaxX, t.MaxZ], preload: Boolean(t.Preload), raw: t });
  }
  return out;
}

function extractMisc(world, players) {
  const mobevents = world.nbt('mobevents');
  const biomeData = world.nbt('BiomeData');
  return {
    scoreboard: extractScoreboard(world, players),
    portals: extractPortals(world),
    dimensions: extractDimensionsData(world),
    villages: extractVillages(world),
    maps: extractMaps(world),
    structureTemplates: extractStructures(world),
    tickingAreas: extractTickingAreas(world),
    mobEvents: mobevents || null,
    wanderingTrader: world.nbt('schedulerWT') || null,
    autonomousEntities: world.nbt('AutonomousEntities')?.AutonomousEntityList?.length ?? null,
    biomeSnowAccumulation: (biomeData?.list || []).map(b => ({ biome: BIOMES[b.id & 0xff] || b.id, snow: b.snowAccumulation })),
    flatWorldLayers: world.db.get('game_flatworldlayers')?.toString('utf8') || null,
    dynamicProperties: world.db.get('DynamicProperties') ? safe(() => readNbtAll(world.db.get('DynamicProperties'))) : null,
  };
}

/** Counts every database key by category (an index of everything stored in the world). */
function keyStats(world) {
  const cats = {};
  let bytes = 0;
  for (const [k, v] of world.db.entries()) {
    const c = classifyKey(k);
    const e = cats[c] ||= { count: 0, bytes: 0 };
    e.count++; e.bytes += v.length; bytes += v.length;
  }
  return {
    totalKeys: world.db.size, totalValueBytes: bytes, leveldb: world.db.stats,
    categories: Object.fromEntries(Object.entries(cats).sort((a, b) => b[1].count - a[1].count)),
  };
}

export { extractMisc, extractScoreboard, extractMaps, extractVillages, extractPortals, extractStructures, keyStats };
