import { useState } from 'react';
import { Pickaxe, Info, BarChart3, Table2 } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, Tabs, Empty, useSort } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import { fmt, fmtCompact, prettyName, DIM_LABEL, DIM_COLOR, sortDims } from '../format.js';

// Same order as ORES in src/extract/analysis.js: block id for the name, dropped item for the icon.
const ORES = [
  ['coal', 'minecraft:coal_ore', 'minecraft:coal'],
  ['copper', 'minecraft:copper_ore', 'minecraft:raw_copper'],
  ['iron', 'minecraft:iron_ore', 'minecraft:raw_iron'],
  ['gold', 'minecraft:gold_ore', 'minecraft:raw_gold'],
  ['redstone', 'minecraft:redstone_ore', 'minecraft:redstone'],
  ['lapis', 'minecraft:lapis_ore', 'minecraft:lapis_lazuli'],
  ['diamond', 'minecraft:diamond_ore', 'minecraft:diamond'],
  ['emerald', 'minecraft:emerald_ore', 'minecraft:emerald'],
  ['quartz', 'minecraft:quartz_ore', 'minecraft:quartz'],
  ['nether_gold', 'minecraft:nether_gold_ore', 'minecraft:gold_nugget'],
  ['ancient_debris', 'minecraft:ancient_debris', 'minecraft:ancient_debris'],
];
const BIN = 4;
// Sequential ramp: one hue, opacity grows with the count (normalised per ore).
const cellColor = t => (t <= 0 ? 'transparent' : `rgba(242, 193, 78, ${(0.1 + 0.9 * Math.sqrt(t)).toFixed(3)})`);
const range = (a, b) => (a === b ? `Y ${a}` : `Y ${a} a ${b}`);

