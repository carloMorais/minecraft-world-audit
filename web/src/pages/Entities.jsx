import { useMemo, useState } from 'react';
import { PawPrint, Heart, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, BarList, Tabs, SearchInput, Badge, Empty } from '../components/ui.jsx';
import { MobIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { TooltipScope, Slot } from '../components/inventory.jsx';
import { fmt, pos, prettyName, DIM_LABEL, DIM_COLOR, sortDims } from '../format.js';

const HOSTILE = /zombie|skeleton|creeper|spider|witch|pillager|vindicator|evoker|ravager|phantom|drowned|husk|stray|blaze|ghast|magma|slime|piglin_brute|hoglin|zoglin|wither|guardian|shulker|enderman|endermite|silverfish|vex|warden|breeze|bogged|creaking/;
const NOISE = /^minecraft:(item|xp_orb|arrow|falling_block|fireworks_rocket|thrown_trident|snowball|egg|ender_pearl|splash_potion|wind_charge_projectile|fishing_hook|painting|leash_knot|lightning_bolt|tnt)$/;

const CATS = [
  { value: 'mobs', label: 'Mobs', test: e => !NOISE.test(e.type) },
  { value: 'pets', label: 'Pets', test: e => e.tamed || (e.ownerId && !NOISE.test(e.type)) },
  { value: 'named', label: 'Com nome', test: e => !!e.customName },
  { value: 'villagers', label: 'Aldeões', test: e => /villager|wandering_trader/.test(e.type) },
  { value: 'hostile', label: 'Hostis', test: e => HOSTILE.test(e.type) },
  { value: 'other', label: 'Itens, flechas…', test: e => NOISE.test(e.type) },
  { value: 'all', label: 'Tudo', test: () => true },
];

function Trades({ trades, tip }) {
  return (
    <div className="trades">
      {trades.map((t, i) => (
        <div key={i} className="trade">
          <Slot it={t.buyA} size={40} tipHandlers={tip} />
          {t.buyB ? <Slot it={t.buyB} size={40} tipHandlers={tip} /> : <span className="trade-gap" />}
          <span className="trade-arrow">→</span>
          <Slot it={t.sell} size={40} tipHandlers={tip} />
          <small>{t.uses}/{t.maxUses} usos</small>
        </div>
      ))}
    </div>
  );
}

function EntityRow({ e, ownerNames, tip }) {
  const [open, setOpen] = useState(false);
  const expandable = e.trades?.length || e.inventory?.length || e.equipment?.length || e.item;
  return (
    <>
      <tr className={expandable ? 'clickable' : ''} onClick={() => expandable && setOpen(!open)}>
        <td className="cell-icon">{expandable ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}<MobIcon id={e.type} size={26} /></td>
        <td>
          <strong>{e.customName ? <McText text={e.customName} /> : prettyName(e.type)}</strong>
          {e.customName && <small className="muted"> {prettyName(e.type)}</small>}
          <div className="row-badges">
            {e.profession && <Badge tone="gold">{e.profession}</Badge>}
            {e.tamed && <Badge tone="green">domesticado</Badge>}
            {e.baby && <Badge>filhote</Badge>}
            {e.orphan && <Badge title="Nenhum chunk referencia esta entidade; o jogo não a carrega mais">órfã</Badge>}
            {e.item && <Badge>{e.item.count}× {prettyName(e.item.item)}</Badge>}
            {e.ownerId && <Badge tone="blue">dono: {ownerNames[e.ownerId] || e.ownerId}</Badge>}
          </div>
        </td>
        <td><span className="dot" style={{ background: DIM_COLOR[e.dimension] }} /> {DIM_LABEL[e.dimension] || e.dimension}</td>
        <td className="mono">{pos(e.position)}</td>
        <td>{e.health ? <span className="hp"><Heart size={12} /> {e.health.current}/{e.health.max}</span> : '—'}</td>
      </tr>
      {open && (
        <tr className="expand-row">
          <td colSpan={5}>
            {e.trades?.length > 0 && <><h5>Trocas ({e.trades.length})</h5><Trades trades={e.trades} tip={tip} /></>}
            {(e.inventory?.length > 0 || e.equipment?.length > 0 || e.item) && (
              <>
                <h5>Itens</h5>
                <div className="slot-row">{[...(e.equipment || []), ...(e.inventory || []), ...(e.item ? [e.item] : [])].map((it, i) => <Slot key={i} it={it} size={42} tipHandlers={tip} />)}</div>
              </>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Entities() {
  const state = useQuery('entities');
  const players = useQuery('players');
  const [cat, setCat] = useState('mobs');
  const [dim, setDim] = useState('all');
  const [q, setQ] = useState('');
  const [type, setType] = useState(null);
  const [limit, setLimit] = useState(150);

  const ownerNames = useMemo(() => {
    const o = {};
    (players.data || []).forEach((p, i) => { if (p.uniqueId) o[p.uniqueId] = p.role.startsWith('local') ? 'Host' : `Jogador ${i}`; });
    return o;
  }, [players.data]);

  return (
    <div className="page">
      <PageHeader title="Mobs e entidades" subtitle="Todas as entidades salvas: mobs, pets e seus donos, aldeões com profissões e trocas, itens no chão." />
      <Async state={state} loadingText="Carregando entidades…">
        {all => {
          const catDef = CATS.find(c => c.value === cat);
          const re = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
          const inCat = all.filter(e => catDef.test(e) && (dim === 'all' || e.dimension === dim));
          const list = inCat.filter(e => (!type || e.type === type) && (!re || re.test(e.type) || re.test(e.customName || '') || re.test(e.profession || '')));
          const byType = {};
          for (const e of inCat) byType[e.type] = (byType[e.type] || 0) + 1;
          const dims = sortDims([...new Set(all.map(e => e.dimension))]);
          return (
            <>
              <div className="toolbar">
                <Tabs value={cat} onChange={v => { setCat(v); setType(null); }} items={CATS.map(c => ({ value: c.value, label: c.label, count: all.filter(c.test).length }))} />
              </div>
              <div className="toolbar">
                <Tabs value={dim} onChange={setDim} items={[{ value: 'all', label: 'Todas as dimensões' }, ...dims.map(d => ({ value: d, label: DIM_LABEL[d] || d, color: DIM_COLOR[d] }))]} />
                <SearchInput value={q} onChange={setQ} placeholder="Filtrar por tipo, nome ou profissão…" />
              </div>
              <div className="grid-side">
                <Panel title={`Por tipo (${Object.keys(byType).length})`} icon={PawPrint}>
                  <BarList
                    rows={Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ key: t, label: prettyName(t), value: n, icon: <MobIcon id={t} size={22} />, color: t === type ? 'var(--gold)' : 'var(--purple)' }))}
                    limit={25}
                    format={fmt}
                    onSelect={r => setType(type === r.key ? null : r.key)}
                  />
                </Panel>
                <Panel
                  title={`${fmt(list.length)} entidades`}
                  actions={type && <button type="button" className="chip" onClick={() => setType(null)}>{prettyName(type)} <X size={12} /></button>}
                  pad={false}
                >
                  {list.length === 0 ? <Empty /> : (
                    <TooltipScope>
                      {tip => (
                        <div className="table-wrap">
                          <table className="table">
                            <thead><tr><th /><th>Entidade</th><th>Dimensão</th><th>Posição</th><th>Vida</th></tr></thead>
                            <tbody>
                              {list.slice(0, limit).map((e, i) => <EntityRow key={`${e.uniqueId}-${i}`} e={e} ownerNames={ownerNames} tip={tip} />)}
                            </tbody>
                          </table>
                          {list.length > limit && <button type="button" className="btn btn-block" onClick={() => setLimit(limit + 300)}>Mostrar mais ({fmt(list.length - limit)} restantes)</button>}
                        </div>
                      )}
                    </TooltipScope>
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
