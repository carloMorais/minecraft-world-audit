// Side-panel content of each map view: the ranking or list that used to be its own page.
import { useMemo, useState } from 'react';
import {
  Layers, Castle, Archive, Store, Waypoints, PawPrint, Gauge, Trees, Search, Info, Loader2, X, BookOpen, ChevronRight,
} from 'lucide-react';
import { useQuery } from '../client.js';
import { BarList, Tabs } from '../components/ui.jsx';
import { ItemIcon, MobIcon } from '../components/icons.jsx';
import { fmt, fmtCompact, prettyName, mobName, DIM_LABEL, DIM_COLOR, sortDims, whereLabel, workerQuery } from '../format.js';
import { CONTAINER_LABEL, CONTAINER_COLOR } from '../containers.js';
import {
  PROFESSION, UNEMPLOYED, profKey, villagerCrowds, villageDim, MOB_CATS, biomeColor, biomeLabel,
} from '../domain.js';
import { LAYER, DEFAULT_CFILTER, PORTAL_STATUS, portalStatus, farmTitle, baseName } from './layers.js';

const xz = p => `${fmt(Math.floor(p[0]))}, ${fmt(Math.floor(p[2]))}`;
const Dot = ({ c }) => <span className="dot" style={{ background: c }} />;

function Waiting({ text, sub }) {
  return <div className="side-loading"><Loader2 className="spin" size={15} /><div><span>{text}</span>{sub && <small>{sub}</small>}</div></div>;
}

function Note({ children }) {
  return <details className="side-note"><summary><Info size={13} /> Como é calculado</summary><p>{children}</p></details>;
}

function Stats({ items }) {
  return <div className="side-stats">{items.filter(Boolean).map(([label, value, tone]) => <div key={label} className={tone ? `tone-${tone}` : ''}><b>{value}</b><small>{label}</small></div>)}</div>;
}

/** Clickable rows; `rows` items: {key, dot, icon, title, sub, right, onClick, active}. */
function List({ rows, limit = 200, empty }) {
  const [n, setN] = useState(limit);
  if (!rows.length) return <p className="muted small side-empty">{empty || 'Nada aqui.'}</p>;
  return (
    <div className="side-list">
      {rows.slice(0, n).map(r => (
        <button type="button" key={r.key} className={r.active ? 'active' : ''} onClick={r.onClick}>
          {r.icon || (r.dot && <span className={r.square ? 'sq' : 'dot'} style={{ background: r.dot }} />)}
          <span className="side-list-main"><span>{r.title}</span>{r.sub && <small>{r.sub}</small>}</span>
          {r.right != null && <small className="side-list-right">{r.right}</small>}
        </button>
      ))}
      {rows.length > n && <button type="button" className="link-btn" onClick={() => setN(n + limit)}>Mostrar mais ({fmt(rows.length - n)})</button>}
    </div>
  );
}

/** "Tudo": the markers of every visible layer. */
function AllPanel({ markers, visible, select, selected }) {
  const shown = markers.filter(m => visible.has(m.layer));
  return (
    <>
      <h4>No mapa <span className="muted">{fmt(shown.length)}</span></h4>
      <List
        rows={shown.slice(0, 2000).map((m, i) => ({
          key: `${m.layer}:${m.key}:${i}`, dot: m.color || LAYER[m.layer].color, square: !!m.shape, title: m.label,
          sub: LAYER[m.layer].label, right: `${Math.round(m.x)}, ${Math.round(m.z)}`, onClick: () => select(m), active: m === selected,
        }))}
        empty="Ligue alguma camada na aba Camadas."
      />
    </>
  );
}

const BASE_SORT = { value: ['Valor', b => b.value || 0], chunks: ['Tamanho', b => b.chunks], items: ['Itens', b => b.storedItems], containers: ['Containers', b => b.containers] };

