import { Trees } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, PageHeader, BarList, Tabs } from '../components/ui.jsx';
import { DIM_LABEL, DIM_COLOR, fmtCompact, sortDims } from '../format.js';

const BIOME_COLOR = [
  [/crimson/, '#b3262c'], [/warped/, '#1f9e8c'], [/soulsand/, '#6b5446'], [/basalt/, '#5b5d63'], [/^hell$|nether_wastes/, '#7f2a24'],
  [/deep_dark/, '#0f2b33'], [/ocean/, '#2f6fd6'], [/river/, '#3f8ff0'], [/beach|stone_beach/, '#e6d79a'], [/desert/, '#e8cf7a'],
  [/mesa|badlands/, '#c8653a'], [/savanna/, '#b7a44a'], [/jungle|bamboo/, '#3a9b1a'], [/swamp|mangrove/, '#4c6b3a'],
  [/roofed|dark_forest/, '#2c5a1c'], [/birch/, '#7ab84f'], [/cherry/, '#f0a8c8'], [/pale_garden/, '#a7b0a3'], [/flower/, '#d97bd0'],
  [/forest/, '#4d8f2c'], [/taiga|grove/, '#3e6b4a'], [/ice|frozen|snowy|cold/, '#cfe7f5'], [/peaks|mountain|extreme_hills|stony/, '#8d8f93'],
  [/meadow/, '#8fcf5a'], [/plains/, '#8bc34a'], [/lush/, '#5fd068'], [/dripstone/, '#9b7a5e'], [/mushroom/, '#a87fa8'],
  [/the_end|end/, '#c9a5ff'],
];
const biomeColor = n => BIOME_COLOR.find(([re]) => re.test(n))?.[1] || '#8b98a7';
const pretty = n => (n === 'hell' ? 'Nether Wastes' : n).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Biomes() {
  const state = useQuery('biomes');
  const [dim, setDim] = useHashParam('dim', '');
  return (
    <div className="page">
      <PageHeader title="Biomas" subtitle="Quanto de cada bioma existe nas áreas exploradas (o Bedrock guarda um bioma por bloco, em 3D)." />
      <Async state={state} loadingText="Lendo biomas…">
        {B => {
          const dims = sortDims(Object.keys(B));
          const d = dim && B[dim] ? dim : dims[0];
          const rows = Object.entries(B[d]).map(([n, v]) => ({ key: n, label: pretty(n), value: v.blocks, color: biomeColor(n), hint: `${v.percent}%`, icon: <span className="swatch" style={{ background: biomeColor(n) }} /> }));
          return (
            <>
              <div className="toolbar"><Tabs value={d} onChange={setDim} items={dims.map(x => ({ value: x, label: DIM_LABEL[x], color: DIM_COLOR[x] }))} /></div>
              <Panel>
                <div className="stacked">
                  {rows.map(r => <span key={r.key} style={{ flex: r.value, background: r.color }} title={`${r.label} — ${r.hint}`} />)}
                </div>
              </Panel>
              <Panel title={`${rows.length} biomas`} icon={Trees}>
                <BarList rows={rows} limit={40} format={v => `${fmtCompact(v)} · ${(100 * v / rows.reduce((a, r) => a + r.value, 0)).toFixed(1)}%`} />
              </Panel>
            </>
          );
        }}
      </Async>
    </div>
  );
}
