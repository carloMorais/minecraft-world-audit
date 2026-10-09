// Map layers: what each one shows and how its markers are built from the worker's data.
import { useMemo } from 'react';
import { Users, Skull, DoorOpen, Home, PawPrint, Flag, Bed, Archive, Castle, Store, Bug, Tractor, Gauge, Search } from 'lucide-react';
import { useQuery } from '../client.js';
import { stripCodes } from '../components/McText.jsx';
import { fmt, fmtCompact, prettyName, mobName, playerNames } from '../format.js';
import { CONTAINER_LABEL, CONTAINER_COLOR, containerItems } from '../containers.js';
import { MOB_CATS, mobColor, professionLabel, villageDim } from '../domain.js';

export const baseName = b => b.name || `Base perto de ${fmt(b.center[0])}, ${fmt(b.center[1])}`;

/**
 * `slow`: needs the terrain pass or a big extraction, so it loads only while the layer is on.
 * `labelAt`: zoom from which marker labels are drawn (players always).
 */
export const LAYERS = [
  { id: 'players', group: 'Pessoas', label: 'Jogadores', icon: Users, color: '#5fd068', labelAt: 0 },
  { id: 'spawns', group: 'Pessoas', label: 'Camas / spawn', icon: Bed, color: '#4fb2d8' },
  { id: 'deaths', group: 'Pessoas', label: 'Mortes', icon: Skull, color: '#ef5b5b' },
  { id: 'world', group: 'Pessoas', label: 'Spawn do mundo', icon: Flag, color: '#ffffff' },
  { id: 'bases', group: 'Construções', label: 'Bases', icon: Castle, color: '#5fd0c0', slow: true, labelAt: 0.5 },
  { id: 'containers', group: 'Construções', label: 'Baús e containers', icon: Archive, color: '#d9a14a', labelAt: 8 },
  { id: 'portals', group: 'Construções', label: 'Portais do Nether', icon: DoorOpen, color: '#a26be0' },
  { id: 'villages', group: 'Vida', label: 'Vilas', icon: Home, color: '#f2c14e' },
  { id: 'villagers', group: 'Vida', label: 'Aldeões', icon: Store, color: '#f2c14e', slow: true, labelAt: 6 },
  { id: 'pets', group: 'Vida', label: 'Pets e nomeados', icon: PawPrint, color: '#f08a24' },
  { id: 'mobs', group: 'Vida', label: 'Mobs e entidades', icon: Bug, color: '#b48cf0', slow: true, labelAt: 6 },
  { id: 'farms', group: 'Técnico', label: 'Farms prováveis', icon: Tractor, color: '#7bd88f', slow: true },
  { id: 'heavy', group: 'Técnico', label: 'Chunks pesados', icon: Gauge, color: '#ff6b6b', slow: true, labelAt: 2 },
  { id: 'hits', group: 'Busca', label: 'Resultados da busca', icon: Search, color: '#ffd84a', labelAt: 3 },
];
export const LAYER = Object.fromEntries(LAYERS.map(l => [l.id, l]));
export const LAYER_GROUPS = [...new Set(LAYERS.map(l => l.group))];

export const DEFAULT_CFILTER = { types: null, withItems: true, empty: false, loot: false, q: '' };
export const DEFAULT_MFILTER = { cat: 'mobs', type: '' };

export const PORTAL_STATUS = {
  twoWay: { label: 'ida e volta', color: '#5fd068' },
  crossed: { label: 'volta cai em outro portal', color: '#ef5b5b' },
  none: { label: 'o jogo cria um portal novo', color: '#f2c14e' },
};
export const portalStatus = l => (!l || l.to == null ? 'none' : l.twoWay ? 'twoWay' : 'crossed');

export const FARM_KIND = {
  villagers: { label: 'Trading hall / aldeões confinados', tone: 'gold' },
  iron: { label: 'Farm de ferro', tone: 'blue' },
  mobs: { label: 'Farm ou criação', tone: 'green' },
};
export const farmTitle = f => (f.kind === 'mobs' ? `Farm de ${mobName(f.type).toLowerCase()}` : FARM_KIND[f.kind]?.label || 'Farm');

/** True when an item (or anything nested inside it, e.g. a shulker box) matches the regex. */
const itemMatches = (it, re) => re.test(it.item) || re.test(prettyName(it.item))
  || (it.customName && re.test(stripCodes(it.customName))) || it.contents?.some(c => itemMatches(c, re));

