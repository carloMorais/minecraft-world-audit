import { useState } from 'react';
import { Archive, MapPin } from 'lucide-react';
import { useQuery } from '../client.js';
import { Async, PageHeader, Tabs, SearchInput, Empty, Badge } from '../components/ui.jsx';
import { SlotGrid, Slot, TooltipScope } from '../components/inventory.jsx';
import { fmt, prettyName, DIM_LABEL, DIM_COLOR } from '../format.js';
import McText from '../components/McText.jsx';

const LAYOUT = {
  Chest: [27, 9], Barrel: [27, 9], ShulkerBox: [27, 9], Hopper: [5, 5], Dispenser: [9, 3], Dropper: [9, 3],
  Furnace: [3, 3], BlastFurnace: [3, 3], Smoker: [3, 3], BrewingStand: [5, 5], Crafter: [9, 3], ChiseledBookshelf: [6, 3],
  DecoratedPot: [1, 1], Campfire: [4, 4], Lectern: [1, 1], Jukebox: [1, 1], ItemFrame: [1, 1], GlowItemFrame: [1, 1], FlowerPot: [1, 1],
};
const LABEL = {
  Chest: 'Baú', Barrel: 'Barril', ShulkerBox: 'Caixa de Shulker', Hopper: 'Funil', Dispenser: 'Ejetor', Dropper: 'Liberador',
  Furnace: 'Fornalha', BlastFurnace: 'Alto-forno', Smoker: 'Defumador', BrewingStand: 'Suporte de poções', DecoratedPot: 'Vaso decorado',
  Lectern: 'Atril', Jukebox: 'Toca-discos', ItemFrame: 'Moldura', GlowItemFrame: 'Moldura brilhante', FlowerPot: 'Vaso', Campfire: 'Fogueira',
  ChiseledBookshelf: 'Estante entalhada', Crafter: 'Fabricador',
};

function ContainerCard({ b, tip }) {
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
        <MapPin size={12} /> <code>{b.position.join(', ')}</code>
        {b.pairedWith && <Badge>baú duplo</Badge>}
      </div>
      {slots === 1 ? <div className="slot-row">{items.map((it, i) => <Slot key={i} it={it} size={44} tipHandlers={tip} />)}</div>
        : <SlotGrid items={items.some(it => it.slot != null) ? items : items.map((it, i) => ({ ...it, slot: i }))} slots={Math.max(slots, items.length)} cols={cols} size={40} tipHandlers={tip} />}
    </div>
  );
}

export default function Containers() {
  const state = useQuery('containers');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(60);
  return (
    <div className="page">
      <PageHeader title="Baús e containers" subtitle="Todo bloco que guarda itens: baús, barris, shulkers, funis, fornalhas, molduras, atris, toca-discos…" />
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
                <Tabs value={type} onChange={setType} items={[{ value: 'all', label: 'Todos', count: all.length }, ...Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ value: t, label: LABEL[t] || t, count: n }))]} />
              </div>
              <div className="toolbar">
                <SearchInput value={q} onChange={setQ} placeholder="Procurar containers que tenham… (ex.: diamond, elytra, totem)" />
                <span className="muted">{fmt(list.length)} containers</span>
              </div>
              {list.length === 0 ? <Empty text="Nenhum container encontrado" /> : (
                <TooltipScope>
                  {tip => (
                    <>
                      <div className="container-grid">
                        {list.slice(0, limit).map((b, i) => <ContainerCard key={`${b.position}-${i}`} b={b} tip={tip} />)}
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
    </div>
  );
}
