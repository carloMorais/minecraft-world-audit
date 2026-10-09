import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, Users, Backpack, Mountain, Trophy, Terminal, GitCompare, LogOut, Menu, X, Search, UploadCloud, FolderOpen, Repeat,
} from 'lucide-react';
import { openWorld, call } from './client.js';
import { parseHash, hashFor } from './route.js';
import Landing, { dirInput } from './pages/Landing.jsx';
import ReloadGuard from './components/ReloadGuard.jsx';
import { Modal } from './components/ui.jsx';
import Overview from './pages/Overview.jsx';
import MapPage from './pages/MapPage.jsx';
import Compare from './pages/Compare.jsx';
import { ItemsPage, PlayersPage, TerrainPage, ProgressPage, AdvancedPage } from './pages/sections.jsx';

const PAGES = [
  { id: 'map', label: 'Mapa', icon: MapIcon, el: MapPage, group: 'Mundo' },
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, el: Overview, group: 'Mundo' },
  { id: 'progress', label: 'Progresso', icon: Trophy, el: ProgressPage, group: 'Mundo' },
  { id: 'players', label: 'Jogadores', icon: Users, el: PlayersPage, group: 'Conteúdo' },
  { id: 'items', label: 'Itens', icon: Backpack, el: ItemsPage, group: 'Conteúdo' },
  { id: 'terrain', label: 'Terreno', icon: Mountain, el: TerrainPage, group: 'Conteúdo' },
  { id: 'compare', label: 'Comparar saves', icon: GitCompare, el: Compare, group: 'Ferramentas' },
  { id: 'advanced', label: 'Avançado', icon: Terminal, el: AdvancedPage, group: 'Ferramentas' },
];

/** Pages that became map views or tabs: old links (and bookmarks) land on their new home. */
const MOVED = {
  bases: p => ['map', { view: 'bases', sel: p.id ? `bases:${p.id}` : null }],
  performance: p => ['map', { view: 'lag', dim: p.dim }],
  portals: () => ['map', { view: 'portals' }],
  villagers: () => ['map', { view: 'villagers' }],
  entities: p => ['map', { view: 'mobs', cat: p.cat, type: p.type, dim: p.dim !== 'all' ? p.dim : null }],
  biomes: p => ['map', { view: 'biomes', dim: p.dim }],
  containers: p => ['items', { tab: 'containers', q: p.q, type: p.type }],
  storage: () => ['items', { tab: 'storage' }],
  wealth: () => ['players', { tab: 'wealth' }],
  gear: () => ['players', { tab: 'gear' }],
  blocks: p => ['terrain', { dim: p.dim, fq: p.fq }],
  mining: p => ['terrain', { tab: 'ores', dim: p.dim, ore: p.ore }],
  collections: () => ['progress', {}],
  world: p => (p.tab === 'maps' ? ['items', { tab: 'maps' }] : ['scoreboard', 'structures', 'other'].includes(p.tab) ? ['advanced', { tab: 'records', rec: p.tab }] : ['map', { view: 'villagers' }]),
};

const GROUPS = [...new Set(PAGES.map(p => p.group))];
const BASE_TITLE = 'MCX — Bedrock World Explorer';

/** parseHash, rewriting the hash of a page that moved. */
function readRoute() {
  const r = parseHash();
  const moved = MOVED[r.page];
  if (!moved) return r;
  const [page, params] = moved(r.params);
  window.history.replaceState(null, '', hashFor(page, params));
  return parseHash();
}

/**
 * Current page and its params, following hash changes (links, back/forward, go()). `seq` counts
 * navigations: pages read their filters from the URL when they mount, so each navigation remounts.
 * Filter changes inside a page use replaceState, which fires no hashchange.
 */