export function safeRegex(q) {
  try { return new RegExp(q, 'i'); } catch { return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
}

/** Storage blocks of one dimension that pass the container filter. */
export function filterContainers(all, dim, f) {
  const re = f.q.trim() ? safeRegex(f.q.trim()) : null;
  return all.filter(b => {
    if (b.dimension !== dim) return false;
    if (f.types && !f.types.has(b.id)) return false;
    const items = containerItems(b);
    if (re) return items.some(it => itemMatches(it, re)) || re.test(stripCodes(b.customName || ''));
    const state = items.length ? 'withItems' : b.lootTable ? 'loot' : 'empty';
    return f[state];
  });
}

const chunkBox = (cx, cz) => ({ min: [cx * 16, 0, cz * 16], max: [cx * 16 + 16, 0, cz * 16 + 16] });

/**
 * Markers of the current dimension for every layer in `active`. Slow layers fetch their data only
 * while on. `hits` are the search results (already filtered by the search panel).
 */
export function useMarkers(dim, active, { cfilter, mfilter, hits }) {
  const players = useQuery('players');
  const summary = useQuery('summary');
  const misc = useQuery('misc');
  const portals = useQuery('portals');
  const storage = useQuery('storage', undefined, { enabled: active.has('containers') });
  const bases = useQuery('bases', undefined, { enabled: active.has('bases') });
  const villagers = useQuery('villagers', undefined, { enabled: active.has('villagers') });
  const entities = useQuery('entities', undefined, { enabled: active.has('mobs') });
  const lag = useQuery('lag', undefined, { enabled: active.has('farms') || active.has('heavy') });
  const loading = {
    bases: bases.loading, villagers: villagers.loading, mobs: entities.loading, farms: lag.loading, heavy: lag.loading, containers: storage.loading,
  };

  const markers = useMemo(() => {
    const m = [];
    const P = players.data || [];
    const names = playerNames(P);
    P.forEach(p => {
      const name = names.get(p.key);
      if (p.dimension === dim && p.position) m.push({ layer: 'players', key: p.key, x: p.position[0], z: p.position[2], y: Math.round(p.position[1]), label: name, detail: `Nível ${p.xp.level}`, player: p });
      if (p.spawnPoint && p.spawnPoint.dimension === dim) m.push({ layer: 'spawns', key: p.key, x: p.spawnPoint.x, z: p.spawnPoint.z, y: p.spawnPoint.y, label: `Spawn de ${name}`, detail: 'cama ou âncora de renascimento' });
      if (p.lastDeath && p.hasDiedBefore && p.lastDeath.dimension === dim) m.push({ layer: 'deaths', key: p.key, x: p.lastDeath.x, z: p.lastDeath.z, y: p.lastDeath.y, label: `Última morte: ${name}`, detail: 'onde os itens caíram' });
    });
    const L = summary.data?.level;
    if (L && dim === 'overworld' && L.spawn) m.push({ layer: 'world', key: 'spawn', x: L.spawn.x, z: L.spawn.z, label: 'Spawn do mundo', detail: L.spawn.y === 32767 ? 'altura automática' : `Y ${L.spawn.y}` });

    for (const b of bases.data || []) {
      if (b.dimension !== dim) continue;
      m.push({
        layer: 'bases', key: String(b.id), x: b.center[0], z: b.center[1], label: baseName(b), base: b,
        detail: `${fmt(b.chunks)} chunks · ${fmt(b.containers)} containers · ≈ ${fmt(b.value)} diamantes`,
        box: { min: [b.bounds.x[0], 0, b.bounds.z[0]], max: [b.bounds.x[1] + 1, 0, b.bounds.z[1] + 1] },
      });
    }
    if (storage.data) {
      for (const b of filterContainers(storage.data, dim, cfilter)) {
        const items = containerItems(b);
        const total = items.reduce((a, it) => a + it.count, 0);
        m.push({
          layer: 'containers', key: String(b.position), x: b.position[0] + 0.5, z: b.position[2] + 0.5, y: b.position[1],
          label: b.customName ? stripCodes(b.customName) : CONTAINER_LABEL[b.id] || b.id,
          detail: items.length ? `${fmt(total)} itens em ${items.length} slots` : b.lootTable ? 'Loot nunca aberto' : 'Vazio',
          color: CONTAINER_COLOR[b.id] || '#d9a14a', shape: 'square', container: b,
        });
      }
    }
    if (portals.data) {
      const { portals: list, links } = portals.data;
      const linkOf = new Map(links.map(l => [l.from, l]));
      for (const p of list) {
        if (p.dimension !== dim) continue;
        const link = linkOf.get(p.index);
        const st = portalStatus(link);
        m.push({
          layer: 'portals', key: String(p.index), x: p.position[0], z: p.position[2], y: p.position[1],
          label: 'Portal do Nether', detail: PORTAL_STATUS[st].label, color: PORTAL_STATUS[st].color, portal: p, link, portals: list,
        });
      }
    }
    for (const v of misc.data?.villages || []) {
      if (!v.bounds || villageDim(v) !== dim) continue;
      m.push({
        layer: 'villages', key: v.id, x: (v.bounds.min[0] + v.bounds.max[0]) / 2, z: (v.bounds.min[2] + v.bounds.max[2]) / 2,
        label: 'Vila', detail: `${v.dwellers ?? '?'} moradores`, box: v.bounds, village: v,
      });
    }
    for (const v of villagers.data?.villagers || []) {
      if (v.dimension !== dim || !v.position) continue;
      const trader = /wandering_trader/.test(v.type);
      m.push({
        layer: 'villagers', key: String(v.uniqueId), x: v.position[0], z: v.position[2], y: Math.round(v.position[1]),
        label: v.customName ? stripCodes(v.customName) : trader ? mobName(v.type) : professionLabel(v.profession ?? 'none'),
        detail: `${v.trades?.length || 0} trocas${v.baby ? ' · bebê' : ''}`, color: trader ? '#4fb2d8' : undefined, small: true, entity: v,
      });
    }
    const E = summary.data?.entities;
    const seen = new Set();
    for (const e of [...(E?.named || []), ...(E?.tamedOrOwned || [])]) {
      if (e.dimension !== dim || !e.position) continue;
      const k = `${e.position}`;
      if (seen.has(k)) continue;
      seen.add(k);
      m.push({ layer: 'pets', key: k, x: e.position[0], z: e.position[2], y: Math.round(e.position[1]), label: e.name ? `${e.name}` : mobName(e.type), detail: mobName(e.type) });
    }
    if (entities.data) {
      const cat = MOB_CATS.find(c => c.value === mfilter.cat) || MOB_CATS[0];
      entities.data.forEach((e, i) => {
        if (e.dimension !== dim || !e.position || !cat.test(e) || (mfilter.type && e.type !== mfilter.type)) return;
        m.push({
          layer: 'mobs', key: String(e.uniqueId ?? i), x: e.position[0], z: e.position[2], y: Math.round(e.position[1]),
          label: e.customName ? stripCodes(e.customName) : mobName(e.type), detail: mobName(e.type), color: mobColor(e), small: true, entity: e,
        });
      });
    }
    if (lag.data) {
      for (const f of lag.data.farms) {
        if (f.dimension !== dim) continue;
        m.push({ layer: 'farms', key: `${f.chunk}:${f.type}`, x: f.center[0], z: f.center[1], label: farmTitle(f), detail: `${fmt(f.count)}× ${mobName(f.type)}`, farm: f, box: { min: [(f.chunk[0] - 1) * 16, 0, (f.chunk[1] - 1) * 16], max: [(f.chunk[0] + 2) * 16, 0, (f.chunk[1] + 2) * 16] } });
      }
      for (const r of lag.data.heavy) {
        if (r.dimension !== dim) continue;
        m.push({ layer: 'heavy', key: `${r.x}:${r.z}`, x: r.center[0], z: r.center[1], label: `Chunk ${r.x}, ${r.z}`, detail: `peso ${fmtCompact(r.lag)}`, chunk: r, shape: 'chunk', box: chunkBox(r.x, r.z) });
      }
    }
    (hits || []).forEach((h, i) => {
      if (h.dimension !== dim || !h.position) return;
      m.push({ layer: 'hits', key: String(i), x: h.position[0] + (h.block ? 0.5 : 0), z: h.position[2] + (h.block ? 0.5 : 0), y: Math.round(h.position[1]), label: h.label, detail: h.detail, hit: h, shape: h.block ? 'square' : undefined, small: true });
    });
    return m;
  }, [players.data, summary.data, misc.data, portals.data, storage.data, bases.data, villagers.data, entities.data, lag.data, hits, dim, cfilter, mfilter]);

  return { markers, loading, data: { storage: storage.data, entities: entities.data, villagers: villagers.data, bases: bases.data, lag: lag.data, portals: portals.data } };
}
