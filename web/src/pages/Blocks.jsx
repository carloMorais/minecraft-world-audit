import { useState } from 'react';
import { Boxes, Hammer, Droplets, Search, Info } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, BarList, Tabs, SearchInput, Empty, StatCard, CoordLink } from '../components/ui.jsx';
import { blockColor } from '../../../src/extract/surface.js';
import { fmt, fmtCompact, prettyName, DIM_LABEL, DIM_COLOR, sortDims } from '../format.js';

const swatch = id => <span className="swatch" style={{ background: `rgb(${blockColor(id.split('[')[0]).join(',')})` }} />;
const rowsOf = obj => Object.entries(obj || {}).filter(([k]) => !/:(air|cave_air)$/.test(k)).map(([k, v]) => ({ key: k, label: prettyName(k), value: v, icon: swatch(k), color: `rgb(${blockColor(k).join(',')})` }));
const QUICK = ['diamond_ore', 'ancient_debris', 'beacon', 'spawner|mob_spawner', 'end_portal_frame', 'enchanting_table', 'bed', 'chest'];

function FindBlock({ dims, go }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(null);
  const [dim, setDim] = useState('all');
  const args = query ? { q: query, dim: dim === 'all' ? undefined : dim, limit: 1000 } : null;
  const result = useQuery('findBlock', args, { enabled: !!query });
  return (
    <Panel title="Encontrar blocos" icon={Search}>
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} onSubmit={v => v && setQuery(v.trim())} placeholder="Nome do bloco ou regex (ex.: diamond_ore, beacon, _bed$)…" />
        <Tabs label="Dimensão" value={dim} onChange={setDim} items={[{ value: 'all', label: 'Todas' }, ...dims.map(d => ({ value: d, label: DIM_LABEL[d], color: DIM_COLOR[d] }))]} />
      </div>
      <div className="quick">
        <span className="quick-label">Atalhos:</span>
        {QUICK.map(k => <button type="button" key={k} className={`chip${query === k ? ' chip-active' : ''}`} onClick={() => { setQ(k); setQuery(k); }}>{swatch(`minecraft:${k.split('|')[0]}`)} {k.replace('|', ' / ')}</button>)}
      </div>
      {query && (
        <Async state={result} loadingText="Varrendo todos os subchunks…" loadingSub="Isso decodifica o mundo inteiro, alguns segundos.">
          {r => (r.total === 0 ? <Empty text={`Nenhum bloco corresponde a “${query}”`} /> : (
            <>
              <p className="muted">{fmt(r.total)} blocos encontrados{r.total > r.shown ? ` · mostrando ${fmt(r.shown)}` : ''}</p>
              <div className="table-wrap short">
                <table className="table">
                  <thead><tr><th /><th>Bloco</th><th>Dimensão</th><th>Coordenadas</th></tr></thead>
                  <tbody>
                    {r.hits.map((h, i) => (
                      <tr key={i}>
                        <td className="cell-icon">{swatch(h.block)}</td>
                        <td><strong>{prettyName(h.block.split('[')[0])}</strong> <small className="muted mono">{h.block.includes('[') ? h.block.slice(h.block.indexOf('[')) : ''}</small></td>
                        <td><span className="dot" style={{ background: DIM_COLOR[h.dimension] }} /> {DIM_LABEL[h.dimension]}</td>
                        <td className="nowrap"><CoordLink go={go} dim={h.dimension} position={[h.x, h.y, h.z]} label={prettyName(h.block.split('[')[0])} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ))}
        </Async>
      )}
    </Panel>
  );
}

export default function Blocks({ go }) {
  const state = useQuery('blocks');
  const [dim, setDim] = useState(null);
  return (
    <div className="page">
      <PageHeader title="Blocos" subtitle="Contagem de cada bloco salvo no mundo, por dimensão, e busca de coordenadas." />
      <Async state={state} loadingText="Contando todos os blocos do mundo…" loadingSub="Centenas de milhões de posições são decodificadas no seu navegador. Leva alguns segundos.">
        {C => {
          const dims = sortDims(Object.keys(C.dimensions));
          const d = dim && C.dimensions[dim] ? dim : dims[0];
          const D = C.dimensions[d];
          const placed = rowsOf(D.likelyPlayerPlaced);
          return (
            <>
              <div className="toolbar">
                <Tabs value={d} onChange={setDim} items={dims.map(x => ({ value: x, label: DIM_LABEL[x], color: DIM_COLOR[x], count: C.dimensions[x].totalNonAir }))} />
                <span className="muted">{fmt(C.subchunksScanned)} subchunks em {(C.elapsedMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="stats-grid">
                <StatCard icon={Boxes} label="Blocos sólidos e líquidos" value={fmtCompact(D.totalNonAir)} sub={`${D.distinctBlockTypes} tipos diferentes`} tone="green" />
                <StatCard icon={Hammer} label="Blocos de construção" value={fmtCompact(placed.reduce((a, r) => a + r.value, 0))} sub={`${placed.length} tipos tipicamente colocados por jogadores`} tone="gold" />
                <StatCard icon={Droplets} label="Blocos com água junto" value={fmtCompact(Object.values(D.waterloggedOrSecondLayer).reduce((a, b) => a + b, 0))} sub="segunda camada (waterlogged)" tone="blue" />
              </div>
              <div className="grid-2">
                <Panel title="Blocos mais comuns" icon={Boxes}><BarList rows={rowsOf(D.blocks)} limit={25} format={fmt} /></Panel>
                <Panel title="Provavelmente colocados por jogadores" icon={Hammer}>
                  <div className="note"><Info size={15} /><span>Estimativa: o Bedrock não registra quem colocou cada bloco. Aqui entram blocos que a geração natural (incluindo vilas e estruturas) praticamente não cria: concreto, vidro, blocos de minério, redstone, camas, carpetes…</span></div>
                  <BarList rows={placed} limit={25} format={fmt} empty="Nenhum bloco típico de construção" />
                </Panel>
              </div>
              <FindBlock dims={dims} go={go} />
            </>
          );
        }}
      </Async>
    </div>
  );
}
