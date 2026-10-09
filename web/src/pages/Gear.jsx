import { Wrench, ShieldAlert, BookOpen, BookX, Info } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, StatCard, CoordLink, Empty, Badge } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText, { stripCodes } from '../components/McText.jsx';
import { fmt, prettyName, ENCHANT_LABEL, roman, playerNames } from '../format.js';
import { CONTAINER_LABEL } from '../containers.js';

// Highest level each enchantment reaches in survival.
const MAX_LEVEL = {
  protection: 4, fire_protection: 4, feather_falling: 4, blast_protection: 4, projectile_protection: 4, thorns: 3, respiration: 3,
  depth_strider: 3, aqua_affinity: 1, sharpness: 5, smite: 5, bane_of_arthropods: 5, knockback: 2, fire_aspect: 2, looting: 3,
  efficiency: 5, silk_touch: 1, unbreaking: 3, fortune: 3, power: 5, punch: 2, flame: 1, infinity: 1, luck_of_the_sea: 3, lure: 3,
  frost_walker: 2, mending: 1, binding_curse: 1, vanishing_curse: 1, impaling: 5, riptide: 3, loyalty: 3, channeling: 1, multishot: 1,
  piercing: 4, quick_charge: 3, soul_speed: 3, swift_sneak: 3, wind_burst: 3, density: 5, breach: 4,
};
const enchName = n => ENCHANT_LABEL[n] || n.replace(/_/g, ' ');

/** "player host inventory > Caixa" → "Host · inventário > Caixa"; block entity ids become pt-BR labels. */
function whereLabel(where, names) {
  const [head, ...rest] = where.split(' > ');
  let label = head;
  const m = head.match(/^player (\S+) (inventory|ender chest)$/);
  if (m) {
    const name = m[1] === 'host' ? 'Host' : names.get(m[1]) || m[1];
    label = `${name} · ${m[2] === 'inventory' ? 'inventário' : 'baú do End'}`;
  } else {
    const b = head.match(/^(\w+)(?: "(.*)")?$/);
    if (b) label = b[2] ? `${stripCodes(b[2])} (${CONTAINER_LABEL[b[1]] || b[1]})` : CONTAINER_LABEL[b[1]] || b[1];
  }
  return [label, ...rest.map(stripCodes)].join(' > ');
}

function ItemName({ it }) {
  return (
    <span className="item-cell">
      <ItemIcon id={it.item} size={26} enchanted={!!it.enchantments?.length} />
      <span>
        <strong>{it.customName ? <McText text={it.customName} /> : prettyName(it.item)}</strong>
        {it.customName && <small className="muted"> {prettyName(it.item)}</small>}
      </span>
    </span>
  );
}

function Place({ r, names, go, label }) {
  return (
    <>
      <td className="where-cell">{whereLabel(r.where, names)}</td>
      <td className="nowrap">{r.position ? <CoordLink go={go} dim={r.dimension} position={r.position} label={label} /> : <span className="muted">com o jogador</span>}</td>
    </>
  );
}

