import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, Users, PawPrint, Archive, Backpack, Boxes, Trees, Globe2, Terminal, LogOut,
} from 'lucide-react';
import { openWorld, call } from './client.js';
import Landing from './pages/Landing.jsx';
import ReloadGuard from './components/ReloadGuard.jsx';
import Overview from './pages/Overview.jsx';
import MapPage from './pages/MapPage.jsx';
import Players from './pages/Players.jsx';
import Entities from './pages/Entities.jsx';
import Containers from './pages/Containers.jsx';
import Items from './pages/Items.jsx';
import Blocks from './pages/Blocks.jsx';
import Biomes from './pages/Biomes.jsx';
import WorldData from './pages/WorldData.jsx';
import Advanced from './pages/Advanced.jsx';

const PAGES = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, el: Overview },
  { id: 'map', label: 'Mapa', icon: MapIcon, el: MapPage },
  { id: 'players', label: 'Jogadores', icon: Users, el: Players },
  { id: 'entities', label: 'Mobs e entidades', icon: PawPrint, el: Entities },
  { id: 'containers', label: 'Baús e containers', icon: Archive, el: Containers },
  { id: 'items', label: 'Itens', icon: Backpack, el: Items },
  { id: 'blocks', label: 'Blocos', icon: Boxes, el: Blocks },
  { id: 'biomes', label: 'Biomas', icon: Trees, el: Biomes },
  { id: 'world', label: 'Vilas, mapas e mais', icon: Globe2, el: WorldData },
  { id: 'advanced', label: 'Avançado', icon: Terminal, el: Advanced },
];

function useHashPage() {
  const read = () => window.location.hash.replace('#', '') || 'overview';
  const [page, setPage] = useState(read);
  useEffect(() => {
    const f = () => setPage(read());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return [page, p => { window.location.hash = p; }];
}

export default function App() {
  const [world, setWorld] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [icon, setIcon] = useState(null);
  const [page, setPage] = useHashPage();
  const [nav, setNav] = useState({});

  async function open(input) {
    setBusy(true); setError(null);
    try {
      const info = await openWorld(input);
      setWorld({ ...info, label: info.name || input.name || input.file?.name });
      const bytes = await call('icon').catch(() => null);
      setIcon(bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) : null);
      setPage('overview');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!world) return <Landing onOpen={open} busy={busy} error={error} />;

  const current = PAGES.find(p => p.id === page) || PAGES[0];
  const Page = current.el;
  const go = (id, params) => { setNav(params || {}); setPage(id); };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="world-chip">
          {icon ? <img src={icon} alt="" /> : <span className="brand-block small" />}
          <div>
            <strong title={world.label}>{world.label}</strong>
            <small>{world.file || 'pasta do mundo'}</small>
          </div>
        </div>
        <nav>
          {PAGES.map(p => (
            <a key={p.id} href={`#${p.id}`} className={p.id === current.id ? 'active' : ''} onClick={() => setNav({})}>
              <p.icon size={18} /> {p.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="btn btn-ghost" onClick={() => { setWorld(null); setIcon(null); window.location.hash = ''; }}>
            <LogOut size={16} /> Abrir outro mundo
          </button>
          <small>Processado localmente no navegador</small>
        </div>
      </aside>
      <ReloadGuard worldName={world.label} />
      <main className="content" key={current.id}>
        <Page world={world} icon={icon} go={go} nav={nav} />
      </main>
    </div>
  );
}