/** Rows = ores, columns = Y bins; each row scaled to its own maximum so rare ores stay readable. */
function Heatmap({ rows, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  const minY = Math.floor(Math.min(...rows.map(r => r.data.minY)) / BIN) * BIN;
  const maxY = Math.ceil((Math.max(...rows.map(r => r.data.maxY)) + 1) / BIN) * BIN - 1;
  const nBins = (maxY - minY + 1) / BIN;
  const bins = rows.map(r => {
    const b = new Array(nBins).fill(0);
    for (const [y, n] of Object.entries(r.data.byY)) b[Math.floor((+y - minY) / BIN)] += n;
    return b;
  });
  const ticks = [];
  for (let y = Math.ceil(minY / 32) * 32; y <= maxY; y += 32) ticks.push(y);
  const pct = y => (100 * (y - minY)) / (maxY - minY + 1);
  return (
    <div className="ore-heat">
      <div className="ore-heat-readout" aria-live="polite">
        {hover
          ? <><strong>{hover.label}</strong> · {range(hover.y0, hover.y0 + BIN - 1)} · <strong>{fmt(hover.n)}</strong> blocos ({hover.share.toFixed(1)}% do total)</>
          : <span className="muted">Passe o mouse numa célula para ver a contagem; clique num minério para o detalhe por altura.</span>}
      </div>
      <div className="ore-heat-grid" style={{ '--bins': nBins }} onMouseLeave={() => setHover(null)}>
        {rows.map((r, ri) => {
          const max = Math.max(...bins[ri]);
          const peakBin = Math.floor((r.data.peakY - minY) / BIN);
          return (
            <div key={r.key} className={`ore-heat-row${selected === r.key ? ' active' : ''}`}>
              <button type="button" className="ore-heat-label" onClick={() => onSelect(r.key)} title={`Ver ${r.label} por altura`}>
                <ItemIcon id={r.icon} size={20} /> <span>{r.label}</span>
              </button>
              <div className="ore-heat-cells" onClick={() => onSelect(r.key)}>
                {bins[ri].map((n, i) => (
                  <span
                    key={i}
                    className={i === peakBin ? 'peak' : undefined}
                    style={{ background: cellColor(n / max) }}
                    onMouseEnter={() => setHover({ label: r.label, y0: minY + i * BIN, n, share: (100 * n) / r.data.total })}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <div className="ore-heat-axis">
          <span className="ore-heat-axis-title">Altura (Y)</span>
          <div className="ore-heat-ticks">
            {ticks.map(y => <span key={y} style={{ left: `${pct(y)}%` }}>{y}</span>)}
          </div>
        </div>
      </div>
      <div className="ore-heat-legend">
        <span>menos</span><span className="ore-heat-ramp" /><span>mais (relativo a cada minério)</span>
        <span className="ore-heat-peak-key"><i /> altura com mais blocos</span>
      </div>
    </div>
  );
}

/** One ore: a column per Y level, the peak highlighted. */
function OreDetail({ row }) {
  const [hover, setHover] = useState(null);
  const { minY, maxY, byY, peakY, total } = row.data;
  const ys = [];
  for (let y = minY; y <= maxY; y++) ys.push(y);
  const max = byY[peakY];
  const shown = hover ?? peakY;
  return (
    <div className="ore-detail">
      <div className="ore-heat-readout" aria-live="polite">
        <strong>Y {shown}</strong> · {fmt(byY[shown] || 0)} blocos{shown === peakY ? ' · melhor altura' : ''} · {(((byY[shown] || 0) * 100) / total).toFixed(2)}% do total
      </div>
      <div className="ore-cols" onMouseLeave={() => setHover(null)} role="img" aria-label={`${row.label} por altura, de Y ${minY} a ${maxY}, pico em Y ${peakY}`}>
        {ys.map(y => (
          <span key={y} className={`ore-col${y === peakY ? ' peak' : ''}${y === hover ? ' hover' : ''}`} onMouseEnter={() => setHover(y)}>
            <i style={{ height: `${Math.max(byY[y] ? 1.5 : 0, (100 * (byY[y] || 0)) / max)}%` }} />
          </span>
        ))}
      </div>
      <div className="ore-cols-axis"><span>Y {minY}</span><span>Y {maxY}</span></div>
    </div>
  );
}

function OreTable({ rows, onSelect }) {
  const [sorted, th] = useSort(rows, { name: r => r.label, total: r => r.data.total, peak: r => r.data.peakY }, '');
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th />
            {th('name', 'Minério')}
            {th('total', 'Blocos', { firstDesc: true, className: 'num' })}
            {th('peak', 'Melhor Y', { className: 'num' })}
            <th>Faixa encontrada</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.key} className="clickable" onClick={() => onSelect(r.key)}>
              <td className="cell-icon"><ItemIcon id={r.icon} size={24} /></td>
              <td><strong>{r.label}</strong></td>
              <td className="num">{fmt(r.data.total)}</td>
              <td className="num"><strong>{r.data.peakY}</strong></td>
              <td className="mono">{range(r.data.minY, r.data.maxY)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Mining() {
  const state = useQuery('ores');
  const [dim, setDim] = useHashParam('dim', '');
  const [ore, setOre] = useHashParam('ore', '');
  return (
    <>
      <Async state={state} loadingText="Contando minérios camada por camada…" loadingSub="Na primeira vez o terreno inteiro é varrido. Leva alguns segundos.">
        {O => {
          const dims = sortDims(Object.keys(O).filter(d => Object.keys(O[d]).length));
          if (!dims.length) return <Empty text="Nenhum minério encontrado nos chunks salvos" />;
          const d = dim && O[dim] ? dim : dims[0];
          const rows = ORES.filter(([k]) => O[d][k]).map(([key, block, icon]) => ({ key, label: prettyName(block), icon, data: O[d][key] }));
          const sel = rows.find(r => r.key === ore) || null;
          const toggle = k => setOre(o => (o === k ? '' : k));
          return (
            <>
              <div className="toolbar">
                <Tabs label="Dimensão" value={d} onChange={v => { setDim(v); setOre(''); }} items={dims.map(x => ({ value: x, label: DIM_LABEL[x] || x, color: DIM_COLOR[x] }))} />
                <span className="muted">{fmtCompact(rows.reduce((s, r) => s + r.data.total, 0))} blocos de minério</span>
              </div>
              <div className="note">
                <Info size={15} />
                <span>Conta só os chunks já gerados e o que ainda está no lugar: minérios já minerados não aparecem. Cada linha usa a própria escala, então compare alturas dentro de um minério, não quantidades entre minérios (para isso, veja a tabela).</span>
              </div>
              <Panel title="Mapa de calor por altura" icon={Pickaxe}>
                <Heatmap rows={rows} selected={sel?.key} onSelect={toggle} />
              </Panel>
              {sel && (
                <Panel title={`${sel.label} por altura`} icon={BarChart3} actions={<button type="button" className="link-btn" onClick={() => setOre('')}>Fechar</button>}>
                  <OreDetail row={sel} />
                </Panel>
              )}
              <Panel title="Resumo" icon={Table2}>
                <OreTable rows={rows} onSelect={toggle} />
              </Panel>
            </>
          );
        }}
      </Async>
    </>
  );
}