export default function Gear({ go }) {
  const state = useQuery('gear');
  const players = useQuery('players');
  const names = playerNames(players.data);
  return (
    <div className="page">
      <PageHeader title="Equipamento" subtitle="Ferramentas e armaduras quase quebrando, equipamento bom sem Remendo ou Inquebrável e os livros encantados que existem no mundo." />
      <Async state={state} loadingText="Conferindo durabilidade e encantamentos…">
        {G => {
          const books = {};
          for (const b of G.books) (books[b.name] ||= []).push(b);
          const known = Object.keys(MAX_LEVEL);
          const missingBooks = known.filter(n => !books[n] && !/curse/.test(n));
          const maxed = Object.entries(books).filter(([n, list]) => list.some(b => b.level >= (MAX_LEVEL[n] || 1))).length;
          return (
            <>
              <div className="stats-grid">
                <StatCard icon={Wrench} label="Quase quebrando" value={fmt(G.worn.length)} sub="25% ou menos de durabilidade" tone="red" />
                <StatCard icon={ShieldAlert} label="Sem Remendo/Inquebrável" value={fmt(G.missing.length)} sub="diamante, netherite, élitros, tridentes…" tone="gold" />
                <StatCard icon={BookOpen} label="Encantamentos em livro" value={`${Object.keys(books).length}`} sub={`${maxed} com o nível máximo`} tone="purple" />
              </div>
              <div className="note">
                <Info size={15} />
                <span>Inclui jogadores, baús do End e containers (com shulkers dentro). Equipamento de mobs e itens no chão ficam de fora.</span>
              </div>
              <Panel title="Quase quebrando" icon={Wrench} actions={<small className="muted">do mais gasto ao menos gasto</small>}>
                {G.worn.length === 0 ? <Empty text="Nenhum item com pouca durabilidade" /> : (
                  <div className="table-wrap short">
                    <table className="table">
                      <thead><tr><th>Item</th><th>Durabilidade</th><th>Onde</th><th>Coordenadas</th></tr></thead>
                      <tbody>
                        {G.worn.map((r, i) => (
                          <tr key={i}>
                            <td><ItemName it={r} /></td>
                            <td>
                              <span className="fill-meter" title={`${r.left} de ${r.max}`}>
                                <span className="fill-track"><span style={{ width: `${Math.max(2, r.percent)}%`, background: r.percent <= 10 ? 'var(--red)' : 'var(--orange)' }} /></span>
                                <small>{fmt(r.left)}/{fmt(r.max)} · {r.percent}%</small>
                              </span>
                            </td>
                            <Place r={r} names={names} go={go} label={prettyName(r.item)} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <Panel title="Equipamento sem Remendo ou Inquebrável" icon={ShieldAlert}>
                {G.missing.length === 0 ? <Empty text="Todo o equipamento bom já tem Remendo e Inquebrável" /> : (
                  <div className="table-wrap short">
                    <table className="table">
                      <thead><tr><th>Item</th><th>Falta</th><th>Encantamentos</th><th>Onde</th><th>Coordenadas</th></tr></thead>
                      <tbody>
                        {G.missing.map((r, i) => (
                          <tr key={i}>
                            <td><ItemName it={r} /></td>
                            <td><div className="badges">{r.lacks.map(l => <Badge key={l} tone="gold">{enchName(l)}</Badge>)}</div></td>
                            <td className="ench-cell">{r.enchantments?.length ? r.enchantments.map(e => `${enchName(e.name)} ${roman(e.level)}`).join(', ') : <span className="muted">nenhum</span>}</td>
                            <Place r={r} names={names} go={go} label={prettyName(r.item)} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <div className="grid-2">
                <Panel title="Livros encantados disponíveis" icon={BookOpen}>
                  {G.books.length === 0 ? <Empty text="Nenhum livro encantado no mundo" /> : (
                    <div className="book-list">
                      {Object.entries(books).sort((a, b) => enchName(a[0]).localeCompare(enchName(b[0]), 'pt-BR')).map(([n, list]) => {
                        const max = MAX_LEVEL[n] || 1;
                        return (
                          <div key={n} className="book-row">
                            <ItemIcon id="minecraft:enchanted_book" size={24} enchanted />
                            <strong className={/curse/.test(n) ? 'curse-text' : undefined}>{enchName(n)}</strong>
                            <div className="book-levels">
                              {list.map(b => (
                                <span key={b.level} className={`lvl${b.level >= max ? ' max' : ''}`} title={b.where.map(w => whereLabel(w.where, names)).join('\n')}>
                                  {roman(b.level)}{b.count > 1 && <small>×{b.count}</small>}
                                </span>
                              ))}
                              {list.every(b => b.level < max) && <small className="muted">máx. {roman(max)}</small>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
                <Panel title="Sem nenhum livro" icon={BookX} actions={<small className="muted">{missingBooks.length} encantamentos</small>}>
                  {missingBooks.length === 0 ? <Empty text="Existe pelo menos um livro de cada encantamento" /> : (
                    <div className="rules">
                      {missingBooks.sort((a, b) => enchName(a).localeCompare(enchName(b), 'pt-BR')).map(n => <span key={n} className="rule off" title={n}>{enchName(n)}</span>)}
                    </div>
                  )}
                </Panel>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
