import { useState } from 'react';
import { Backpack, Search, MapPin } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, BarList, SearchInput, Empty, Badge } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { fmt, prettyName, DIM_LABEL, DIM_COLOR, pos, ENCHANT_LABEL, roman } from '../format.js';

const QUICK = ['diamond', 'netherite', 'elytra', 'totem', 'enchanted_book', 'shulker_box', 'emerald', 'trident', 'beacon|nether_star', 'golden_apple'];

function where(w) {
  return w.replace(/^player ~local_player|^player host/, 'Host')
    .replace(/^player player_server_(\w{8})[\w-]*/, 'Jogador $1')
    .replace(' inventory', ' · inventário').replace(' ender chest', ' · ender chest')
    .replace(/^([a-z0-9_]+:[a-z0-9_.]+)/, id => prettyName(id)).replace(/§./g, '');
}

export default function Items() {
  const totals = useQuery('items');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(null);
  const result = useQuery('findItem', { q: query }, { enabled: !!query });
  const run = v => v && setQuery(v.trim());

  return (
    <div className="page">
      <PageHeader title="Itens" subtitle="Onde está cada item do mundo: inventários, ender chests, baús, shulkers dentro de baús, molduras, mobs e itens no chão." />
      <Panel>
        <SearchInput value={q} onChange={setQ} onSubmit={run} placeholder="Procurar item (nome ou regex: diamond, netherite_, elytra|totem)…" autoFocus />
        <div className="quick">
          {QUICK.map(k => <button type="button" key={k} className="chip" onClick={() => { setQ(k); run(k); }}><ItemIcon id={`minecraft:${k.split('|')[0]}`} size={18} /> {k.replace('|', ' / ')}</button>)}
        </div>
      </Panel>

      {query && (
        <Panel title={`Resultado para “${query}”`} icon={Search}>
          <Async state={result} loadingText="Vasculhando o mundo…">
            {r => (r.hits.length === 0 ? <Empty text="Nenhum item encontrado" /> : (
              <>
                <div className="totals-row">
                  {Object.entries(r.totals).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                    <div key={id} className="total-chip"><ItemIcon id={id} size={30} /><div><strong>{fmt(n)}</strong><small>{prettyName(id)}</small></div></div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th /><th>Item</th><th>Qtd.</th><th>Onde</th><th>Local</th></tr></thead>
                    <tbody>
                      {r.hits.slice(0, 500).map((h, i) => (
                        <tr key={i}>
                          <td className="cell-icon"><ItemIcon id={h.item} size={28} enchanted={!!h.enchantments} /></td>
                          <td>
                            <strong>{h.customName ? <McText text={h.customName} /> : prettyName(h.item)}</strong>
                            {h.enchantments && <div className="row-badges">{h.enchantments.map(e => <Badge key={e.id} tone="purple">{ENCHANT_LABEL[e.name] || e.name} {roman(e.level)}</Badge>)}</div>}
                          </td>
                          <td>{fmt(h.count)}</td>
                          <td>{where(h.where)}</td>
                          <td>{h.position ? <><span className="dot" style={{ background: DIM_COLOR[h.dimension] }} /> {DIM_LABEL[h.dimension] || h.dimension} <code><MapPin size={11} /> {pos(h.position)}</code></> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ))}
          </Async>
        </Panel>
      )}

      <Panel title="Itens guardados no mundo" icon={Backpack}>
        <Async state={totals} loadingText="Somando itens…">
          {t => {
            const rows = Object.entries(t).filter(([id]) => id).map(([id, n]) => ({ key: id, label: prettyName(id), value: n, icon: <ItemIcon id={id} size={22} />, color: 'var(--teal)' }));
            return rows.length ? <BarList rows={rows} limit={30} format={fmt} onSelect={r => { setQ(r.key.replace(/^minecraft:/, '')); run(`^${r.key}$`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /> : <Empty />;
          }}
        </Async>
      </Panel>
    </div>
  );
}
