import { Gauge, PawPrint, ShoppingBag, Sparkles, Filter, Cpu, Timer, Info, Tractor, Users } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, PageHeader, Tabs, StatCard, CoordLink, Empty, useSort, Badge } from '../components/ui.jsx';
import { MobIcon } from '../components/icons.jsx';
import { fmt, fmtCompact, mobName, DIM_LABEL, DIM_COLOR, sortDims } from '../format.js';

const FARM_KIND = {
  villagers: { label: 'Trading hall / aldeões confinados', tone: 'gold', icon: Users },
  iron: { label: 'Farm de ferro', tone: 'blue', icon: Tractor },
  mobs: { label: 'Farm ou criação', tone: 'green', icon: Tractor },
};

const chunkLabel = r => `Chunk ${r.x}, ${r.z}`;

function HeavyChunks({ rows, go }) {
  const [sorted, th] = useSort(rows, {
    lag: r => r.lag, entities: r => r.entities, items: r => r.items, hoppers: r => r.hoppers, ticking: r => r.ticking, ticks: r => r.pendingTicks,
  }, '-lag');
  if (!rows.length) return <Empty text="Nenhum chunk com atividade nesta dimensão" />;
  return (
    <div className="table-wrap short">
      <table className="table">
        <thead>
          <tr>
            <th>Chunk</th>
            {th('lag', 'Peso', { firstDesc: true, className: 'num' })}
            {th('entities', 'Entidades', { firstDesc: true, className: 'num' })}
            {th('items', 'Itens no chão', { firstDesc: true, className: 'num' })}
            {th('hoppers', 'Funis', { firstDesc: true, className: 'num' })}
            {th('ticking', 'Blocos ativos', { firstDesc: true, className: 'num' })}
            {th('ticks', 'Ticks pendentes', { firstDesc: true, className: 'num' })}
            <th>Mobs principais</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={`${r.x}:${r.z}`}>
              <td className="nowrap"><CoordLink go={go} dim={r.dimension} position={[r.center[0], null, r.center[1]]} label={chunkLabel(r)}>{r.x}, {r.z}</CoordLink></td>
              <td className="num"><strong>{fmt(r.lag)}</strong></td>
              <td className="num">{fmt(r.entities)}</td>
              <td className="num">{fmt(r.items)}</td>
              <td className="num">{fmt(r.hoppers)}</td>
              <td className="num">{fmt(r.ticking)}</td>
              <td className="num">{fmt(r.pendingTicks)}</td>
              <td>
                <div className="mob-chips">
                  {r.topMobs.map(([t, n]) => <span key={t} className="mob-chip" title={mobName(t)}><MobIcon id={t} size={20} />{fmt(n)}</span>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Performance({ go }) {
  const state = useQuery('lag');
  const [dim, setDim] = useHashParam('dim', '');
  return (
    <div className="page">
      <PageHeader title="Lag e farms" subtitle="Onde o mundo pesa: chunks com muitas entidades, itens no chão, funis e blocos que processam ticks, além de farms prováveis." />
      <Async state={state} loadingText="Analisando cada chunk…" loadingSub="Na primeira vez o terreno inteiro é varrido. Leva alguns segundos.">
        {L => {
          const dims = sortDims(Object.keys(L.totals));
          if (!dims.length) return <Empty text="Nenhum chunk analisado" />;
          const d = dim && L.totals[dim] ? dim : dims[0];
          const T = L.totals[d];
          const heavy = L.heavy.filter(r => r.dimension === d);
          const farms = L.farms.filter(f => f.dimension === d);
          const piles = L.groundItems.filter(r => r.dimension === d);
          return (
            <>
              <div className="toolbar">
                <Tabs label="Dimensão" value={d} onChange={setDim} items={dims.map(x => ({ value: x, label: DIM_LABEL[x] || x, color: DIM_COLOR[x] }))} />
                <span className="muted">{fmt(T.chunks)} chunks com dados</span>
              </div>
              <div className="stats-grid six">
                <StatCard icon={PawPrint} label="Entidades" value={fmtCompact(T.entities)} sub="mobs, itens, projéteis…" tone="purple" />
                <StatCard icon={ShoppingBag} label="Itens no chão" value={fmtCompact(T.items)} sub="somem após 5 min carregados" tone="orange" />
                <StatCard icon={Sparkles} label="Orbes de XP" value={fmtCompact(T.xpOrbs)} tone="green" />
                <StatCard icon={Filter} label="Funis" value={fmtCompact(T.hoppers)} sub="checam itens todo tick" tone="gold" />
                <StatCard icon={Cpu} label="Blocos ativos" value={fmtCompact(T.ticking)} sub="fornalhas, pistões, comparadores…" tone="blue" />
                <StatCard icon={Timer} label="Ticks pendentes" value={fmtCompact(T.pendingTicks)} sub="água, lava, redstone agendados" tone="teal" />
              </div>
              <div className="note">
                <Info size={15} />
                <span>Estimativa. O “peso” de cada chunk é uma soma relativa (entidades, itens no chão, funis, blocos ativos e ticks pendentes) para comparar lugares do mesmo mundo, não uma medida real de FPS ou TPS. Só conta o que estava salvo no arquivo.</span>
              </div>
              <Panel title="Chunks mais pesados" icon={Gauge} actions={<small className="muted">top {heavy.length}</small>}>
                <HeavyChunks rows={heavy} go={go} />
              </Panel>
              <div className="grid-2">
                <Panel title="Farms prováveis" icon={Tractor} actions={<small className="muted">um tipo de mob concentrado em 3×3 chunks</small>}>
                  {farms.length === 0 ? <Empty text="Nenhuma concentração de mobs encontrada" /> : (
                    <div className="farm-list">
                      {farms.map((f, i) => {
                        const K = FARM_KIND[f.kind] || FARM_KIND.mobs;
                        return (
                          <div key={i} className="farm-row">
                            <MobIcon id={f.type} size={32} />
                            <div className="farm-main">
                              <strong>{f.kind === 'mobs' ? `Farm de ${mobName(f.type).toLowerCase()}` : K.label}</strong>
                              <small><Badge tone={K.tone}>{f.kind === 'mobs' ? 'farm ou criação' : f.kind === 'iron' ? 'golens' : 'aldeões'}</Badge> {fmt(f.count)}× {mobName(f.type)}</small>
                            </div>
                            <CoordLink go={go} dim={f.dimension} position={[f.center[0], null, f.center[1]]} label={`${fmt(f.count)}× ${mobName(f.type)}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
                <Panel title="Itens acumulados no chão" icon={ShoppingBag} actions={<small className="muted">30 ou mais num chunk</small>}>
                  {piles.length === 0 ? <Empty text="Nenhum acúmulo de itens no chão" /> : (
                    <div className="table-wrap short">
                      <table className="table">
                        <thead><tr><th>Chunk</th><th className="num">Itens</th><th className="num">Orbes de XP</th><th className="num">Funis</th></tr></thead>
                        <tbody>
                          {piles.map(r => (
                            <tr key={`${r.x}:${r.z}`}>
                              <td className="nowrap"><CoordLink go={go} dim={r.dimension} position={[r.center[0], null, r.center[1]]} label={chunkLabel(r)}>{r.x}, {r.z}</CoordLink></td>
                              <td className="num"><strong>{fmt(r.items)}</strong></td>
                              <td className="num">{fmt(r.xpOrbs)}</td>
                              <td className="num">{fmt(r.hoppers)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
