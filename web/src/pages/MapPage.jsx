import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, LocateFixed, Download, Users, Skull, DoorOpen, Home, PawPrint, Flag, Bed, Crosshair, Archive, Search, X, Ruler, Navigation, Castle, Loader2 } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam, replaceParams } from '../route.js';
import { Tabs, Loading, ErrorBox, PageHeader } from '../components/ui.jsx';
import { Slot, TooltipScope } from '../components/inventory.jsx';
import McText, { stripCodes } from '../components/McText.jsx';
import { fmt, fmtCompact, DIM_LABEL, DIM_COLOR, prettyName, mobName, sortDims, playerNames } from '../format.js';
import { CONTAINER_LABEL, CONTAINER_COLOR, containerItems } from '../containers.js';
import { baseName } from './Bases.jsx';

const LAYERS = [
  { id: 'bases', label: 'Bases', icon: Castle, color: '#5fd0c0' },
  { id: 'players', label: 'Jogadores', icon: Users, color: '#5fd068' },
  { id: 'spawns', label: 'Camas / spawn', icon: Bed, color: '#4fb2d8' },
  { id: 'deaths', label: 'Mortes', icon: Skull, color: '#ef5b5b' },
  { id: 'portals', label: 'Portais', icon: DoorOpen, color: '#a26be0' },
  { id: 'villages', label: 'Vilas', icon: Home, color: '#f2c14e' },
  { id: 'pets', label: 'Pets e nomeados', icon: PawPrint, color: '#f08a24' },
  { id: 'world', label: 'Spawn do mundo', icon: Flag, color: '#ffffff' },
  { id: 'containers', label: 'Baús e containers', icon: Archive, color: '#d9a14a' },
];

const DEFAULT_CFILTER = { types: null, withItems: true, empty: false, loot: false, q: '' };

// Per-chunk heat overlays. Each is a single-hue ramp (light → dark) with alpha rising with the value.
const HEAT = {
  build: { label: 'Construção', index: 2, from: [255, 236, 179], to: [214, 92, 18], hint: 'Blocos de construção, containers, placas e pets por chunk' },
  lag: { label: 'Lag', index: 3, from: [255, 205, 210], to: [183, 18, 42], hint: 'Entidades, itens no chão, funis e blocos que processam a cada tick' },
};
const heatColor = (h, t) => h.from.map((c, i) => Math.round(c + (h.to[i] - c) * t));

/** One pixel per chunk; values are log-scaled against the 99th percentile so one outlier does not wash out the rest. */
async function heatBitmap(rows, mode) {
  const h = HEAT[mode];
  const vals = rows.map(r => r[h.index]).filter(v => v > 0);
  if (!vals.length) return { mode, empty: true };
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const r of rows) { minX = Math.min(minX, r[0]); maxX = Math.max(maxX, r[0]); minZ = Math.min(minZ, r[1]); maxZ = Math.max(maxZ, r[1]); }
  const sorted = [...vals].sort((a, b) => a - b);
  const top = sorted[Math.floor((sorted.length - 1) * 0.99)] || sorted[sorted.length - 1];
  const w = maxX - minX + 1, hgt = maxZ - minZ + 1;
  const img = new ImageData(w, hgt);
  const lookup = new Map();
  for (const r of rows) {
    const v = r[h.index];
    if (!(v > 0)) continue;
    lookup.set(`${r[0]}:${r[1]}`, v);
    const t = Math.min(1, Math.log1p(v) / Math.log1p(top));
    const [cr, cg, cb] = heatColor(h, t);
    const o = ((r[1] - minZ) * w + (r[0] - minX)) * 4;
    img.data[o] = cr; img.data[o + 1] = cg; img.data[o + 2] = cb; img.data[o + 3] = Math.round(255 * (0.3 + 0.6 * t));
  }
  return { bmp: await createImageBitmap(img), minX, minZ, w, h: hgt, max: sorted[sorted.length - 1], top, lookup, mode };
}

/** True when an item (or anything nested inside it, e.g. a shulker box) matches the regex. */
const itemMatches = (it, re) => re.test(it.item) || re.test(prettyName(it.item))
  || (it.customName && re.test(stripCodes(it.customName))) || it.contents?.some(c => itemMatches(c, re));