function BasesPanel({ data, loading, jump, sel }) {
  const [sort, setSort] = useState('value');
  const B = data.bases;
  if (!B) return loading.bases ? <Waiting text="Procurando bases…" sub="Varre todos os chunks. Leva alguns segundos na primeira vez." /> : null;
  if (!B.length) return <p className="muted small">Nenhuma base encontrada: o mundo parece ter só terreno e estruturas naturais.</p>;
  const by = BASE_SORT[sort][1];
  const rows = [...B].sort((a, b) => by(b) - by(a));
  return (
    <>
      <Stats items={[
        ['bases', fmt(B.length), 'green'],
        ['itens guardados', fmtCompact(B.reduce((a, b) => a + b.storedItems, 0)), 'orange'],
        ['diamantes (≈)', fmtCompact(B.reduce((a, b) => a + (b.value || 0), 0)), 'blue'],
      ]} />
      <Note>O Bedrock não registra quem construiu cada bloco. Chunks com muitos sinais de construção (blocos típicos de jogador, baús com itens, placas, pets, camas) são agrupados em bases; estruturas geradas pelo jogo são descartadas. O calor laranja mostra a intensidade de construção por chunk.</Note>
      <div className="side-sort">
        <small>Ordenar por</small>
        {Object.entries(BASE_SORT).map(([k, [label]]) => <button type="button" key={k} className={`chip${sort === k ? ' chip-active' : ''}`} onClick={() => setSort(k)}>{label}</button>)}
      </div>
      <List rows={rows.map(b => ({
        key: b.id, dot: DIM_COLOR[b.dimension], title: baseName(b), active: sel === `bases:${b.id}`,
        sub: `${fmt(b.chunks)} chunks · ${fmtCompact(b.storedItems)} itens${b.village ? ' · em vila' : ''}`,
        right: sort === 'value' ? `≈ ${fmtCompact(b.value)}` : sort === 'chunks' ? fmt(b.chunks) : sort === 'items' ? fmtCompact(b.storedItems) : fmt(b.containers),
        onClick: () => jump(b.dimension, b.center[0], b.center[1], { layer: 'bases', key: String(b.id) }),
      }))} />
    </>
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
        <input value={value.q} onChange={e => onChange({ ...value, q: e.target.value })} placeholder="Contém item… (diamond, elytra)" spellCheck={false} aria-label="Containers que contêm o item" />
        {value.q && <button type="button" className="icon-x" onClick={() => onChange({ ...value, q: '' })} aria-label="Limpar"><X size={13} /></button>}
      </label>
      {!value.q.trim() && (
        <div className="cfilter-states">
          {states.map(([k, label]) => <label key={k} className="check"><input type="checkbox" checked={value[k]} onChange={e => onChange({ ...value, [k]: e.target.checked })} /> {label}</label>)}
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

function ContainersPanel({ data, loading, dim, markers, cfilter, setCfilter, select, selected, go }) {
  if (!data.storage) return loading.containers ? <Waiting text="Abrindo os baús…" /> : null;
  const list = markers.filter(m => m.layer === 'containers');
  return (
    <>
      <ContainerFilter all={data.storage} dim={dim} value={cfilter} onChange={setCfilter} shown={list.length} />
      <button type="button" className="link-btn side-link" onClick={() => go('items', { tab: 'containers' })}>Ver todos os baús com o inventário aberto <ChevronRight size={13} /></button>
      <List rows={[...list].sort((a, b) => (b.container.items?.length || 0) - (a.container.items?.length || 0)).map(m => ({
        key: m.key, dot: m.color, square: true, title: m.label, sub: m.detail, right: `${Math.round(m.x)}, ${Math.round(m.z)}`, onClick: () => select(m), active: m === selected,
      }))} empty="Nenhum container com esses filtros nesta dimensão." />
    </>
  );
}

function VillagersPanel({ data, loading, jump, go, dim }) {
  const V = data.villagers;
  const crowds = useMemo(() => (V ? villagerCrowds(V.villagers.filter(v => /villager/.test(v.type))) : []), [V]);
  if (!V) return loading.villagers ? <Waiting text="Lendo aldeões e vilas…" /> : null;
  const villagers = V.villagers.filter(v => /villager/.test(v.type) && v.dimension === dim);
  const profs = {};
  for (const v of villagers) if (!v.baby) profs[profKey(v)] = (profs[profKey(v)] || 0) + 1;
  const unemployed = villagers.filter(v => !v.baby && UNEMPLOYED.has(profKey(v))).length;
  const villages = V.villages;
  return (
    <>
      <Stats items={[
        ['aldeões aqui', fmt(villagers.length), 'gold'],
        ['desempregados', fmt(unemployed), 'orange'],
        ['bebês', fmt(villagers.filter(v => v.baby).length), 'blue'],
      ]} />
      <button type="button" className="link-btn side-link" onClick={() => go('items', { tab: 'trades' })}><BookOpen size={13} /> Livros à venda e onde ganhar esmeraldas <ChevronRight size={13} /></button>
      <h4>Profissões</h4>
      <BarList rows={Object.entries(profs).sort((a, b) => b[1] - a[1]).map(([p, n]) => ({ key: p, label: PROFESSION[p] || p, value: n, color: UNEMPLOYED.has(p) || p === 'nitwit' ? 'var(--faint)' : 'var(--gold)' }))} limit={6} format={fmt} empty="Nenhum aldeão adulto nesta dimensão" />
      <h4>Aglomerações <span className="muted">{crowds.length}</span></h4>
      <List rows={crowds.map((h, i) => ({
        key: i, icon: <MobIcon id="minecraft:villager_v2" size={20} />, title: `${fmt(h.count)} aldeões`, right: DIM_LABEL[h.dimension],
        sub: h.profs.slice(0, 3).map(([p, n]) => `${n} ${(PROFESSION[p] || p).toLowerCase()}`).join(' · '),
        onClick: () => jump(h.dimension, h.center[0], h.center[2], null, `${h.count} aldeões`),
      }))} empty="Nenhum grupo de 6+ aldeões em 3×3 chunks." />
      <h4>Vilas <span className="muted">{villages.length}</span></h4>
      <List rows={villages.filter(v => v.bounds).map(v => {
        const beds = v.pointsOfInterest?.villager || 0;
        const d = villageDim(v);
        const status = v.raid ? 'invasão!' : beds < (v.dwellers ?? 0) ? 'faltam camas' : (v.dwellers ?? 0) === 0 ? 'abandonada' : null;
        return {
          key: v.id, dot: '#f2c14e', title: `Vila em ${fmt(Math.round((v.bounds.min[0] + v.bounds.max[0]) / 2))}, ${fmt(Math.round((v.bounds.min[2] + v.bounds.max[2]) / 2))}`,
          sub: `${fmt(v.dwellers ?? 0)} moradores · ${fmt(beds)} camas${status ? ` · ${status}` : ''}`,
          onClick: () => jump(d, (v.bounds.min[0] + v.bounds.max[0]) / 2, (v.bounds.min[2] + v.bounds.max[2]) / 2, { layer: 'villages', key: v.id }),
        };
      })} empty="Nenhuma vila registrada." />
    </>
  );
}

function PortalsPanel({ data, jump, sel }) {
  const P = data.portals;
  if (!P) return <Waiting text="Lendo portais…" />;
  const { portals, links } = P;
  if (!portals.length) return <p className="muted small">Nenhum portal do Nether registrado neste mundo.</p>;
  const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  const linked = links.filter(l => l.dimension === 'overworld' && l.to != null);
  const pairs = [];
  for (let i = 0; i < linked.length; i++) {
    for (let j = i + 1; j < linked.length; j++) {
      const a = portals[linked[i].from], b = portals[linked[j].from];
      const na = portals[linked[i].to], nb = portals[linked[j].to];
      if (na === nb) continue;
      const over = flat(a.position, b.position), nether = flat(na.position, nb.position);
      if (over >= 64) pairs.push({ a, b, over, nether, saved: over - nether });
    }
  }
  pairs.sort((x, y) => y.saved - x.saved);
  const sorted = [...links].sort((a, b) => (a.dimension === b.dimension ? 0 : a.dimension === 'overworld' ? -1 : 1));
  return (
    <>
      <Stats items={[
        ['no Overworld', fmt(portals.filter(p => p.dimension === 'overworld').length), 'green'],
        ['no Nether', fmt(portals.filter(p => p.dimension === 'nether').length), 'red'],
        ['ida e volta', fmt(links.filter(l => l.twoWay).length), 'teal'],
      ]} />
      <Note>Aproximação da regra do jogo: o destino é a coordenada dividida por 8 (indo para o Nether) ou multiplicada por 8 (voltando), e o jogo usa o portal existente mais próximo, num raio de cerca de 16 blocos no Nether e 128 no Overworld. A altura também conta, então um portal muito acima ou abaixo pode mudar o resultado. A cor do marcador mostra a situação: verde ida e volta, vermelho volta cai em outro portal, amarelo o jogo cria um portal novo.</Note>
      <h4>Para onde cada portal leva</h4>
      <List rows={sorted.map(l => {
        const from = portals[l.from], to = l.to != null ? portals[l.to] : null;
        const st = portalStatus(l);
        return {
          key: `${l.dimension}:${l.from}`, dot: PORTAL_STATUS[st].color, active: sel === `portals:${from.index}`,
          title: <>{xz(from.position)} <small className="muted">{DIM_LABEL[from.dimension]}</small></>,
          sub: to ? `→ ${xz(to.position)} · ${PORTAL_STATUS[st].label}` : `→ ${PORTAL_STATUS[st].label}`,
          onClick: () => jump(from.dimension, from.position[0], from.position[2], { layer: 'portals', key: String(from.index) }),
        };
      })} />
      <h4>Atalhos pelo Nether <span className="muted">{pairs.length}</span></h4>
      <List rows={pairs.slice(0, 50).map((p, i) => ({
        key: i, dot: DIM_COLOR.nether, title: `${xz(p.a.position)} ↔ ${xz(p.b.position)}`,
        sub: `${fmt(Math.round(p.over))} blocos a pé · ${fmt(Math.round(p.nether))} pelo Nether`, right: `−${Math.round(100 * (1 - p.nether / p.over))}%`,
        onClick: () => jump('overworld', p.a.position[0], p.a.position[2], { layer: 'portals', key: String(p.a.index) }),
      }))} empty="É preciso ter dois portais do Overworld ligados a portais diferentes no Nether." />
    </>
  );
}

function MobsPanel({ data, loading, dim, markers, mfilter, setMfilter, select, selected }) {
  const E = data.entities;
  const inDim = useMemo(() => (E || []).filter(e => e.dimension === dim), [E, dim]);
  if (!E) return loading.mobs ? <Waiting text="Carregando entidades…" /> : null;
  const cat = MOB_CATS.find(c => c.value === mfilter.cat) || MOB_CATS[0];
  const byType = {};
  for (const e of inDim) if (cat.test(e)) byType[e.type] = (byType[e.type] || 0) + 1;
  const list = markers.filter(m => m.layer === 'mobs');
  const orphans = E.filter(e => e.orphan).length;
  return (
    <>
      <div className="side-sort wrap">
        {MOB_CATS.map(c => <button type="button" key={c.value} className={`chip${mfilter.cat === c.value ? ' chip-active' : ''}`} onClick={() => setMfilter({ cat: c.value, type: '' })}>{c.label} <small>{fmtCompact(inDim.filter(c.test).length)}</small></button>)}
      </div>
      <h4>Por tipo {mfilter.type && <button type="button" className="chip chip-active" onClick={() => setMfilter({ ...mfilter, type: '' })}>{mobName(mfilter.type)} <X size={11} /></button>}</h4>
      <BarList
        rows={Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ key: t, label: mobName(t), value: n, icon: <MobIcon id={t} size={20} />, color: t === mfilter.type ? 'var(--gold)' : 'var(--purple)', active: t === mfilter.type }))}
        limit={8}
        format={fmt}
        onSelect={r => setMfilter({ ...mfilter, type: mfilter.type === r.key ? '' : r.key })}
        empty="Nenhuma entidade nesta categoria"
      />
      <h4>No mapa <span className="muted">{fmt(list.length)}</span></h4>
      <List rows={list.map(m => ({
        key: m.key, icon: <MobIcon id={m.entity.type} size={20} />, title: m.label, sub: m.entity.customName ? m.detail : undefined,
        right: `${Math.round(m.x)}, ${Math.round(m.z)}`, onClick: () => select(m), active: m === selected,
      }))} limit={150} empty="Nenhuma entidade com esses filtros nesta dimensão." />
      {orphans > 0 && <p className="muted small">{fmt(orphans)} entidades órfãs (nenhum chunk as referencia; o jogo não as carrega) não aparecem no mapa.</p>}
    </>
  );
}

function LagPanel({ data, loading, dim, jump, sel }) {
  const L = data.lag;
  if (!L) return loading.farms || loading.heavy ? <Waiting text="Analisando cada chunk…" sub="Na primeira vez o terreno inteiro é varrido." /> : null;
  const T = L.totals[dim];
  const heavy = L.heavy.filter(r => r.dimension === dim);
  const farms = L.farms.filter(f => f.dimension === dim);
  const piles = L.groundItems.filter(r => r.dimension === dim);
  const go = (r, layer) => jump(dim, r.center[0], r.center[1], { layer, key: layer === 'farms' ? `${r.chunk}:${r.type}` : `${r.x}:${r.z}` });
  return (
    <>
      {T ? (
        <Stats items={[
          ['entidades', fmtCompact(T.entities), 'purple'],
          ['itens no chão', fmtCompact(T.items), 'orange'],
          ['funis', fmtCompact(T.hoppers), 'gold'],
          ['blocos ativos', fmtCompact(T.ticking), 'blue'],
          ['orbes de XP', fmtCompact(T.xpOrbs), 'green'],
          ['ticks pendentes', fmtCompact(T.pendingTicks), 'teal'],
        ]} />
      ) : <p className="muted small">Nenhum chunk com dados nesta dimensão.</p>}
      <Note>Estimativa. O “peso” de cada chunk é uma soma relativa de entidades, itens no chão, funis, blocos que processam ticks e ticks pendentes, para comparar lugares do mesmo mundo; não é uma medida de FPS ou TPS. Farms são um tipo de mob concentrado num espaço de 3×3 chunks.</Note>
      <h4>Farms prováveis <span className="muted">{farms.length}</span></h4>
      <List rows={farms.map(f => ({
        key: `${f.chunk}:${f.type}`, icon: <MobIcon id={f.type} size={20} />, title: farmTitle(f), sub: `${fmt(f.count)}× ${mobName(f.type)}`,
        active: sel === `farms:${f.chunk}:${f.type}`, onClick: () => go(f, 'farms'),
      }))} empty="Nenhuma concentração de mobs." />
      <h4>Chunks mais pesados <span className="muted">{heavy.length}</span></h4>
      <List rows={heavy.map(r => ({
        key: `${r.x}:${r.z}`, dot: '#ff6b6b', square: true, title: `Chunk ${r.x}, ${r.z}`, right: fmt(r.lag), active: sel === `heavy:${r.x}:${r.z}`,
        sub: [r.entities && `${fmt(r.entities)} entidades`, r.items && `${fmt(r.items)} itens`, r.hoppers && `${fmt(r.hoppers)} funis`].filter(Boolean).join(' · ') || `${fmt(r.pendingTicks)} ticks pendentes`,
        onClick: () => go(r, 'heavy'),
      }))} limit={30} empty="Nenhum chunk com atividade." />
      {piles.length > 0 && (
        <>
          <h4>Itens acumulados no chão <span className="muted">{piles.length}</span></h4>
          <List rows={piles.map(r => ({ key: `${r.x}:${r.z}`, icon: <ItemIcon id="minecraft:chest" size={18} />, title: `Chunk ${r.x}, ${r.z}`, right: `${fmt(r.items)} itens`, onClick: () => go(r, 'heavy') }))} />
        </>
      )}
    </>
  );
}

function BiomesPanel({ biomes, hoverBiome, biome, setBiome }) {
  if (!biomes) return <Waiting text="Lendo o bioma de cada coluna…" sub="Usa o terreno já renderizado; alguns segundos na primeira vez." />;
  if (biomes.empty) return <p className="muted small">Nenhum bioma registrado nesta dimensão.</p>;
  const total = biomes.counts.reduce((a, b) => a + b, 0);
  const rows = biomes.names.map((n, i) => ({ n, c: biomes.counts[i] })).filter(r => r.c).sort((a, b) => b.c - a.c);
  return (
    <>
      <p className="muted small">Bioma do bloco do topo de cada coluna. Clique num bioma para destacá-lo no mapa.</p>
      {hoverBiome && <div className="biome-hover"><span className="swatch" style={{ background: biomeColor(hoverBiome) }} /> {biomeLabel(hoverBiome)}</div>}
      <div className="stacked">{rows.map(r => <span key={r.n} style={{ flex: r.c, background: biomeColor(r.n) }} title={biomeLabel(r.n)} />)}</div>
      {biome && <button type="button" className="chip chip-active" onClick={() => setBiome('')}>{biomeLabel(biome)} <X size={11} /></button>}
      <List rows={rows.map(r => ({
        key: r.n, icon: <span className="swatch" style={{ background: biomeColor(r.n) }} />, title: biomeLabel(r.n), active: biome === r.n,
        right: `${(100 * r.c / total).toFixed(1)}%`, onClick: () => setBiome(biome === r.n ? '' : r.n),
      }))} />
    </>
  );
}

const ITEM_QUICK = ['diamond', 'netherite', 'elytra', 'totem', 'shulker_box', 'enchanted_book', 'beacon|nether_star'];
const BLOCK_QUICK = ['diamond_ore', 'ancient_debris', 'spawner|mob_spawner', 'beacon', 'end_portal_frame', 'enchanting_table', 'bed'];

function SearchPanel({ search, setSearch, searchState, hits, dim, jump, select, selected, markers }) {
  const [text, setText] = useState(search.q);
  const run = q => setSearch({ ...search, q: q.trim() });
  const quick = search.mode === 'blocks' ? BLOCK_QUICK : ITEM_QUICK;
  const here = markers.filter(m => m.layer === 'hits');
  const byDim = {};
  for (const h of hits || []) if (h.position) byDim[h.dimension] = (byDim[h.dimension] || 0) + 1;
  const noPos = (hits || []).filter(h => !h.position);
  return (
    <>
      <Tabs label="Buscar" value={search.mode} onChange={mode => setSearch({ mode, q: '' })} items={[{ value: 'items', label: 'Itens' }, { value: 'blocks', label: 'Blocos' }]} />
      <form className="search search-sm" role="search" onSubmit={e => { e.preventDefault(); run(text); }}>
        <Search size={14} aria-hidden="true" />
        <input value={text} onChange={e => setText(e.target.value)} placeholder={search.mode === 'blocks' ? 'Bloco ou regex (diamond_ore, _bed$)' : 'Item (diamante, elytra|totem)'} aria-label="Buscar no mapa" spellCheck={false} />
        {text && <button type="button" className="icon-x" onClick={() => { setText(''); run(''); }} aria-label="Limpar"><X size={13} /></button>}
      </form>
      <div className="side-sort wrap">
        {quick.map(k => <button type="button" key={k} className={`chip${search.q === k ? ' chip-active' : ''}`} onClick={() => { setText(k); run(k); }}>{prettyName(k.split('|')[0])}</button>)}
      </div>
      {searchState.loading && <Waiting text={search.mode === 'blocks' ? 'Varrendo todos os subchunks…' : 'Vasculhando o mundo…'} sub={search.mode === 'blocks' ? 'Decodifica o mundo inteiro: alguns segundos.' : undefined} />}
      {searchState.error && <p className="muted small">{searchState.error.message}</p>}
      {hits && search.q && (
        <>
          <p className="small">
            {fmt(hits.length)} {hits.length === 1 ? 'resultado' : 'resultados'}{searchState.data?.total > hits.length ? ` (de ${fmt(searchState.data.total)}; mostrando os primeiros)` : ''}
          </p>
          {sortDims(Object.keys(byDim)).filter(d => d !== dim).map(d => (
            <button type="button" key={d} className="link-btn side-link" onClick={() => { const h = hits.find(x => x.dimension === d && x.position); jump(d, h.position[0], h.position[2]); }}>
              <Dot c={DIM_COLOR[d]} /> {fmt(byDim[d])} no {DIM_LABEL[d]} <ChevronRight size={13} />
            </button>
          ))}
          <List rows={here.map(m => ({
            key: m.key, icon: m.hit.block ? <span className="swatch" /> : <ItemIcon id={m.hit.item} size={20} />, title: m.label, sub: m.detail,
            right: `${Math.round(m.x)}, ${Math.round(m.z)}`, onClick: () => select(m), active: m === selected,
          }))} limit={150} empty={`Nada no ${DIM_LABEL[dim]}.`} />
          {noPos.length > 0 && <p className="muted small">{fmt(noPos.length)} em ender chests (sem posição no mapa).</p>}
        </>
      )}
    </>
  );
}

/** Ready-made combinations of layers + overlay + side panel. */
export const VIEWS = [
  { id: 'all', label: 'Tudo', icon: Layers, layers: ['players', 'spawns', 'deaths', 'world', 'portals', 'villages', 'pets', 'containers'], Panel: AllPanel },
  { id: 'bases', label: 'Bases', icon: Castle, layers: ['bases', 'players', 'spawns'], overlay: 'build', Panel: BasesPanel },
  { id: 'containers', label: 'Baús', icon: Archive, layers: ['containers'], Panel: ContainersPanel },
  { id: 'villagers', label: 'Vilas e aldeões', icon: Store, layers: ['villages', 'villagers'], Panel: VillagersPanel },
  { id: 'portals', label: 'Portais', icon: Waypoints, layers: ['portals'], Panel: PortalsPanel },
  { id: 'mobs', label: 'Mobs', icon: PawPrint, layers: ['mobs'], Panel: MobsPanel },
  { id: 'lag', label: 'Lag e farms', icon: Gauge, layers: ['farms', 'heavy'], overlay: 'lag', Panel: LagPanel },
  { id: 'biomes', label: 'Biomas', icon: Trees, layers: ['players'], overlay: 'biomes', Panel: BiomesPanel },
  { id: 'search', label: 'Busca', icon: Search, layers: ['hits', 'players'], Panel: SearchPanel },
];
export const VIEW = Object.fromEntries(VIEWS.map(v => [v.id, v]));

/** Search results → map hits ({dimension, position, label, detail, …}). */
export function useSearchHits(search, enabled, names) {
  const totals = useQuery('items', undefined, { enabled: enabled && search.mode === 'items' });
  const itemQ = enabled && search.mode === 'items' && search.q && totals.data ? workerQuery(search.q, totals.data) : null;
  const items = useQuery('findItem', { q: itemQ }, { enabled: !!itemQ });
  const blocks = useQuery('findBlock', { q: search.q, limit: 3000 }, { enabled: enabled && search.mode === 'blocks' && !!search.q });
  const state = search.mode === 'blocks' ? blocks : (totals.loading ? { loading: true } : items);
  const hits = useMemo(() => {
    if (!enabled || !search.q) return null;
    if (search.mode === 'blocks') {
      return blocks.data?.hits.map(h => {
        const id = h.block.split('[')[0];
        return { dimension: h.dimension, position: [h.x, h.y, h.z], block: id, label: prettyName(id), detail: `Y ${h.y}` };
      }) || null;
    }
    return items.data?.hits.map(h => ({
      dimension: h.dimension, position: h.position, item: h.item, label: prettyName(h.item),
      detail: `${fmt(h.count)}× · ${whereLabel(h.where, names)}`, where: whereLabel(h.where, names),
    })) || null;
  }, [enabled, search.mode, search.q, blocks.data, items.data, names]);
  return { hits, state };
}
