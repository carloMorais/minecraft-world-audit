import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, LocateFixed, Download, Users, Skull, DoorOpen, Home, PawPrint, Flag, Bed, Crosshair, Archive, Search, X } from 'lucide-react';
import { useQuery } from '../client.js';
import { Tabs, Loading, ErrorBox, PageHeader } from '../components/ui.jsx';
import { Slot, TooltipScope } from '../components/inventory.jsx';
import McText, { stripCodes } from '../components/McText.jsx';
import { fmt, DIM_LABEL, DIM_COLOR, prettyName, sortDims } from '../format.js';
import { CONTAINER_LABEL, CONTAINER_COLOR, containerItems } from '../containers.js';

const LAYERS = [
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

function useMarkers(dim, cfilter) {
  const players = useQuery('players');
  const misc = useQuery('misc');
  const summary = useQuery('summary');
  const storage = useQuery('storage');
  return useMemo(() => {
    const m = [];
    const P = players.data || [];
    P.forEach((p, i) => {
      const name = p.role.startsWith('local') ? 'Host' : `Jogador ${i}`;
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
      m.push({ layer: 'pets', x: e.position[0], z: e.position[2], label: e.name ? `${e.name}` : prettyName(e.type), detail: prettyName(e.type) });
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
  }, [players.data, misc.data, summary.data, storage.data, dim, cfilter]);
}

export default function MapPage() {
  const summary = useQuery('summary');
  const dims = summary.data ? sortDims(Object.keys(summary.data.coverage)) : ['overworld'];
  const [dim, setDim] = useState('overworld');
  const surface = useQuery('surface', { dim });
  const [cfilter, setCfilter] = useState(DEFAULT_CFILTER);
  const markers = useMarkers(dim, cfilter);
  const storage = useQuery('storage');
  const [layers, setLayers] = useState(() => new Set(LAYERS.map(l => l.id)));
  const canvasRef = useRef();
  const wrapRef = useRef();
  const bitmapRef = useRef(null);
  const view = useRef({ scale: 0.25, ox: 0, oz: 0 });
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [, force] = useState(0);
  const drag = useRef(null);

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
      if ((mk.square ? scale >= 3 : scale >= 1) || mk.layer === 'players' || mk === selected) {
        ctx.font = '600 12px Inter, sans-serif';
        const tw = ctx.measureText(mk.label).width;
        ctx.fillStyle = 'rgba(8,10,14,0.78)';
        ctx.fillRect(x + 11, y - 9, tw + 10, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(mk.label, x + 16, y + 4);
      }
    }
  }, [surface.data, markers, layers, selected]);

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
      fit();
    });
    return () => { alive = false; };
  }, [surface.data, fit]);

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

  const onMouseDown = e => { drag.current = { x: e.clientX, y: e.clientY, ox: view.current.ox, oz: view.current.oz, moved: false }; };
  const onMouseMove = e => {
    const p = toWorld(e);
    setHover({ x: Math.floor(p.x), z: Math.floor(p.z), marker: hitMarker(p) });
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    view.current = { ...view.current, ox: d.ox - dx / view.current.scale, oz: d.oz - dy / view.current.scale };
    draw();
  };
  const onMouseUp = e => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) setSelected(hitMarker(toWorld(e)));
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

  return (
    <div className="page page-map">
      <PageHeader
        title="Mapa do mundo"
        subtitle="Vista aérea gerada a partir dos blocos salvos. Arraste para mover, use a roda do mouse para zoom e clique nos marcadores."
        actions={<Tabs value={dim} onChange={d => { setDim(d); setSelected(null); }} items={dims.map(d => ({ value: d, label: DIM_LABEL[d], color: DIM_COLOR[d] }))} />}
      />
      <div className="map-layout">
        <div className="map-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { drag.current = null; setHover(null); }}
            style={{ cursor: hover?.marker ? 'pointer' : drag.current ? 'grabbing' : 'grab' }}
          />
          {surface.loading && <div className="map-overlay"><Loading text="Renderizando o terreno…" sub="Lendo cada coluna de blocos. Pode levar alguns segundos." /></div>}
          {surface.error && <div className="map-overlay"><ErrorBox error={surface.error} /></div>}
          {surface.data === null && <div className="map-overlay"><ErrorBox error={new Error('Esta dimensão não tem chunks gerados.')} /></div>}
          <div className="map-toolbar">
            <button type="button" className="icon-btn" title="Aproximar" onClick={() => zoomAt(1.5, wrapRef.current.clientWidth / 2, wrapRef.current.clientHeight / 2)}><ZoomIn size={18} /></button>
            <button type="button" className="icon-btn" title="Afastar" onClick={() => zoomAt(1 / 1.5, wrapRef.current.clientWidth / 2, wrapRef.current.clientHeight / 2)}><ZoomOut size={18} /></button>
            <button type="button" className="icon-btn" title="Ver tudo" onClick={fit}><Maximize size={18} /></button>
            {host && <button type="button" className="icon-btn" title="Centralizar no jogador" onClick={() => centerOn(host.x, host.z, 3)}><LocateFixed size={18} /></button>}
            <button type="button" className="icon-btn" title="Baixar PNG" onClick={download}><Download size={18} /></button>
          </div>
          <div className="map-hud">
            {hover ? <><Crosshair size={13} /> X {fmt(hover.x)} · Z {fmt(hover.z)}</> : 'Passe o mouse sobre o mapa'}
            <span className="sep" /> zoom {view.current.scale >= 1 ? `${view.current.scale.toFixed(1)}×` : `1:${Math.round(1 / view.current.scale)}`}
            {surface.data && <><span className="sep" />{fmt(surface.data.chunks)} chunks</>}
          </div>
        </div>
        <aside className="map-side">
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
                <button type="button" className="btn btn-sm" onClick={() => centerOn(mk.x, mk.z, 4)}>Aproximar aqui</button>
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
          <h4>Lista</h4>
          <div className="marker-list">
            {markers.filter(m => layers.has(m.layer)).slice(0, 400).map((m, i) => {
              const L = LAYERS.find(l => l.id === m.layer);
              return (
                <button type="button" key={i} onClick={() => { setSelected(m); centerOn(m.x, m.z, 3); }}>
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
