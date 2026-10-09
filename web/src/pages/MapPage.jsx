import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, LocateFixed, Download, Crosshair, X, Ruler, Navigation, Loader2, PanelRightOpen, PanelRightClose, Layers } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam, replaceParams } from '../route.js';
import { Tabs, Loading, ErrorBox, PageHeader } from '../components/ui.jsx';
import { fmt, DIM_LABEL, DIM_COLOR, sortDims, playerNames } from '../format.js';
import { biomeColor, biomeLabel } from '../domain.js';
import { LAYERS, LAYER, LAYER_GROUPS, DEFAULT_CFILTER, DEFAULT_MFILTER, useMarkers } from '../map/layers.js';
import { VIEWS, VIEW, useSearchHits } from '../map/panels.jsx';
import { MarkerCard } from '../map/cards.jsx';

// Per-chunk heat overlays. Each is a single-hue ramp (light → dark) with alpha rising with the value.
const HEAT = {
  build: { label: 'Construção', index: 2, from: [255, 236, 179], to: [214, 92, 18], hint: 'Blocos de construção, containers, placas e pets por chunk' },
  lag: { label: 'Lag', index: 3, from: [255, 205, 210], to: [183, 18, 42], hint: 'Entidades, itens no chão, funis e blocos que processam a cada tick' },
};
const OVERLAYS = [['', 'Nenhuma'], ['build', 'Construção'], ['lag', 'Lag'], ['biomes', 'Biomas']];
const heatColor = (h, t) => h.from.map((c, i) => Math.round(c + (h.to[i] - c) * t));
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

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
  return { bmp: await createImageBitmap(img), minX: minX * 16, minZ: minZ * 16, w: w * 16, h: hgt * 16, px: w, max: sorted[sorted.length - 1], top, lookup, mode };
}

