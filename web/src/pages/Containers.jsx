import { useState } from 'react';
import { Archive } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Async, Tabs, SearchInput, Empty, Badge, CoordLink } from '../components/ui.jsx';
import { SlotGrid, Slot, TooltipScope } from '../components/inventory.jsx';
import { fmt, prettyName, DIM_LABEL, DIM_COLOR } from '../format.js';
import McText from '../components/McText.jsx';
import { CONTAINER_LAYOUT as LAYOUT, CONTAINER_LABEL as LABEL } from '../containers.js';

function ContainerCard({ b, tip, go }) {
  const items = [...(b.items || []), ...[b.item, b.record, b.book].filter(Boolean)];
  const [slots, cols] = LAYOUT[b.id] || [Math.max(9, Math.ceil(items.length / 9) * 9), 9];
  const total = items.reduce((a, it) => a + it.count, 0);
  return (
    <div className="container-card">
      <header>
        <Archive size={16} />
        <strong>{b.customName ? <McText text={b.customName} /> : LABEL[b.id] || b.id}</strong>
        {b.customName && <Badge>{LABEL[b.id] || b.id}</Badge>}
        <span className="grow" />
        <small>{fmt(total)} itens</small>
      </header>
      <div className="container-loc">
        <span className="dot" style={{ background: DIM_COLOR[b.dimension] }} /> {DIM_LABEL[b.dimension]}
        <CoordLink go={go} dim={b.dimension} position={b.position} label={b.customName ? b.customName.replace(/§./g, '') : LABEL[b.id] || b.id} />
        {b.pairedWith && <Badge>baú duplo</Badge>}
      </div>
      {slots === 1 ? <div className="slot-row">{items.map((it, i) => <Slot key={i} it={it} size={44} tipHandlers={tip} />)}</div>
        : <SlotGrid items={items.some(it => it.slot != null) ? items : items.map((it, i) => ({ ...it, slot: i }))} slots={Math.max(slots, items.length)} cols={cols} size={40} tipHandlers={tip} />}
    </div>
  );
}

export default function Containers({ go }) {
  const state = useQuery('containers');
  const [type, setType] = useHashParam('type', 'all');
  const [q, setQ] = useHashParam('q', '');
  const [limit, setLimit] = useState(60);
  return (
    <>
      <Async state={state} loadingText="Abrindo os baús…">
        {all => {
          const types = {};
          for (const b of all) types[b.id] = (types[b.id] || 0) + 1;
          const re = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
          const matches = it => re.test(it.item) || re.test(prettyName(it.item)) || (it.customName && re.test(it.customName)) || it.contents?.some(matches);
          const list = all
            .filter(b => type === 'all' || b.id === type)
            .filter(b => !re || [...(b.items || []), b.item, b.record, b.book].filter(Boolean).some(matches) || re.test(b.customName || ''))
            .sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
          return (
            <>
              <div className="toolbar">
                <Tabs label="Tipo de container" value={type} onChange={setType} items={[{ value: 'all', label: 'Todos', count: all.length }, ...Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ value: t, label: LABEL[t] || t, count: n }))]} />
              </div>
              <div className="toolbar">
                <SearchInput value={q} onChange={setQ} placeholder="Procurar containers que tenham… (ex.: diamond, elytra, totem)" />
                <span className="muted nowrap">{fmt(list.length)} {list.length === 1 ? 'container' : 'containers'}</span>
              </div>
              {list.length === 0 ? (
                <Empty text={q ? `Nenhum container com “${q}”` : 'Nenhum container encontrado'}>
                  {(q || type !== 'all') && <button type="button" className="link-btn" onClick={() => { setQ(''); setType('all'); }}>Limpar filtros</button>}
                </Empty>
              ) : (
                <TooltipScope>
                  {tip => (
                    <>
                      <div className="container-grid">
                        {list.slice(0, limit).map((b, i) => <ContainerCard key={`${b.position}-${i}`} b={b} tip={tip} go={go} />)}
                      </div>
                      {list.length > limit && <button type="button" className="btn btn-block" onClick={() => setLimit(limit + 60)}>Mostrar mais ({fmt(list.length - limit)})</button>}
                    </>
                  )}
                </TooltipScope>
              )}
            </>
          );
        }}
      </Async>
    </>
  );
}
