import { useEffect, useMemo, useRef, useState } from 'react';
import { Backpack, Search, Map as MapIcon } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, BarList, SearchInput, Empty, Badge, CoordLink, useSort } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { fmt, prettyName, DIM_LABEL, DIM_COLOR, ENCHANT_LABEL, roman, playerNames, hostOf, distance, fmtDistance, whereLabel as where, workerQuery } from '../format.js';

const QUICK = ['diamond', 'netherite', 'elytra', 'totem', 'enchanted_book', 'shulker_box', 'emerald', 'trident', 'beacon|nether_star', 'golden_apple'];
const SHOWN = 500;
/** Exact-id queries from the list ("^minecraft:iron_ingot$") read better as the item name. */
const queryLabel = q => (/^\^[a-z0-9_]+:[a-z0-9_]+\$$/.test(q) ? prettyName(q.slice(1, -1)) : q);

export default function Items({ go }) {
  const totals = useQuery('items');
  const players = useQuery('players');
  const [query, setQuery] = useHashParam('q', '');
  const [q, setQ] = useState(query);
  const effective = query ? workerQuery(query, totals.data) : null;
  const result = useQuery('findItem', { q: effective }, { enabled: !!effective && !totals.loading });
  const resultsRef = useRef();
  const run = v => { const t = v?.trim(); if (t) setQuery(t); };
  const names = playerNames(players.data);
  const host = hostOf(players.data);
  // Bring the results into view (the page scrolls inside .content, not window).
  useEffect(() => { if (query) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [query]);

  const hits = useMemo(() => (result.data?.hits || []).map(h => ({ ...h, dist: distance(host, h.dimension, h.position), name: prettyName(h.item) })), [result.data, host]);
  const [rows, th] = useSort(hits, { name: h => h.name, qty: h => h.count, where: h => where(h.where, names), dist: h => h.dist });

  return (
    <>
      <Panel>
        <SearchInput value={q} onChange={setQ} onSubmit={run} label="Procurar item" placeholder="Procurar item (ex.: diamante, espada, elytra|totem)…" autoFocus={!query} />
        <div className="quick">
          <span className="quick-label">Atalhos:</span>
          {QUICK.map(k => <button type="button" key={k} className={`chip${query === k ? ' chip-active' : ''}`} onClick={() => { setQ(k); run(k); }}><ItemIcon id={`minecraft:${k.split('|')[0]}`} size={18} /> {prettyName(k.split('|')[0])}{k.includes('|') ? ` / ${prettyName(k.split('|')[1])}` : ''}</button>)}
        </div>
      </Panel>

      {query && (
        <div ref={resultsRef} className="scroll-anchor">
          <Panel title={`Resultado para “${queryLabel(query)}”`} icon={Search} actions={<><button type="button" className="btn btn-sm" onClick={() => go('map', { view: 'search', q: query })}><MapIcon size={14} /> Ver no mapa</button><button type="button" className="link-btn" onClick={() => { setQuery(''); setQ(''); }}>Limpar</button></>}>
            <Async state={result.loading || totals.loading ? { loading: true } : result} loadingText="Vasculhando o mundo…">
              {r => (r.hits.length === 0 ? <Empty text={`Nenhum item corresponde a “${queryLabel(query)}”`} /> : (
                <>
                  <div className="totals-row">
                    {Object.entries(r.totals).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                      <div key={id} className="total-chip"><ItemIcon id={id} size={30} /><div><strong>{fmt(n)}</strong><small>{prettyName(id)}</small></div></div>
                    ))}
                  </div>
                  <p className="muted small">{fmt(r.hits.length)} {r.hits.length === 1 ? 'lugar' : 'lugares'}{r.hits.length > SHOWN ? ` · mostrando ${fmt(SHOWN)}` : ''}{host ? ' · distância medida a partir do Host' : ''}</p>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th />{th('name', 'Item')}{th('qty', 'Qtd.', { firstDesc: true, className: 'num' })}{th('where', 'Onde')}<th>Local</th>{th('dist', 'Distância', { className: 'num' })}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, SHOWN).map((h, i) => (
                          <tr key={i}>
                            <td className="cell-icon"><ItemIcon id={h.item} size={28} enchanted={!!h.enchantments} /></td>
                            <td>
                              <strong>{h.customName ? <McText text={h.customName} /> : h.name}</strong>
                              {h.enchantments && <div className="row-badges">{h.enchantments.map(e => <Badge key={e.id} tone="purple">{ENCHANT_LABEL[e.name] || e.name} {roman(e.level)}</Badge>)}</div>}
                            </td>
                            <td className="num">{fmt(h.count)}</td>
                            <td>{where(h.where, names)}</td>
                            <td className="nowrap">{h.position ? <><span className="dot" style={{ background: DIM_COLOR[h.dimension] }} /> {DIM_LABEL[h.dimension] || h.dimension} <CoordLink go={go} dim={h.dimension} position={h.position} label={h.name} /></> : <span className="muted">—</span>}</td>
                            <td className="num nowrap muted">{fmtDistance(h.dist)}</td>
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
            return rows.length ? <BarList rows={rows} limit={30} format={fmt} onSelect={r => { setQ(r.label); setQuery(`^${r.key}$`); }} /> : <Empty />;
          }}
        </Async>
      </Panel>
    </>
  );
}