function safeRegex(q) {
  try { return new RegExp(q, 'i'); } catch { return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
}

/** Storage blocks of one dimension that pass the side-panel container filter. */
function filterContainers(all, dim, f) {
  const re = f.q.trim() ? safeRegex(f.q.trim()) : null;
  return all.filter(b => {
    if (b.dimension !== dim) return false;
    if (f.types && !f.types.has(b.id)) return false;
    const items = containerItems(b);
    if (re) return items.some(it => itemMatches(it, re));
    const state = items.length ? 'withItems' : b.lootTable ? 'loot' : 'empty';
    return f[state];
  });
}

function useMarkers(dim, cfilter, withBases) {
  const players = useQuery('players');
  const misc = useQuery('misc');
  const summary = useQuery('summary');
  const storage = useQuery('storage');
  // bases need the terrain pass (seconds), so they load only while their layer is on
  const bases = useQuery('bases', undefined, { enabled: withBases });
  return useMemo(() => {
    const m = [];
    for (const b of bases.data || []) {
      if (b.dimension !== dim) continue;
      m.push({
        layer: 'bases', x: b.center[0], z: b.center[1], label: baseName(b), base: b,
        detail: `${fmt(b.chunks)} chunks · ${fmt(b.containers)} containers · ${fmtCompact(b.storedItems)} itens`,
        box: { min: [b.bounds.x[0], 0, b.bounds.z[0]], max: [b.bounds.x[1] + 1, 0, b.bounds.z[1] + 1] },
      });
    }
    const P = players.data || [];
    const names = playerNames(P);
    P.forEach(p => {
      const name = names.get(p.key);
      if (p.dimension === dim && p.position) m.push({ layer: 'players', x: p.position[0], z: p.position[2], label: name, detail: `Y ${Math.round(p.position[1])} · XP ${p.xp.level}` });
      if (p.spawnPoint && p.spawnPoint.dimension === dim) m.push({ layer: 'spawns', x: p.spawnPoint.x, z: p.spawnPoint.z, label: `Spawn de ${name}`, detail: `Y ${p.spawnPoint.y}` });
      if (p.lastDeath && p.hasDiedBefore && p.lastDeath.dimension === dim) m.push({ layer: 'deaths', x: p.lastDeath.x, z: p.lastDeath.z, label: `Última morte: ${name}`, detail: `Y ${p.lastDeath.y}` });
    });
    for (const pt of misc.data?.portals || []) if (pt.dimension === dim) m.push({ layer: 'portals', x: pt.position[0], z: pt.position[2], label: 'Portal do Nether', detail: `Y ${pt.position[1]}` });
    for (const v of misc.data?.villages || []) {
      if (v.bounds && ((v.dimension === 'Overworld' && dim === 'overworld') || v.dimension.toLowerCase() === dim)) {
        m.push({ layer: 'villages', x: (v.bounds.min[0] + v.bounds.max[0]) / 2, z: (v.bounds.min[2] + v.bounds.max[2]) / 2, label: 'Vila', detail: `${v.dwellers ?? '?'} moradores`, box: v.bounds });
      }
    }
    const E = summary.data?.entities;
    const seen = new Set();
    for (const e of [...(E?.named || []), ...(E?.tamedOrOwned || [])]) {
      if (e.dimension !== dim || !e.position) continue;
      const k = `${e.position}`;
      if (seen.has(k)) continue;
      seen.add(k);
      m.push({ layer: 'pets', x: e.position[0], z: e.position[2], label: e.name ? `${e.name}` : mobName(e.type), detail: mobName(e.type) });
    }
    const L = summary.data?.level;
    if (L && dim === 'overworld' && L.spawn) m.push({ layer: 'world', x: L.spawn.x, z: L.spawn.z, label: 'Spawn do mundo', detail: L.spawn.y === 32767 ? 'altura automática' : `Y ${L.spawn.y}` });
    for (const b of filterContainers(storage.data || [], dim, cfilter)) {
      const items = containerItems(b);
      const total = items.reduce((a, it) => a + it.count, 0);
      m.push({
        layer: 'containers', x: b.position[0] + 0.5, z: b.position[2] + 0.5, y: b.position[1],
        label: b.customName ? stripCodes(b.customName) : CONTAINER_LABEL[b.id] || b.id,
        detail: items.length ? `${fmt(total)} itens em ${items.length} slots` : b.lootTable ? 'Loot nunca aberto' : 'Vazio',
        color: CONTAINER_COLOR[b.id] || '#d9a14a', square: true, container: b,
      });
    }
    return m;
  }, [players.data, misc.data, summary.data, storage.data, bases.data, dim, cfilter]);
}

/** "120, -340" or "120 64 -340" → { x, y?, z }. */
function parseCoords(text) {
  const n = (text.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  if (n.length === 2) return { x: n[0], z: n[1] };
  if (n.length >= 3) return { x: n[0], y: n[1], z: n[2] };
  return null;
}

const focusFromParams = p => (p?.x != null && p?.z != null && !Number.isNaN(+p.x) && !Number.isNaN(+p.z)
  ? { dim: p.dim || 'overworld', x: +p.x, y: p.y != null && p.y !== '' ? +p.y : null, z: +p.z, label: p.label || '' }
  : null);

export default function MapPage({ nav, go }) {
  const coverage = useQuery('coverage');
  const dims = coverage.data ? sortDims(Object.keys(coverage.data)) : ['overworld'];
  const [dim, setDimParam] = useHashParam('dim', 'overworld');
  // A place another page asked to show ("ver no mapa") or typed in "ir para": centred once the
  // terrain is ready, then kept as a pin. It lives in the URL, so the link can be shared.
  const [focus, setFocusState] = useState(() => focusFromParams(nav));
  const pendingFocus = useRef(focus);
  const setFocus = f => {
    setFocusState(f);
    replaceParams(f ? { x: Math.floor(f.x), y: f.y == null ? null : Math.round(f.y), z: Math.floor(f.z), label: f.label || null } : { x: null, y: null, z: null, label: null });
  };
  const setDim = d => { setDimParam(d); setSelected(null); setMeasure(m => (m ? { on: m.on } : m)); };
  const [measure, setMeasure] = useState(null); // { on, a?, b? } in world coordinates
  const [goto, setGoto] = useState('');
  const surface = useQuery('surface', { dim });
  const [cfilter, setCfilter] = useState(DEFAULT_CFILTER);
  // the bases layer starts off: turning it on runs the terrain pass
  const [layers, setLayers] = useState(() => new Set(LAYERS.map(l => l.id).filter(id => id !== 'bases' || nav?.layer === 'bases')));
  const markers = useMarkers(dim, cfilter, layers.has('bases'));
  const storage = useQuery('storage');
  const [heat, setHeat] = useHashParam('heat', '');
  const heatMode = HEAT[heat] ? heat : '';
  const heatData = useQuery('heat', undefined, { enabled: !!heatMode });
  const [heatBuilt, setHeatBuilt] = useState(null);
  useEffect(() => {
    if (!heatMode || !heatData.data) return undefined;
    let alive = true;
    heatBitmap(heatData.data[dim] || [], heatMode).then(l => { if (alive) setHeatBuilt({ ...l, dim }); });
    return () => { alive = false; };
  }, [heatData.data, heatMode, dim]);
  // only the bitmap built for the current dimension and mode is shown
  const heatLayer = heatMode && heatBuilt?.mode === heatMode && heatBuilt.dim === dim && heatBuilt.bmp ? heatBuilt : null;
  const canvasRef = useRef();
  const wrapRef = useRef();
  const bitmapRef = useRef(null);
  const view = useRef({ scale: 0.25, ox: 0, oz: 0 });
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [, force] = useState(0);
  const drag = useRef(null);
  const pointers = useRef(new Map());

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const { scale, ox, oz } = view.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const s = surface.data;
    const bmp = bitmapRef.current;
    if (s && bmp) {
      ctx.imageSmoothingEnabled = scale < 1;
      ctx.drawImage(bmp, (s.minX - ox) * scale, (s.minZ - oz) * scale, s.width * scale, s.height * scale);
    }
    if (heatLayer) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(heatLayer.bmp, (heatLayer.minX * 16 - ox) * scale, (heatLayer.minZ * 16 - oz) * scale, heatLayer.w * 16 * scale, heatLayer.h * 16 * scale);
    }
    // grid of 512-block regions when zoomed in enough
    if (scale >= 0.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const w = c.width / dpr, h = c.height / dpr;
      const step = scale >= 4 ? 16 : 128;
      for (let x = Math.floor(ox / step) * step; (x - ox) * scale < w; x += step) { ctx.beginPath(); ctx.moveTo((x - ox) * scale, 0); ctx.lineTo((x - ox) * scale, h); ctx.stroke(); }
      for (let z = Math.floor(oz / step) * step; (z - oz) * scale < h; z += step) { ctx.beginPath(); ctx.moveTo(0, (z - oz) * scale); ctx.lineTo(w, (z - oz) * scale); ctx.stroke(); }
    }
    for (const mk of markers) {
      if (!layers.has(mk.layer)) continue;
      const L = LAYERS.find(l => l.id === mk.layer);
      const x = (mk.x - ox) * scale, y = (mk.z - oz) * scale;
      if (mk.box) {
        ctx.strokeStyle = `${L.color}aa`;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect((mk.box.min[0] - ox) * scale, (mk.box.min[2] - oz) * scale, (mk.box.max[0] - mk.box.min[0]) * scale, (mk.box.max[2] - mk.box.min[2]) * scale);
        ctx.setLineDash([]);
      }
      const color = mk.color || L.color;
      if (mk.square) {
        // containers: small square chips so they read differently from the round markers
        const h = mk === selected ? 7 : scale >= 2 ? 5 : 4;
        ctx.fillStyle = 'rgba(8,10,14,0.9)';
        ctx.fillRect(x - h - 2, y - h - 2, (h + 2) * 2, (h + 2) * 2);
        ctx.fillStyle = color;
        ctx.fillRect(x - h, y - h, h * 2, h * 2);
      } else {
        const r = mk === selected ? 9 : 6.5;
        ctx.beginPath();
        ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,10,14,0.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      if ((mk.square ? scale >= 8 : scale >= 1) || mk.layer === 'players' || mk === selected) {
        ctx.font = '600 12px Inter, sans-serif';
        const tw = ctx.measureText(mk.label).width;
        ctx.fillStyle = 'rgba(8,10,14,0.78)';
        ctx.fillRect(x + 11, y - 9, tw + 10, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(mk.label, x + 16, y + 4);
      }
    }
    if (focus && focus.dim === dim) {
      const x = (focus.x - ox) * scale, y = (focus.z - oz) * scale;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(8,10,14,0.9)';
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 9, y); ctx.moveTo(x + 9, y); ctx.lineTo(x + 22, y);
      ctx.moveTo(x, y - 22); ctx.lineTo(x, y - 9); ctx.moveTo(x, y + 9); ctx.lineTo(x, y + 22); ctx.stroke();
      if (focus.label) {
        ctx.font = '700 12px Inter, sans-serif';
        const tw = ctx.measureText(focus.label).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - tw / 2 - 6, y - 44, tw + 12, 19);
        ctx.fillStyle = '#0a0d12';
        ctx.fillText(focus.label, x - tw / 2, y - 30);
      }
    }
    if (measure?.a) {
      const ax = (measure.a.x - ox) * scale, ay = (measure.a.z - oz) * scale;
      const end = measure.b || measure.cursor;
      ctx.fillStyle = '#ffd84a';
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
      if (end) {
        const bx = (end.x - ox) * scale, by = (end.z - oz) * scale;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
        const d = Math.round(Math.hypot(end.x - measure.a.x, end.z - measure.a.z));
        const text = `${fmt(d)} blocos`;
        ctx.font = '700 12px Inter, sans-serif';
        const tw = ctx.measureText(text).width, mx = (ax + bx) / 2, my = (ay + by) / 2;
        ctx.fillStyle = 'rgba(8,10,14,0.88)';
        ctx.fillRect(mx - tw / 2 - 6, my - 22, tw + 12, 19);
        ctx.fillStyle = '#ffd84a';
        ctx.fillText(text, mx - tw / 2, my - 8);
      }
    }
  }, [surface.data, markers, layers, selected, focus, dim, measure, heatLayer]);

  const fit = useCallback(() => {
    const s = surface.data, c = wrapRef.current;
    if (!s || !c) return;
    const scale = Math.min(c.clientWidth / s.width, c.clientHeight / s.height) * 0.95;
    view.current = { scale, ox: s.minX - (c.clientWidth / scale - s.width) / 2, oz: s.minZ - (c.clientHeight / scale - s.height) / 2 };
    force(n => n + 1);
  }, [surface.data]);

  const centerOn = useCallback((x, z, scale = Math.max(view.current.scale, 2)) => {
    const c = wrapRef.current;
    view.current = { scale, ox: x - c.clientWidth / 2 / scale, oz: z - c.clientHeight / 2 / scale };
    force(n => n + 1);
  }, []);

  // bitmap from the worker's RGBA
  useEffect(() => {
    let alive = true;
    bitmapRef.current = null;
    const s = surface.data;
    if (!s) return undefined;
    createImageBitmap(new ImageData(s.rgba, s.width, s.height)).then(b => {
      if (!alive) return;
      bitmapRef.current = b;
      const pf = pendingFocus.current;
      if (pf && pf.dim === dim) { pendingFocus.current = null; centerOn(pf.x, pf.z, 4); } else fit();
    });
    return () => { alive = false; };
  }, [surface.data, fit]); // eslint-disable-line react-hooks/exhaustive-deps

  // canvas sizing
  useEffect(() => {
    const c = canvasRef.current, w = wrapRef.current;
    if (!c || !w) return undefined;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      c.width = w.clientWidth * dpr; c.height = w.clientHeight * dpr;
      c.style.width = `${w.clientWidth}px`; c.style.height = `${w.clientHeight}px`;
      draw();
    });
    ro.observe(w);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); });

  const toWorld = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const { scale, ox, oz } = view.current;
    return { x: ox + (e.clientX - r.left) / scale, z: oz + (e.clientY - r.top) / scale, sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const zoomAt = (factor, sx, sy) => {
    const v = view.current;
    const ns = Math.min(32, Math.max(0.02, v.scale * factor));
    const wx = v.ox + sx / v.scale, wz = v.oz + sy / v.scale;
    view.current = { scale: ns, ox: wx - sx / ns, oz: wz - sy / ns };
    force(n => n + 1);
  };

  const onWheel = e => {
    const p = toWorld(e);
    zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.sx, p.sy);
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return undefined;
    const prevent = e => e.preventDefault();
    c.addEventListener('wheel', prevent, { passive: false });
    return () => c.removeEventListener('wheel', prevent);
  }, []);

  const hitMarker = p => {
    const { scale, ox, oz } = view.current;
    let best = null, bd = 12;
    for (const mk of markers) {
      if (!layers.has(mk.layer)) continue;
      const d = Math.hypot((mk.x - ox) * scale - p.sx, (mk.z - oz) * scale - p.sy);
      if (d < bd) { bd = d; best = mk; }
    }
    return best;
  };

  const pinchDistance = () => { const [a, b] = [...pointers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const onPointerDown = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { drag.current = { pinch: pinchDistance(), moved: true }; return; }
    drag.current = { x: e.clientX, y: e.clientY, ox: view.current.ox, oz: view.current.oz, moved: false };
  };
  const onPointerMove = e => {
    const p = toWorld(e);
    if (e.pointerType === 'mouse') setHover({ x: Math.floor(p.x), z: Math.floor(p.z), marker: measure?.on ? null : hitMarker(p) });
    if (measure?.a && !measure.b && e.pointerType === 'mouse') setMeasure(m => ({ ...m, cursor: { x: p.x, z: p.z } }));
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    if (d.pinch) {
      const dist = pinchDistance();
      const [a, b] = [...pointers.current.values()];
      const r = canvasRef.current.getBoundingClientRect();
      zoomAt(dist / d.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      d.pinch = dist;
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    view.current = { ...view.current, ox: d.ox - dx / view.current.scale, oz: d.oz - dy / view.current.scale };
    draw();
  };
  const onPointerUp = e => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.pinch) {
      // keep panning smoothly with the finger that stays down
      const rest = [...pointers.current.values()][0];
      drag.current = rest ? { x: rest.x, y: rest.y, ox: view.current.ox, oz: view.current.oz, moved: true } : null;
      return;
    }
    drag.current = null;
    if (d && !d.moved && measure?.on) {
      const p = toWorld(e);
      const pt = { x: Math.floor(p.x) + 0.5, z: Math.floor(p.z) + 0.5 };
      setMeasure(m => (!m.a || m.b ? { on: true, a: pt } : { ...m, b: pt, cursor: null }));
      return;
    }
    if (d && !d.moved) {
      const hit = hitMarker(toWorld(e));
      setSelected(hit);
      if (e.pointerType !== 'mouse' && hit) setHover({ x: Math.floor(hit.x), z: Math.floor(hit.z), marker: hit });
    }
  };
  const onKeyDown = e => {
    const c = wrapRef.current, step = 80 / view.current.scale;
    const pan = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (pan) { e.preventDefault(); view.current = { ...view.current, ox: view.current.ox + pan[0], oz: view.current.oz + pan[1] }; force(n => n + 1); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.5, c.clientWidth / 2, c.clientHeight / 2); }
    else if (e.key === '-') { e.preventDefault(); zoomAt(1 / 1.5, c.clientWidth / 2, c.clientHeight / 2); }
    else if (e.key === '0') { e.preventDefault(); fit(); }
    else if (e.key === 'Escape' && measure) setMeasure(null);
  };

  const download = () => {
    const s = surface.data;
    if (!s) return;
    const c = document.createElement('canvas');
    c.width = s.width; c.height = s.height;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.rgba), s.width, s.height), 0, 0);
    c.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `mapa-${dim}.png`;
      a.click();
    });
  };

  const host = markers.find(m => m.layer === 'players');
  const runGoto = e => {
    e.preventDefault();
    const c = parseCoords(goto);
    if (!c) return;
    const f = { dim, ...c, label: `X ${c.x} · Z ${c.z}` };
    setFocus(f);
    centerOn(f.x, f.z, Math.max(view.current.scale, 2));
    setGoto('');
  };
  const measured = measure?.a && measure?.b ? Math.round(Math.hypot(measure.b.x - measure.a.x, measure.b.z - measure.a.z)) : null;

  return (
    <div className="page page-map">
      <PageHeader
        title="Mapa do mundo"
        subtitle="Vista aérea gerada a partir dos blocos salvos. Clique nos marcadores para ver detalhes."
        actions={<Tabs label="Dimensão" value={dim} onChange={setDim} items={dims.map(d => ({ value: d, label: DIM_LABEL[d], color: DIM_COLOR[d] }))} />}
      />
      <div className="map-layout">
        <div className="map-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label={`Mapa de ${DIM_LABEL[dim]}. Setas movem, + e - mudam o zoom, 0 mostra tudo.`}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={e => { if (e.pointerType === 'mouse') setHover(null); }}
            onKeyDown={onKeyDown}
            style={{ cursor: measure?.on ? 'crosshair' : hover?.marker ? 'pointer' : drag.current ? 'grabbing' : 'grab' }}
          />
          {surface.loading && <div className="map-overlay"><Loading text="Renderizando o terreno…" sub="Lendo cada coluna de blocos. Pode levar alguns segundos." /></div>}
          {surface.error && <div className="map-overlay"><ErrorBox error={surface.error} /></div>}
          {surface.data === null && <div className="map-overlay"><ErrorBox error={new Error('Esta dimensão não tem chunks gerados.')} /></div>}
          <div className="map-toolbar">
            <button type="button" className="icon-btn" title="Aproximar (+)" aria-label="Aproximar" onClick={() => zoomAt(1.5, wrapRef.current.clientWidth / 2, wrapRef.current.clientHeight / 2)}><ZoomIn size={18} /></button>
            <button type="button" className="icon-btn" title="Afastar (−)" aria-label="Afastar" onClick={() => zoomAt(1 / 1.5, wrapRef.current.clientWidth / 2, wrapRef.current.clientHeight / 2)}><ZoomOut size={18} /></button>
            <button type="button" className="icon-btn" title="Ver o mundo inteiro (0)" aria-label="Ver o mundo inteiro" onClick={fit}><Maximize size={18} /></button>
            {host && <button type="button" className="icon-btn" title="Centralizar no Host" aria-label="Centralizar no Host" onClick={() => centerOn(host.x, host.z, 3)}><LocateFixed size={18} /></button>}
            <button type="button" className={`icon-btn${measure?.on ? ' on' : ''}`} title="Medir distância: clique em dois pontos" aria-label="Medir distância" aria-pressed={!!measure?.on} onClick={() => setMeasure(m => (m?.on ? null : { on: true }))}><Ruler size={18} /></button>
            <button type="button" className="icon-btn" title="Baixar o mapa em PNG" aria-label="Baixar o mapa em PNG" onClick={download}><Download size={18} /></button>
          </div>
          {measure?.on && (
            <div className="measure-hud" role="status">
              <Ruler size={14} />
              {measured != null ? <><strong>{fmt(measured)} blocos</strong><span>em linha reta</span></> : <span>{measure.a ? 'Clique no segundo ponto' : 'Clique no primeiro ponto'}</span>}
              <button type="button" className="icon-x" onClick={() => setMeasure(null)} aria-label="Parar de medir"><X size={13} /></button>
            </div>
          )}
          <div className="map-hud">
            {hover ? <><Crosshair size={13} /> X {fmt(hover.x)} · Z {fmt(hover.z)}</> : <><span className="hud-hint pointer-only">Arraste para mover · roda do mouse para zoom</span><span className="hud-hint touch-only">Arraste para mover · pinça para zoom</span></>}
            <span className="sep" /> zoom {view.current.scale >= 1 ? `${view.current.scale.toFixed(1)}×` : `1:${Math.round(1 / view.current.scale)}`}
            {surface.data && <><span className="sep" />{fmt(surface.data.chunks)} chunks</>}
            {hover && heatLayer && <><span className="sep" />{HEAT[heatMode].label.toLowerCase()} {fmt(heatLayer.lookup.get(`${Math.floor(hover.x / 16)}:${Math.floor(hover.z / 16)}`) || 0)}</>}
          </div>
        </div>
        <aside className="map-side">
          {focus && (
            <div className="focus-chip">
              <Crosshair size={14} />
              <div><strong>{focus.label || 'Local marcado'}</strong><small>{DIM_LABEL[focus.dim]} · X {Math.floor(focus.x)}{focus.y != null ? ` · Y ${Math.round(focus.y)}` : ''} · Z {Math.floor(focus.z)}</small></div>
              {focus.dim === dim
                ? <button type="button" className="btn btn-sm" onClick={() => centerOn(focus.x, focus.z, 4)}>Ir</button>
                : <button type="button" className="btn btn-sm" onClick={() => { pendingFocus.current = focus; setDim(focus.dim); }}>Ir</button>}
              <button type="button" className="icon-x" onClick={() => setFocus(null)} aria-label="Remover marcação"><X size={13} /></button>
            </div>
          )}
          <form className="search search-sm goto" onSubmit={runGoto}>
            <Navigation size={14} aria-hidden="true" />
            <input value={goto} onChange={e => setGoto(e.target.value)} placeholder="Ir para X, Z (ex.: 120, -340)" aria-label="Ir para coordenada" inputMode="numeric" spellCheck={false} />
            <button type="submit" className="btn btn-sm" disabled={!parseCoords(goto)}>Ir</button>
          </form>
          <h4>Sobreposição</h4>
          <div className="heat-picker" role="radiogroup" aria-label="Sobreposição por chunk">
            {[['', 'Nenhuma'], ...Object.entries(HEAT).map(([k, h]) => [k, h.label])].map(([k, label]) => (
              <button type="button" key={k || 'none'} role="radio" aria-checked={heatMode === k} className={`chip${heatMode === k ? ' chip-active' : ''}`} onClick={() => setHeat(k)}>{label}</button>
            ))}
          </div>
          {heatMode && (
            <div className="heat-legend">
              {heatData.loading && <span className="heat-loading"><Loader2 className="spin" size={13} /> Calculando por chunk… a primeira vez varre o terreno inteiro (alguns segundos).</span>}
              {heatData.error && <span className="muted">{heatData.error.message}</span>}
              {heatBuilt?.dim === dim && heatBuilt.mode === heatMode && heatBuilt.empty && <span className="muted">Nada para mostrar nesta dimensão.</span>}
              {heatLayer && (
                <>
                  <span className="heat-ramp" style={{ '--from': `rgb(${HEAT[heatMode].from.join(',')})`, '--to': `rgb(${HEAT[heatMode].to.join(',')})` }} />
                  <span className="heat-scale"><small>pouco</small><small>{fmt(heatLayer.top)}+</small></span>
                  <small className="muted">{HEAT[heatMode].hint}. Passe o mouse para ver o valor de cada chunk.</small>
                </>
              )}
            </div>
          )}
          <h4>Camadas</h4>
          {LAYERS.map(l => {
            const n = markers.filter(m => m.layer === l.id).length;
            return (
              <label key={l.id} className={`layer${n ? '' : ' disabled'}`}>
                <input type="checkbox" checked={layers.has(l.id)} onChange={() => setLayers(s => { const ns = new Set(s); ns.has(l.id) ? ns.delete(l.id) : ns.add(l.id); return ns; })} />
                <span className="dot" style={{ background: l.color }} />
                <l.icon size={14} /> {l.label}
                <small>{n}</small>
              </label>
            );
          })}
          {(selected || hover?.marker) && (() => {
            const mk = selected || hover.marker;
            const color = mk.color || LAYERS.find(l => l.id === mk.layer).color;
            const items = mk.container ? containerItems(mk.container) : [];
            const kind = mk.container ? CONTAINER_LABEL[mk.container.id] || mk.container.id : null;
            return (
              <div className="marker-card" style={{ '--c': color }}>
                <span className={mk.square ? 'sq' : 'dot'} style={{ background: color }} />
                <strong>{mk.container?.customName ? <McText text={mk.container.customName} /> : mk.label}</strong>
                <small>{mk.container?.customName ? `${kind} · ` : ''}{mk.detail}</small>
                <code>X {Math.floor(mk.x)}{mk.y != null ? ` · Y ${mk.y}` : ''} · Z {Math.floor(mk.z)}</code>
                {items.length > 0 && (
                  <TooltipScope>
                    {tip => <div className="marker-items">{items.slice(0, 27).map((it, i) => <Slot key={i} it={it} size={34} tipHandlers={tip} />)}</div>}
                  </TooltipScope>
                )}
                {items.length > 27 && <small>+{items.length - 27} slots</small>}
                <div className="marker-actions">
                  <button type="button" className="btn btn-sm" onClick={() => centerOn(mk.x, mk.z, 4)}>Aproximar aqui</button>
                  {mk.base && go && <button type="button" className="btn btn-sm" onClick={() => go('bases', { id: mk.base.id })}>Ver base</button>}
                  {selected && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>Fechar</button>}
                </div>
              </div>
            );
          })()}
          {layers.has('containers') && (
            <ContainerFilter
              all={storage.data || []}
              dim={dim}
              value={cfilter}
              onChange={f => { setCfilter(f); setSelected(null); }}
              shown={markers.filter(m => m.layer === 'containers').length}
            />
          )}
          <h4>Lista <span className="muted">{fmt(markers.filter(m => layers.has(m.layer)).length)}</span></h4>
          <div className="marker-list">
            {markers.filter(m => layers.has(m.layer)).slice(0, 400).map((m, i) => {
              const L = LAYERS.find(l => l.id === m.layer);
              return (
                <button type="button" key={i} className={m === selected ? 'active' : ''} onClick={() => { setSelected(m); centerOn(m.x, m.z, 3); }}>
                  <span className={m.square ? 'sq' : 'dot'} style={{ background: m.color || L.color }} /> {m.label}
                  <small>{Math.round(m.x)}, {Math.round(m.z)}</small>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ContainerFilter({ all, dim, value, onChange, shown }) {
  const types = {};
  for (const b of all) if (b.dimension === dim) types[b.id] = (types[b.id] || 0) + 1;
  const ordered = Object.entries(types).sort((a, b) => b[1] - a[1]);
  const isOn = t => !value.types || value.types.has(t);
  const toggleType = t => {
    const cur = new Set(value.types || Object.keys(types));
    if (cur.has(t)) cur.delete(t); else cur.add(t);
    onChange({ ...value, types: cur.size === Object.keys(types).length ? null : cur });
  };
  const states = [['withItems', 'Com itens'], ['empty', 'Vazios'], ['loot', 'Loot nunca aberto']];
  const dirty = value.types || value.q || value.empty || value.loot || !value.withItems;
  return (
    <div className="cfilter">
      <div className="cfilter-head"><Archive size={14} /> Filtrar containers <small>{fmt(shown)} no mapa</small></div>
      <label className="search search-sm">
        <Search size={14} />
        <input value={value.q} onChange={e => onChange({ ...value, q: e.target.value })} placeholder="Contém item… (diamond, elytra)" spellCheck={false} />
        {value.q && <button type="button" className="icon-x" onClick={() => onChange({ ...value, q: '' })}><X size={13} /></button>}
      </label>
      {!value.q.trim() && (
        <div className="cfilter-states">
          {states.map(([k, label]) => (
            <label key={k} className="check"><input type="checkbox" checked={value[k]} onChange={e => onChange({ ...value, [k]: e.target.checked })} /> {label}</label>
          ))}
        </div>
      )}
      <div className="cfilter-types">
        {ordered.map(([t, n]) => (
          <button type="button" key={t} className={`ctype${isOn(t) ? ' on' : ''}`} onClick={() => toggleType(t)} style={{ '--c': CONTAINER_COLOR[t] || '#d9a14a' }}>
            <span className="sq" /> {CONTAINER_LABEL[t] || t} <small>{n}</small>
          </button>
        ))}
      </div>
      {dirty && <button type="button" className="link-btn" onClick={() => onChange(DEFAULT_CFILTER)}>Limpar filtros</button>}
    </div>
  );
}
