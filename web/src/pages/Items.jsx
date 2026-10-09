import { useEffect, useRef, useState } from 'react';
import { Backpack, Search } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, BarList, SearchInput, Empty, Badge, CoordLink } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { fmt, prettyName, DIM_LABEL, DIM_COLOR, ENCHANT_LABEL, roman, playerNames } from '../format.js';

const QUICK = ['diamond', 'netherite', 'elytra', 'totem', 'enchanted_book', 'shulker_box', 'emerald', 'trident', 'beacon|nether_star', 'golden_apple'];
const SHOWN = 500;

/** "player player_server_… inventory > shulker_box" → "Jogador 2 · inventário › Shulker Box". */
function where(w, names) {
  return w.replace(/^player (\S+) (inventory|ender chest)/, (_, who, place) => {
    const name = who === 'host' || who === '~local_player' ? 'Host' : names.get(who) || `Jogador ${who.replace('player_server_', '').slice(0, 8)}`;
    return `${name} · ${place === 'inventory' ? 'inventário' : 'ender chest'}`;
  })
    .replace(/^([a-z0-9_]+:[a-z0-9_.]+)/, id => prettyName(id))
    .replace(/ > /g, ' › ')
    .replace(/§./g, '');
}

export default function Items({ nav, go }) {
  const totals = useQuery('items');
  const players = useQuery('players');
  const [q, setQ] = useState(nav?.q || '');
  const [query, setQuery] = useState(nav?.q || null);
  const result = useQuery('findItem', { q: query }, { enabled: !!query });
  const resultsRef = useRef();
  const run = v => v?.trim() && setQuery(v.trim());
  const names = playerNames(players.data);

  // The sidebar finder navigates here with a new query, also while this page is already open.
  useEffect(() => { if (nav?.q) { setQ(nav.q); setQuery(nav.q); } }, [nav]);
  // Bring the results into view (the page scrolls inside .content, not window).
  useEffect(() => { if (query) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [query]);

  return (
    <div className="page">
      <PageHeader title="Itens" subtitle="Onde está cada item do mundo: inventários, ender chests, baús, shulkers dentro de baús, molduras, mobs e itens no chão." />
      <Panel>
        <SearchInput value={q} onChange={setQ} onSubmit={run} label="Procurar item" placeholder="Procurar item (ex.: diamond, netherite_, elytra|totem)…" autoFocus={!nav?.q} />
        <div className="quick">
          <span className="quick-label">Atalhos:</span>
          {QUICK.map(k => <button type="button" key={k} className={`chip${query === k ? ' chip-active' : ''}`} onClick={() => { setQ(k); run(k); }}><ItemIcon id={`minecraft:${k.split('|')[0]}`} size={18} /> {prettyName(k.split('|')[0])}{k.includes('|') ? ` / ${prettyName(k.split('|')[1])}` : ''}</button>)}
        </div>
      </Panel>

      {query && (
        <div ref={resultsRef} className="scroll-anchor">
          <Panel title={`Resultado para “${query}”`} icon={Search} actions={<button type="button" className="link-btn" onClick={() => { setQuery(null); setQ(''); }}>Limpar</button>}>
            <Async state={result} loadingText="Vasculhando o mundo…">
              {r => (r.hits.length === 0 ? <Empty text={`Nenhum item corresponde a “${query}”`} /> : (
                <>
                  <div className="totals-row">
                    {Object.entries(r.totals).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                      <div key={id} className="total-chip"><ItemIcon id={id} size={30} /><div><strong>{fmt(n)}</strong><small>{prettyName(id)}</small></div></div>
                    ))}
                  </div>
                  <p className="muted small">{fmt(r.hits.length)} {r.hits.length === 1 ? 'lugar' : 'lugares'}{r.hits.length > SHOWN ? ` · mostrando os primeiros ${fmt(SHOWN)}` : ''}</p>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th /><th>Item</th><th className="num">Qtd.</th><th>Onde</th><th>Local</th></tr></thead>
                      <tbody>
                        {r.hits.slice(0, SHOWN).map((h, i) => (
                          <tr key={i}>
                            <td className="cell-icon"><ItemIcon id={h.item} size={28} enchanted={!!h.enchantments} /></td>
                            <td>
                              <strong>{h.customName ? <McText text={h.customName} /> : prettyName(h.item)}</strong>
                              {h.enchantments && <div className="row-badges">{h.enchantments.map(e => <Badge key={e.id} tone="purple">{ENCHANT_LABEL[e.name] || e.name} {roman(e.level)}</Badge>)}</div>}
                            </td>
                            <td className="num">{fmt(h.count)}</td>
                            <td>{where(h.where, names)}</td>
                            <td className="nowrap">{h.position ? <><span className="dot" style={{ background: DIM_COLOR[h.dimension] }} /> {DIM_LABEL[h.dimension] || h.dimension} <CoordLink go={go} dim={h.dimension} position={h.position} label={prettyName(h.item)} /></> : <span className="muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ))}
            </Async>
          </Panel>
        </div>
      )}

      <Panel title="Itens guardados no mundo" icon={Backpack} actions={<small className="muted">Clique em um item para ver onde ele está</small>}>
        <Async state={totals} loadingText="Somando itens…">
          {t => {
            const rows = Object.entries(t).filter(([id]) => id).map(([id, n]) => ({ key: id, label: prettyName(id), value: n, icon: <ItemIcon id={id} size={22} />, color: 'var(--teal)', active: query === `^${id}$` }));
            return rows.length ? <BarList rows={rows} limit={30} format={fmt} onSelect={r => { setQ(r.key.replace(/^minecraft:/, '')); run(`^${r.key}$`); }} /> : <Empty />;
          }}
        </Async>
      </Panel>
    </div>
  );
}