function useRoute() {
  const [route, setRoute] = useState(() => ({ ...readRoute(), seq: 0 }));
  useEffect(() => {
    const f = () => setRoute(r => ({ ...readRoute(), seq: r.seq + 1 }));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}

const isTyping = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

/** Sidebar item finder: the most common question is "where is my X?", so it is reachable from every page. */
function QuickFind({ go }) {
  const [q, setQ] = useState('');
  const ref = useRef();
  useEffect(() => {
    const onKey = e => {
      if (e.key === '/' && !isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <form className="quickfind" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) { go('items', { q: q.trim() }); setQ(''); ref.current.blur(); } }}>
      <Search size={15} aria-hidden="true" />
      <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Onde está meu…?" aria-label="Procurar item no mundo" spellCheck={false} />
      <kbd title="Atalho: tecla /">/</kbd>
    </form>
  );
}

export default function App() {
  const [world, setWorld] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [icon, setIcon] = useState(null);
  const { page, params: nav, seq } = useRoute();
  const [drawer, setDrawer] = useState(false);
  const [switching, setSwitching] = useState(false); // true, or the File dropped on the page
  const fileRef = useRef();
  const dirRef = useRef();

  const current = PAGES.find(p => p.id === page) || PAGES[0];

  // With a world open, a dropped file would make the browser navigate away; offer to open it instead.
  useEffect(() => {
    if (!world || busy) return undefined;
    const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
    const over = e => { if (hasFiles(e)) e.preventDefault(); };
    const drop = e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f && /\.(mcworld|zip)$/i.test(f.name)) setSwitching(f);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('drop', drop); };
  }, [world, busy]);

  useEffect(() => {
    document.title = world && !busy ? `${current.label} · ${world.label} — MCX` : BASE_TITLE;
  }, [world, busy, current.label]);

  async function open(input) {
    setSwitching(false);
    setBusy(true); setError(null);
    try {
      const info = await openWorld(input);
      setWorld({ ...info, label: info.name || input.name || input.file?.name });
      const bytes = await call('icon').catch(() => null);
      setIcon(old => { if (old) URL.revokeObjectURL(old); return bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) : null; });
      window.location.hash = 'map';
    } catch (e) {
      // the worker already dropped the previous world, so there is nothing left to show
      setWorld(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!world || busy) return <Landing onOpen={open} busy={busy} error={error} />;

  const Page = current.el;
  const go = (id, params) => { window.location.hash = hashFor(id, params); setDrawer(false); };

  return (
    <div className={`shell${drawer ? ' drawer-open' : ''}`}>
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => setDrawer(true)} aria-label="Abrir menu"><Menu size={18} /></button>
        {icon ? <img src={icon} alt="" /> : <span className="brand-block small" />}
        <div className="topbar-title">
          <strong>{world.label}</strong>
          <small>{current.label}</small>
        </div>
      </header>
      <div className="drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className="sidebar" aria-label="Navegação">
        <div className="world-chip">
          {icon ? <img src={icon} alt="" /> : <span className="brand-block small" />}
          <div>
            <strong title={world.label}>{world.label}</strong>
            <small title={world.file}>{world.file || 'pasta do mundo'}</small>
          </div>
          <button type="button" className="icon-x drawer-close" onClick={() => setDrawer(false)} aria-label="Fechar menu"><X size={14} /></button>
        </div>
        <QuickFind go={go} />
        <nav>
          {GROUPS.map(g => (
            <div key={g} className="nav-group">
              <span className="nav-label">{g}</span>
              {PAGES.filter(p => p.group === g).map(p => (
                <a key={p.id} href={`#${p.id}`} className={p.id === current.id ? 'active' : ''} aria-current={p.id === current.id ? 'page' : undefined} onClick={() => setDrawer(false)}>
                  <p.icon size={18} /> {p.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="btn btn-ghost" onClick={() => setSwitching(true)}>
            <Repeat size={16} /> Trocar de mundo
          </button>
          <small>Processado localmente no navegador</small>
        </div>
      </aside>
      <ReloadGuard worldName={world.label} />
      <main className="content" key={`${current.id}:${seq}`}>
        <Page world={world} icon={icon} go={go} nav={nav} />
      </main>
      <input ref={fileRef} type="file" accept=".mcworld,.zip" hidden onChange={e => e.target.files[0] && open({ file: e.target.files[0] })} />
      <input ref={dirRef} type="file" webkitdirectory="" directory="" hidden onChange={e => { const input = dirInput(e.target.files); if (input) open(input); }} />
      {switching && (
        <Modal
          icon={LogOut}
          title={switching instanceof File ? 'Abrir outro mundo?' : 'Trocar de mundo?'}
          onClose={() => setSwitching(false)}
          actions={switching instanceof File ? (
            <>
              <button type="button" className="btn" onClick={() => setSwitching(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" data-autofocus onClick={() => open({ file: switching })}><UploadCloud size={15} /> Abrir {switching.name.replace(/.(mcworld|zip)$/i, '')}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" data-autofocus onClick={() => fileRef.current.click()}><UploadCloud size={15} /> Escolher .mcworld</button>
              <button type="button" className="btn" onClick={() => dirRef.current.click()}><FolderOpen size={15} /> Abrir pasta</button>
            </>
          )}
        >
          {switching instanceof File
            ? <p>O mundo <strong>{world.label}</strong> será fechado e <strong>{switching.name}</strong> será lido no lugar dele.</p>
            : <p><strong>{world.label}</strong> continua aberto até você escolher o novo arquivo. Se cancelar a escolha, nada muda.</p>}
        </Modal>
      )}
    </div>
  );
}
