import { Archive, LayoutGrid, PackageCheck, PackageOpen, Combine, Shuffle, Info, Box } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, StatCard, CoordLink, Empty } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText, { stripCodes } from '../components/McText.jsx';
import { fmt, prettyName, DIM_LABEL } from '../format.js';
import { CONTAINER_LABEL, CONTAINER_COLOR } from '../containers.js';

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

function ItemCell({ id }) {
  return <span className="item-cell"><ItemIcon id={id} size={24} /> <strong>{prettyName(id)}</strong></span>;
}

function Fill({ value, max, color }) {
  const p = pct(value, max);
  return (
    <span className="fill-meter" title={`${value} de ${max} slots`}>
      <span className="fill-track"><span style={{ width: `${p}%`, background: color }} /></span>
      <small>{value}/{max}</small>
    </span>
  );
}

export default function Storage({ go }) {
  const state = useQuery('storageReport');
  const bases = useQuery('bases');
  const baseName = id => {
    const b = bases.data?.find(x => x.id === id);
    return b ? (b.name ? stripCodes(b.name) : `Base ${b.id}`) : null;
  };
  return (
    <>
      <Async state={state} loadingText="Analisando os containers…" loadingSub="Na primeira vez o terreno inteiro é varrido para achar as bases.">
        {S => (
          <>
            <div className="stats-grid six">
              <StatCard icon={Archive} label="Containers" value={fmt(S.containers)} sub={`${fmt(S.distinctItems)} itens diferentes`} tone="gold" onClick={() => go('items', { tab: 'containers' })} action="Ver baús e containers" />
              <StatCard icon={LayoutGrid} label="Slots ocupados" value={`${pct(S.slotsUsed, S.slotsTotal)}%`} sub={`${fmt(S.slotsUsed)} de ${fmt(S.slotsTotal)}`} tone="blue" />
              <StatCard icon={PackageCheck} label="Cheios" value={fmt(S.full)} sub="todos os slots ocupados" tone="red" />
              <StatCard icon={PackageOpen} label="Vazios" value={fmt(S.empty)} sub="sem nenhum item" tone="teal" />
              <StatCard icon={Combine} label="Slots a liberar" value={fmt(S.freeableSlots)} sub="juntando pilhas incompletas" tone="green" />
              <StatCard icon={Box} label="Espalhados" value={fmt(S.scattered.length)} sub="itens em 3+ containers" tone="purple" />
            </div>
            <div className="note">
              <Info size={15} />
              <span>Funis, fornalhas e suportes de poções entram na contagem de slots, mas não nas sugestões: eles trabalham, não guardam. Loot nunca aberto fica de fora. O tamanho máximo das pilhas é estimado (64, 16 ou 1).</span>
            </div>
            <div className="grid-2">
              <Panel title="Itens espalhados" icon={Shuffle} actions={<small className="muted">o mesmo item em vários containers</small>}>
                {S.scattered.length === 0 ? <Empty text="Nada espalhado: cada item está em poucos lugares" /> : (
                  <div className="table-wrap short">
                    <table className="table">
                      <thead><tr><th>Item</th><th className="num">Containers</th><th className="num">Total</th><th className="num">Slots</th></tr></thead>
                      <tbody>
                        {S.scattered.map(r => (
                          <tr key={r.item} className="clickable" onClick={() => go('items', { q: `^${r.item}$` })} title="Ver onde está">
                            <td><ItemCell id={r.item} /></td>
                            <td className="num"><strong>{fmt(r.containers)}</strong></td>
                            <td className="num">{fmt(r.total)}</td>
                            <td className="num">{fmt(r.slots)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <Panel title="Juntar pilhas" icon={Combine} actions={<small className="muted">slots que sobram ao completar as pilhas</small>}>
                {S.mergeable.length === 0 ? <Empty text="Todas as pilhas já estão compactas" /> : (
                  <div className="table-wrap short">
                    <table className="table">
                      <thead><tr><th>Item</th><th className="num">Total</th><th className="num">Slots hoje</th><th className="num">Bastam</th><th className="num">Libera</th></tr></thead>
                      <tbody>
                        {S.mergeable.map(r => (
                          <tr key={r.item} className="clickable" onClick={() => go('items', { q: `^${r.item}$` })} title="Ver onde está">
                            <td><ItemCell id={r.item} /></td>
                            <td className="num">{fmt(r.total)}</td>
                            <td className="num">{fmt(r.slots)}</td>
                            <td className="num">{fmt(r.minSlots)}</td>
                            <td className="num"><strong className="good-text">+{fmt(r.freeable)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
            <Panel title="Quase cheios" icon={PackageCheck} actions={<small className="muted">90% ou mais dos slots ocupados</small>}>
              {S.nearlyFull.length === 0 ? <Empty text="Nenhum container perto de encher" /> : (
                <div className="table-wrap short">
                  <table className="table">
                    <thead><tr><th>Container</th><th>Ocupação</th><th className="num">Itens</th><th>Base</th><th>Dimensão</th><th>Coordenadas</th></tr></thead>
                    <tbody>
                      {S.nearlyFull.map((c, i) => {
                        const label = CONTAINER_LABEL[c.id] || c.id;
                        const base = c.base != null ? baseName(c.base) : null;
                        return (
                          <tr key={i}>
                            <td>
                              <span className="item-cell">
                                <span className="sq" style={{ background: CONTAINER_COLOR[c.id] || '#d9a14a' }} />
                                {c.customName ? <span><strong><McText text={c.customName} /></strong> <small className="muted">{label}</small></span> : <strong>{label}</strong>}
                              </span>
                            </td>
                            <td><Fill value={c.slots} max={c.capacity} color={c.slots >= c.capacity ? 'var(--red)' : 'var(--gold)'} /></td>
                            <td className="num">{fmt(c.total)}</td>
                            <td>{base ? <button type="button" className="link-btn" onClick={() => go('map', { view: 'bases', sel: `bases:${c.base}` })}>{base}</button> : <span className="muted">—</span>}</td>
                            <td>{DIM_LABEL[c.dimension] || c.dimension}</td>
                            <td className="nowrap"><CoordLink go={go} dim={c.dimension} position={c.position} label={c.customName ? stripCodes(c.customName) : label} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </Async>
    </>
  );
}
