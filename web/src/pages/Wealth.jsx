import { Coins, Info, Users, Castle, Gem, Sparkles, Trash2 } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, BarList, StatCard, Empty, CoordLink } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { fmt, prettyName, mobName, playerNames, DIM_COLOR } from '../format.js';
import { CONTAINER_LABEL } from '../containers.js';
import { baseName } from '../map/layers.js';

const diamonds = v => `≈ ${fmt(v)}`;

/** "player ~local_player ender chest > Shulker" → "Baú do End de Host › Shulker". */
export function whereLabel(where, names) {
  const [head, ...path] = where.split(' > ');
  let label;
  const m = head.match(/^player (\S+) (inventory|ender chest)$/);
  if (m) {
    const who = m[1] === 'host' ? 'Host' : names.get(m[1]) || m[1];
    label = m[2] === 'inventory' ? `Inventário de ${who}` : `Baú do End de ${who}`;
  } else {
    const [id, ...rest] = head.split(' ');
    const name = rest.join(' ');
    label = (id.includes(':') ? mobName(id) : CONTAINER_LABEL[id] || id) + (name ? ` ${name}` : '');
  }
  return [label, ...path].join(' › ');
}

export default function Wealth({ go }) {
  const state = useQuery('wealth');
  const players = useQuery('players');
  const names = playerNames(players.data);
  return (
    <>
      <div className="note">
        <Info size={15} />
        <span>Estimativa em <b>diamantes</b>, não é um preço do jogo: um bloco de diamante vale 9, uma barra de netherite 5, élitros 25, uma estrela do Nether 20, ferramentas e armaduras de diamante pelo número de diamantes da receita, e cada nível de encantamento soma um pouco. Itens comuns (terra, pedra, comida) valem zero.</span>
      </div>
      <Async state={state} loadingText="Avaliando itens…" loadingSub="Soma inventários, baús do End e os containers de cada base.">
        {W => {
          const bases = W.bases.filter(b => b.value > 0);
          const inPlayers = W.players.reduce((a, p) => a + p.total, 0);
          const inBases = W.bases.reduce((a, b) => a + b.value, 0);
          return (
            <>
              <div className="stats-grid">
                <StatCard icon={Coins} label="Mundo inteiro" value={diamonds(W.world)} sub="diamantes em todos os itens guardados" tone="gold" />
                <StatCard icon={Users} label="Com os jogadores" value={diamonds(inPlayers)} sub="inventário, armadura e baú do End" tone="green" onClick={() => go('players')} action="Ver jogadores" />
                <StatCard icon={Castle} label="Nas bases" value={diamonds(inBases)} sub={`${fmt(W.bases.length)} bases detectadas`} tone="orange" onClick={() => go('map', { view: 'bases' })} action="Ver bases no mapa" />
              </div>
              <div className="grid-2">
                <Panel title="Jogadores" icon={Users}>
                  {W.players.length ? (
                    <>
                      <BarList
                        rows={W.players.map(p => ({ key: p.key, label: names.get(p.key) || p.key, value: p.total, color: 'var(--accent)', hint: `${names.get(p.key)}: carregando ≈ ${fmt(p.carried)}, baú do End ≈ ${fmt(p.enderChest)}` }))}
                        format={diamonds}
                        onSelect={r => go('players', { p: r.key })}
                      />
                      <table className="table compact wealth-split">
                        <thead><tr><th>Jogador</th><th className="num">Carregando</th><th className="num">Baú do End</th><th className="num">Total</th></tr></thead>
                        <tbody>
                          {W.players.map(p => (
                            <tr key={p.key}>
                              <td>{names.get(p.key) || p.key}</td>
                              <td className="num">{diamonds(p.carried)}</td>
                              <td className="num">{diamonds(p.enderChest)}</td>
                              <td className="num"><strong>{diamonds(p.total)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : <Empty text="Nenhum jogador salvo" />}
                </Panel>
                <Panel title="Bases" icon={Castle} actions={<button type="button" className="link-btn" onClick={() => go('map', { view: 'bases' })}>No mapa →</button>}>
                  <BarList
                    rows={bases.map(b => ({ key: b.id, label: baseName(b), value: b.value, color: DIM_COLOR[b.dimension] || 'var(--orange)' }))}
                    format={diamonds}
                    onSelect={r => go('map', { view: 'bases', sel: `bases:${r.key}` })}
                    empty="Nenhuma base guarda itens de valor"
                  />
                </Panel>
                {W.hoarders?.length > 0 && (
                  <Panel title="Acumuladores" icon={Trash2} actions={<small className="muted">blocos comuns no inventário e no baú do End</small>}>
                    <BarList
                      rows={W.hoarders.map(p => ({ key: p.key, label: names.get(p.key) || p.key, value: p.junk, color: 'var(--red)', hint: `${names.get(p.key)}: ${fmt(p.junk)} blocos e itens comuns (terra, pedra, cascalho…)` }))}
                      format={fmt}
                      onSelect={r => go('players', { p: r.key })}
                    />
                  </Panel>
                )}
              </div>
              <Panel title="Itens mais valiosos" icon={Gem} pad={false}>
                {W.top.length === 0 ? <Empty text="Nenhum item valioso encontrado" /> : (
                  <div className="table-wrap short">
                    <table className="table">
                      <thead><tr><th /><th>Item</th><th className="num">Qtd.</th><th className="num">Valor</th><th>Onde</th><th>Coordenadas</th></tr></thead>
                      <tbody>
                        {W.top.map((t, i) => (
                          <tr key={i}>
                            <td className="cell-icon"><ItemIcon id={t.item} size={28} enchanted={!!t.enchantments?.length} /></td>
                            <td>
                              <strong>{t.customName ? <McText text={t.customName} /> : prettyName(t.item)}</strong>
                              {t.enchantments?.length > 0 && <small className="muted"> <Sparkles size={11} /> {t.enchantments.length} encantamentos</small>}
                            </td>
                            <td className="num">{fmt(t.count)}</td>
                            <td className="num">{diamonds(t.value)}</td>
                            <td>{whereLabel(t.where, names)}</td>
                            <td className="nowrap">{t.position ? <CoordLink go={go} dim={t.dimension} position={t.position} label={prettyName(t.item)} /> : <span className="muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          );
        }}
      </Async>
    </>
  );
}