/** One pixel per block column, coloured by biome; `only` dims every other biome. */
async function biomeBitmap(B, only) {
  const palette = B.names.map(n => hexRgb(biomeColor(n)));
  const img = new ImageData(B.width, B.height);
  const d = img.data;
  for (let p = 0; p < B.ids.length; p++) {
    const id = B.ids[p];
    if (id === 0xffff) continue;
    const c = palette[id];
    d[p * 4] = c[0]; d[p * 4 + 1] = c[1]; d[p * 4 + 2] = c[2];
    d[p * 4 + 3] = only && B.names[id] !== only ? 25 : 185;
  }
  return { bmp: await createImageBitmap(img), minX: B.minX, minZ: B.minZ, w: B.width, h: B.height, px: B.width, mode: 'biomes', only };
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
  const players = useQuery('players');
  const dims = coverage.data ? sortDims(Object.keys(coverage.data)) : ['overworld'];
  const [dim, setDimParam] = useHashParam('dim', 'overworld');
  const [viewId, setViewParam] = useHashParam('view', 'all');
  const view = VIEW[viewId] || VIEW.all;
  const [layers, setLayers] = useState(() => new Set([...view.layers, ...(nav?.sel ? [nav.sel.split(':')[0]] : [])]));
  const [overlayParam, setOverlayParam] = useHashParam('overlay', '');
  const overlay = overlayParam === 'none' ? '' : overlayParam || view.overlay || '';
  const [biome, setBiome] = useHashParam('biome', '');
  const [sel, setSel] = useHashParam('sel', '');
  const [q, setQ] = useHashParam('q', '');
  const [mode, setMode] = useHashParam('mode', 'items');
  const search = useMemo(() => ({ q, mode }), [q, mode]);
  const setSearch = s => { setQ(s.q); setMode(s.mode); };
  const [cfilter, setCfilterState] = useState(DEFAULT_CFILTER);
  const [mfilter, setMfilter] = useState(() => ({ cat: nav?.cat || DEFAULT_MFILTER.cat, type: nav?.type || '' }));
  const [sideTab, setSideTab] = useState('view');
  const [wide, setWide] = useState(false);
  // A place another page asked to show ("ver no mapa") or typed in "ir para": centred once the
  // terrain is ready, then kept as a pin. It lives in the URL, so the link can be shared.
  const [focus, setFocusState] = useState(() => focusFromParams(nav));
  const pending = useRef(focus ? { dim: focus.dim, x: focus.x, z: focus.z } : null);
  const pendingSel = useRef(!focus && nav?.sel ? nav.sel : null);
  const setFocus = f => {
    setFocusState(f);
    replaceParams(f ? { x: Math.floor(f.x), y: f.y == null ? null : Math.round(f.y), z: Math.floor(f.z), label: f.label || null } : { x: null, y: null, z: null, label: null });
  };
  const [measure, setMeasure] = useState(null); // { on, a?, b? } in world coordinates
  const [goto, setGoto] = useState('');
  const surface = useQuery('surface', { dim });

  const names = useMemo(() => playerNames(players.data), [players.data]);
  const ownerNames = useMemo(() => Object.fromEntries((players.data || []).filter(p => p.uniqueId).map(p => [p.uniqueId, names.get(p.key)])), [players.data, names]);
  const { hits, state: searchState } = useSearchHits(search, layers.has('hits') || viewId === 'search', names);
  const { markers, loading, data } = useMarkers(dim, layers, { cfilter, mfilter, hits });
  const visible = useMemo(() => markers.filter(m => layers.has(m.layer)), [markers, layers]);
  const selected = sel ? visible.find(m => `${m.layer}:${m.key}` === sel) || null : null;

  const heatMode = HEAT[overlay] ? overlay : '';
  const heatData = useQuery('heat', undefined, { enabled: !!heatMode });
  const biomeData = useQuery('biomeMap', { dim }, { enabled: overlay === 'biomes' });
  const [overlayBuilt, setOverlayBuilt] = useState(null);
  useEffect(() => {
    let alive = true;
    if (heatMode && heatData.data) heatBitmap(heatData.data[dim] || [], heatMode).then(l => { if (alive) setOverlayBuilt({ ...l, dim }); });
    else if (overlay === 'biomes' && biomeData.data) biomeBitmap(biomeData.data, biome).then(l => { if (alive) setOverlayBuilt({ ...l, dim }); });
    return () => { alive = false; };
  }, [heatData.data, heatMode, overlay, biomeData.data, biome, dim]);
  // only the bitmap built for the current dimension and mode is shown
  const overlayLayer = overlay && overlayBuilt?.mode === overlay && overlayBuilt.dim === dim && overlayBuilt.bmp ? overlayBuilt : null;
  const heatLayer = heatMode && overlayLayer ? overlayLayer : null;

  const canvasRef = useRef();
  const wrapRef = useRef();
  const bitmapRef = useRef(null);
  const view0 = useRef({ scale: 0.25, ox: 0, oz: 0 });
  const [hover, setHover] = useState(null);
  const [, force] = useState(0);
  const drag = useRef(null);
  const pointers = useRef(new Map());

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const { scale, ox, oz } = view0.current;
    const dpr = window.devicePixelRatio || 1;
    const w = c.width / dpr, h = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = surface.data;
    const bmp = bitmapRef.current;
    if (s && bmp) {
      ctx.imageSmoothingEnabled = scale < 1;
      ctx.drawImage(bmp, (s.minX - ox) * scale, (s.minZ - oz) * scale, s.width * scale, s.height * scale);
    }
    if (overlayLayer) {
      const o = overlayLayer;
      ctx.imageSmoothingEnabled = o.mode === 'biomes' && scale < 1;
      ctx.drawImage(o.bmp, (o.minX - ox) * scale, (o.minZ - oz) * scale, o.w * scale, o.h * scale);
    }
    // grid of 512-block regions when zoomed in enough
    if (scale >= 0.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const step = scale >= 4 ? 16 : 128;
      for (let x = Math.floor(ox / step) * step; (x - ox) * scale < w; x += step) { ctx.beginPath(); ctx.moveTo((x - ox) * scale, 0); ctx.lineTo((x - ox) * scale, h); ctx.stroke(); }
      for (let z = Math.floor(oz / step) * step; (z - oz) * scale < h; z += step) { ctx.beginPath(); ctx.moveTo(0, (z - oz) * scale); ctx.lineTo(w, (z - oz) * scale); ctx.stroke(); }
    }
    const drawMarker = mk => {
      const L = LAYER[mk.layer];
      const x = (mk.x - ox) * scale, y = (mk.z - oz) * scale;
      const color = mk.color || L.color;
      const isSel = mk === selected;
      if (mk.box) {
        const bx = (mk.box.min[0] - ox) * scale, by = (mk.box.min[2] - oz) * scale;
        const bw = (mk.box.max[0] - mk.box.min[0]) * scale, bh = (mk.box.max[2] - mk.box.min[2]) * scale;
        if (bx > w || by > h || bx + bw < 0 || by + bh < 0) return;
        if (mk.shape === 'chunk') {
          ctx.fillStyle = `${color}${isSel ? '88' : '55'}`;
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = color;
          ctx.strokeRect(bx, by, bw, bh);
        } else {
          ctx.strokeStyle = `${color}${isSel ? 'ff' : 'aa'}`;
          ctx.lineWidth = isSel ? 2 : 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }
      } else if (x < -40 || y < -40 || x > w + 200 || y > h + 40) return;
      if (mk.shape === 'square') {
        // containers and blocks: small square chips so they read differently from the round markers
        const r = isSel ? 7 : scale >= 2 ? 5 : 4;
        ctx.fillStyle = 'rgba(8,10,14,0.9)';
        ctx.fillRect(x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2);
        ctx.fillStyle = color;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      } else if (mk.shape !== 'chunk' || scale < 1) {
        const r = isSel ? 9 : mk.small ? 4.5 : 6.5;
        ctx.beginPath();
        ctx.arc(x, y, r + (mk.small ? 1.5 : 2.5), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,10,14,0.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      if (scale >= (L.labelAt ?? 1) || isSel) {
        ctx.font = '600 12px Inter, sans-serif';
        const tw = ctx.measureText(mk.label).width;
        ctx.fillStyle = 'rgba(8,10,14,0.78)';
        ctx.fillRect(x + 11, y - 9, tw + 10, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(mk.label, x + 16, y + 4);
      }
    };
    for (const mk of visible) if (mk !== selected) drawMarker(mk);
    if (selected) drawMarker(selected); // on top
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
      ctx.lineWidth = 1;
    }
  }, [surface.data, visible, selected, focus, dim, measure, overlayLayer]);

  const fit = useCallback(() => {
    const s = surface.data, c = wrapRef.current;
    if (!s || !c) return;
    const scale = Math.min(c.clientWidth / s.width, c.clientHeight / s.height) * 0.95;
    view0.current = { scale, ox: s.minX - (c.clientWidth / scale - s.width) / 2, oz: s.minZ - (c.clientHeight / scale - s.height) / 2 };
    force(n => n + 1);
  }, [surface.data]);

  const centerOn = useCallback((x, z, scale = Math.max(view0.current.scale, 2)) => {
    const c = wrapRef.current;
    view0.current = { scale, ox: x - c.clientWidth / 2 / scale, oz: z - c.clientHeight / 2 / scale };
    force(n => n + 1);
  }, []);

  /** Centres on the marker named by `?sel=` once both the terrain and that marker are ready. */
  const trySel = useCallback(() => {
    const want = pendingSel.current;
    if (!want || !bitmapRef.current) return;
    const mk = markers.find(m => `${m.layer}:${m.key}` === want);
    if (!mk) return;
    pendingSel.current = null;
    centerOn(mk.x, mk.z, Math.max(view0.current.scale, 3));
  }, [markers, centerOn]);
  useEffect(trySel, [trySel]);

  // bitmap from the worker's RGBA
  useEffect(() => {
    let alive = true;
    bitmapRef.current = null;
    const s = surface.data;
    if (!s) return undefined;
    createImageBitmap(new ImageData(s.rgba, s.width, s.height)).then(b => {
      if (!alive) return;
      bitmapRef.current = b;
      const pf = pending.current;
      if (pf && pf.dim === dim) { pending.current = null; centerOn(pf.x, pf.z, pf.scale || 4); } else fit();
      trySel();
    });
    return () => { alive = false; };
  }, [surface.data, fit]); // eslint-disable-line react-hooks/exhaustive-deps

  // canvas sizing (the side panel can change width)
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

  const setDim = d => { setDimParam(d); setSel(''); setMeasure(m => (m ? { on: m.on } : m)); };
  const setView = id => {
    setViewParam(id);
    setLayers(new Set(VIEW[id].layers));
    setOverlayParam('');
    setBiome('');
    setSel('');
    setSideTab('view');
  };
  const setCfilter = f => { setCfilterState(f); setSel(''); };
  const select = (mk, center = true) => {
    setSel(mk ? `${mk.layer}:${mk.key}` : '');
    if (mk && center) centerOn(mk.x, mk.z, Math.max(view0.current.scale, 3));
  };
  /**
   * Goes to a point, switching dimension when needed. `selRef` ({layer, key}) selects that marker
   * (turning its layer on); otherwise `label` drops a pin there.
   */
  const jump = (d, x, z, selRef, label) => {
    if (selRef) {
      setLayers(s => (s.has(selRef.layer) ? s : new Set([...s, selRef.layer])));
      setSel(`${selRef.layer}:${selRef.key}`);
    }
    if (label) setFocus({ dim: d, x, z, label });
    const scale = Math.max(view0.current.scale, 3);
    if (d !== dim) { pending.current = { dim: d, x, z, scale }; setDimParam(d); setMeasure(null); } else centerOn(x, z, scale);
  };

  const toWorld = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const { scale, ox, oz } = view0.current;
    return { x: ox + (e.clientX - r.left) / scale, z: oz + (e.clientY - r.top) / scale, sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const zoomAt = (factor, sx, sy) => {
    const v = view0.current;
    const ns = Math.min(32, Math.max(0.02, v.scale * factor));
    const wx = v.ox + sx / v.scale, wz = v.oz + sy / v.scale;
    view0.current = { scale: ns, ox: wx - sx / ns, oz: wz - sy / ns };
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
    const { scale, ox, oz } = view0.current;
    let best = null, bd = 12;
    for (const mk of visible) {
      const d = Math.hypot((mk.x - ox) * scale - p.sx, (mk.z - oz) * scale - p.sy);
      if (d < bd) { bd = d; best = mk; }
    }
    if (best) return best;
    // chunk and area markers are hit anywhere inside them
    for (const mk of visible) {
      if (mk.shape !== 'chunk' || !mk.box) continue;
      if (p.x >= mk.box.min[0] && p.x < mk.box.max[0] && p.z >= mk.box.min[2] && p.z < mk.box.max[2]) return mk;
    }
    return null;
  };

  const pinchDistance = () => { const [a, b] = [...pointers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const onPointerDown = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { drag.current = { pinch: pinchDistance(), moved: true }; return; }
    drag.current = { x: e.clientX, y: e.clientY, ox: view0.current.ox, oz: view0.current.oz, moved: false };
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
    view0.current = { ...view0.current, ox: d.ox - dx / view0.current.scale, oz: d.oz - dy / view0.current.scale };
    draw();
  };
  const onPointerUp = e => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.pinch) {
      // keep panning smoothly with the finger that stays down
      const rest = [...pointers.current.values()][0];
      drag.current = rest ? { x: rest.x, y: rest.y, ox: view0.current.ox, oz: view0.current.oz, moved: true } : null;
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
      select(hit, false);
      if (e.pointerType !== 'mouse' && hit) setHover({ x: Math.floor(hit.x), z: Math.floor(hit.z), marker: hit });
    }
  };
  const onKeyDown = e => {
    const c = wrapRef.current, step = 80 / view0.current.scale;
    const pan = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (pan) { e.preventDefault(); view0.current = { ...view0.current, ox: view0.current.ox + pan[0], oz: view0.current.oz + pan[1] }; force(n => n + 1); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.5, c.clientWidth / 2, c.clientHeight / 2); }
    else if (e.key === '-') { e.preventDefault(); zoomAt(1 / 1.5, c.clientWidth / 2, c.clientHeight / 2); }
    else if (e.key === '0') { e.preventDefault(); fit(); }
    else if (e.key === 'Escape') { if (measure) setMeasure(null); else if (sel) setSel(''); }
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
    centerOn(f.x, f.z, Math.max(view0.current.scale, 2));
    setGoto('');
  };
  const measured = measure?.a && measure?.b ? Math.round(Math.hypot(measure.b.x - measure.a.x, measure.b.z - measure.a.z)) : null;
  const B = overlay === 'biomes' && biomeData.data?.minX != null ? biomeData.data : null;
  const biomeAt = (x, z) => {
    if (!B) return null;
    const px = x - B.minX, pz = z - B.minZ;
    if (px < 0 || pz < 0 || px >= B.width || pz >= B.height) return null;
    const id = B.ids[pz * B.width + px];
    return id === 0xffff ? null : B.names[id];
  };
  const hoverBiome = hover ? biomeAt(hover.x, hover.z) : null;
  const card = selected || hover?.marker;
  const Panel = view.Panel;
  const overlayLoading = (heatMode && heatData.loading) || (overlay === 'biomes' && biomeData.loading);

  return (
    <div className="page page-map">
      <PageHeader
        title="Mapa do mundo"
        subtitle="Vista aérea gerada a partir dos blocos salvos. Escolha uma visão ou combine camadas; clique num marcador para ver os detalhes."
      />

      <div className={`map-layout${wide ? ' wide' : ''}`}>
        <div className="map-wrap" ref={wrapRef}>
          <div className="map-floating-dim">
            {dims.map(d => (
              <button type="button" key={d} className={d === dim ? 'active' : ''} onClick={() => setDim(d)} title={DIM_LABEL[d]}>
                <span className="dot" style={{ background: DIM_COLOR[d] }} /> {DIM_LABEL[d]}
              </button>
            ))}
          </div>

          <form className="map-floating-search" onSubmit={runGoto}>
            <Navigation size={14} aria-hidden="true" style={{ color: 'var(--muted)', marginRight: '6px' }} />
            <input value={goto} onChange={e => setGoto(e.target.value)} placeholder="Ir para X, Z (ex: 120, -340)" aria-label="Ir para coordenada" inputMode="numeric" spellCheck={false} />
            <button type="submit" disabled={!parseCoords(goto)}>Ir</button>
          </form>

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
            <button type="button" className="icon-btn wide-toggle" title={wide ? 'Estreitar o painel' : 'Alargar o painel'} aria-label={wide ? 'Estreitar o painel' : 'Alargar o painel'} aria-pressed={wide} onClick={() => setWide(!wide)}>{wide ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}</button>
          </div>
          {measure?.on && (
            <div className="measure-hud" role="status">
              <Ruler size={14} />
              {measured != null ? <><strong>{fmt(measured)} blocos</strong><span>em linha reta</span></> : <span>{measure.a ? 'Clique no segundo ponto' : 'Clique no primeiro ponto'}</span>}
              <button type="button" className="icon-x" onClick={() => setMeasure(null)} aria-label="Parar de medir"><X size={13} /></button>
            </div>
          )}
          {overlayLoading && <div className="overlay-hud"><Loader2 className="spin" size={13} /> {overlay === 'biomes' ? 'Lendo biomas…' : 'Calculando por chunk… a primeira vez varre o terreno inteiro.'}</div>}
          <div className="map-hud">
            {hover ? <><Crosshair size={13} /> X {fmt(hover.x)} · Z {fmt(hover.z)}</> : <><span className="hud-hint pointer-only">Arraste para mover · roda do mouse para zoom</span><span className="hud-hint touch-only">Arraste para mover · pinça para zoom</span></>}
            <span className="sep" /> zoom {view0.current.scale >= 1 ? `${view0.current.scale.toFixed(1)}×` : `1:${Math.round(1 / view0.current.scale)}`}
            {surface.data && <><span className="sep" />{fmt(surface.data.chunks)} chunks</>}
            {hover && heatLayer && <><span className="sep" />{HEAT[heatMode].label.toLowerCase()} {fmt(heatLayer.lookup.get(`${Math.floor(hover.x / 16)}:${Math.floor(hover.z / 16)}`) || 0)}</>}
            {hoverBiome && <><span className="sep" /><span className="swatch" style={{ background: biomeColor(hoverBiome) }} /> {biomeLabel(hoverBiome)}</>}
          </div>
        </div>
        <aside className="map-side">
          <div className="side-tabs" role="tablist" aria-label="Painel do mapa">
            <button type="button" role="tab" aria-selected={sideTab === 'view'} className={sideTab === 'view' ? 'active' : ''} onClick={() => setSideTab('view')}><view.icon size={14} /> {view.label}</button>
            <button type="button" role="tab" aria-selected={sideTab === 'layers'} className={sideTab === 'layers' ? 'active' : ''} onClick={() => setSideTab('layers')}><Layers size={14} /> Camadas</button>
          </div>
          {focus && (
            <div className="focus-chip">
              <Crosshair size={14} />
              <div><strong>{focus.label || 'Local marcado'}</strong><small>{DIM_LABEL[focus.dim]} · X {Math.floor(focus.x)}{focus.y != null ? ` · Y ${Math.round(focus.y)}` : ''} · Z {Math.floor(focus.z)}</small></div>
              {focus.dim === dim
                ? <button type="button" className="btn btn-sm" onClick={() => centerOn(focus.x, focus.z, 4)}>Ir</button>
                : <button type="button" className="btn btn-sm" onClick={() => jump(focus.dim, focus.x, focus.z)}>Ir</button>}
              <button type="button" className="icon-x" onClick={() => setFocus(null)} aria-label="Remover marcação"><X size={13} /></button>
            </div>
          )}
          {card && (
            <MarkerCard
              key={`${card.layer}:${card.key}`}
              mk={card}
              full={card === selected}
              go={go}
              names={names}
              ownerNames={ownerNames}
              onCenter={() => centerOn(card.x, card.z, Math.max(view0.current.scale, 4))}
              onClose={() => setSel('')}
              onJump={jump}
            />
          )}
          {sideTab === 'view' ? (
            <>
              <div className="map-views-container">
                <div className="map-views" role="tablist" aria-label="Visão do mapa">
                  {VIEWS.map(v => (
                    <button type="button" role="tab" key={v.id} aria-selected={v.id === view.id} className={v.id === view.id ? 'active' : ''} onClick={() => setView(v.id)}>
                      <v.icon size={15} /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <Panel
                dim={dim} markers={markers} visible={layers} data={data} loading={loading} go={go}
                select={select} selected={selected} sel={sel} jump={jump}
                cfilter={cfilter} setCfilter={setCfilter} mfilter={mfilter} setMfilter={f => { setMfilter(f); setSel(''); }}
                search={search} setSearch={s => { setSearch(s); setSel(''); }} searchState={searchState} hits={hits}
                biomes={overlay === 'biomes' ? (B ? { ...B, empty: !B.names.length } : biomeData.data === null ? { empty: true } : null) : null}
                hoverBiome={hoverBiome} biome={biome} setBiome={setBiome}
              />
            </>
          ) : (
            <>
              <details className="map-accordion" open>
                <summary>🗺️ Explorar</summary>
                <div className="map-accordion-body">
                  {LAYER_GROUPS.filter(g => g !== 'Desempenho e Redstone').map(g => (
                    <div key={g} className="layer-group">
                      <h4>{g}</h4>
                      {LAYERS.filter(l => l.group === g).map(l => {
                        const on = layers.has(l.id);
                        const n = markers.filter(m => m.layer === l.id).length;
                        return (
                          <label key={l.id} className={`layer${on && !n && !loading[l.id] ? ' disabled' : ''}`}>
                            <input type="checkbox" checked={on} onChange={() => setLayers(s => { const ns = new Set(s); ns.has(l.id) ? ns.delete(l.id) : ns.add(l.id); return ns; })} />
                            <span className="dot" style={{ background: l.color }} />
                            <l.icon size={14} /> {l.label}
                            <small>{on && loading[l.id] ? <Loader2 className="spin" size={12} /> : on || !l.slow ? n : l.id === 'hits' ? '' : '…'}</small>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                  <small className="muted">Camadas marcadas com … carregam ao ligar (algumas varrem o terreno inteiro).</small>
                </div>
              </details>

              <details className="map-accordion">
                <summary>⚙️ Desempenho e Avançado</summary>
                <div className="map-accordion-body">
                  <h4>Sobreposição / Calor</h4>
                  <div className="heat-picker" role="radiogroup" aria-label="Sobreposição">
                    {OVERLAYS.map(([k, label]) => (
                      <button type="button" key={k || 'none'} role="radio" aria-checked={overlay === k} className={`chip${overlay === k ? ' chip-active' : ''}`} onClick={() => setOverlayParam(k || 'none')}>{label}</button>
                    ))}
                  </div>
                  {heatLayer && (
                    <div className="heat-legend">
                      <span className="heat-ramp" style={{ '--from': `rgb(${HEAT[heatMode].from.join(',')})`, '--to': `rgb(${HEAT[heatMode].to.join(',')})` }} />
                      <span className="heat-scale"><small>pouco</small><small>{fmt(heatLayer.top)}+</small></span>
                      <small className="muted">{HEAT[heatMode].hint}. Passe o mouse para ver o valor de cada chunk.</small>
                    </div>
                  )}
                  {heatMode && overlayBuilt?.dim === dim && overlayBuilt.mode === heatMode && overlayBuilt.empty && <small className="muted">Nada para mostrar nesta dimensão.</small>}
                  {overlay === 'biomes' && <small className="muted">A legenda dos biomas fica na visão <button type="button" className="link-btn" onClick={() => setView('biomes')}>Biomas</button>.</small>}

                  {LAYER_GROUPS.filter(g => g === 'Desempenho e Redstone').map(g => (
                    <div key={g} className="layer-group">
                      <h4>Camadas {g}</h4>
                      {LAYERS.filter(l => l.group === g).map(l => {
                        const on = layers.has(l.id);
                        const n = markers.filter(m => m.layer === l.id).length;
                        return (
                          <label key={l.id} className={`layer${on && !n && !loading[l.id] ? ' disabled' : ''}`}>
                            <input type="checkbox" checked={on} onChange={() => setLayers(s => { const ns = new Set(s); ns.has(l.id) ? ns.delete(l.id) : ns.add(l.id); return ns; })} />
                            <span className="dot" style={{ background: l.color }} />
                            <l.icon size={14} /> {l.label}
                            <small>{on && loading[l.id] ? <Loader2 className="spin" size={12} /> : on || !l.slow ? n : l.id === 'hits' ? '' : '…'}</small>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
