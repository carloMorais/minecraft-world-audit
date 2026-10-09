import { useMemo, useState } from 'react';
import { PawPrint, Heart, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, PageHeader, BarList, Tabs, SearchInput, Badge, Empty, CoordLink, useSort } from '../components/ui.jsx';
import { MobIcon } from '../components/icons.jsx';
import McText, { stripCodes } from '../components/McText.jsx';
import { TooltipScope, Slot } from '../components/inventory.jsx';
import { fmt, prettyName, mobName, DIM_LABEL, DIM_COLOR, sortDims, playerNames, hostOf, distance, fmtDistance } from '../format.js';

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

const PROFESSION = {
  farmer: 'Fazendeiro', fisherman: 'Pescador', shepherd: 'Pastor', fletcher: 'Flecheiro', librarian: 'Bibliotecário', cartographer: 'Cartógrafo',
  cleric: 'Clérigo', armorer: 'Armeiro', weaponsmith: 'Armeiro de armas', toolsmith: 'Ferramenteiro', butcher: 'Açougueiro',
  leatherworker: 'Coureiro', stone_mason: 'Pedreiro', mason: 'Pedreiro', nitwit: 'Bobo', unskilled: 'Desempregado',
};
const profession = p => PROFESSION[String(p).toLowerCase()] || p;

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

function EntityRow({ e, ownerNames, tip, go }) {
  const [open, setOpen] = useState(false);
  const expandable = e.trades?.length || e.inventory?.length || e.equipment?.length || e.item;
  return (
    <>
      <tr className={expandable ? 'clickable' : ''} onClick={() => expandable && setOpen(!open)} aria-expanded={expandable ? open : undefined}>
        <td className="cell-icon">{expandable ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}<MobIcon id={e.type} size={26} /></td>
        <td>
          <strong>{e.customName ? <McText text={e.customName} /> : e.name}</strong>
          {e.customName && <small className="muted"> {e.name}</small>}
          <div className="row-badges">
            {e.profession && <Badge tone="gold">{profession(e.profession)}</Badge>}
            {e.tamed && <Badge tone="green">domesticado</Badge>}
            {e.baby && <Badge>filhote</Badge>}
            {e.item && <Badge>{e.item.count}× {prettyName(e.item.item)}</Badge>}
            {e.ownerId && <Badge tone="blue">dono: {ownerNames[e.ownerId] || e.ownerId}</Badge>}
          </div>
        </td>
        <td className="nowrap" title={e.orphan ? 'Nenhum chunk referencia esta entidade; o jogo não a carrega mais' : undefined}><span className="dot" style={{ background: DIM_COLOR[e.dimension] }} /> {e.orphan ? 'Órfã' : DIM_LABEL[e.dimension] || e.dimension}</td>
        <td className="nowrap"><CoordLink go={go} dim={e.dimension} position={e.position} label={e.customName ? stripCodes(e.customName) : e.name} /></td>
        <td className="num nowrap muted">{fmtDistance(e.dist)}</td>
        <td className="nowrap">{e.health ? <span className="hp"><Heart size={12} /> {e.health.current}/{e.health.max}</span> : '—'}</td>
      </tr>
      {open && (
        <tr className="expand-row">
          <td colSpan={6}>
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

function EntityTable({ list, ownerNames, go, limit, setLimit }) {
  const [rows, th] = useSort(list, {
    name: e => (e.customName ? stripCodes(e.customName) : e.name), dim: e => e.dimension, dist: e => e.dist, hp: e => e.health?.current,
  });
  return (
    <TooltipScope>
      {tip => (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th />{th('name', 'Entidade')}{th('dim', 'Dimensão')}<th>Posição</th>{th('dist', 'Distância', { className: 'num' })}{th('hp', 'Vida', { firstDesc: true })}</tr></thead>
            <tbody>
              {rows.slice(0, limit).map((e, i) => <EntityRow key={`${e.uniqueId}-${i}`} e={e} ownerNames={ownerNames} tip={tip} go={go} />)}
            </tbody>
          </table>
          {rows.length > limit && <button type="button" className="btn btn-block" onClick={() => setLimit(limit + 300)}>Mostrar mais ({fmt(rows.length - limit)} restantes)</button>}
        </div>
      )}
    </TooltipScope>
  );
}

export default function Entities({ go }) {
  const state = useQuery('entities');
  const players = useQuery('players');
  const [type, setType] = useHashParam('type', '');
  const [cat, setCat] = useHashParam('cat', 'mobs');
  const [dim, setDim] = useHashParam('dim', 'all');
  const [q, setQ] = useHashParam('q', '');
  const [limit, setLimit] = useState(150);

  const ownerNames = useMemo(() => {
    const o = {};
    const names = playerNames(players.data);
    for (const p of players.data || []) if (p.uniqueId) o[p.uniqueId] = names.get(p.key);
    return o;
  }, [players.data]);
  const host = hostOf(players.data);
  // names and distances computed once per load, not on every filter keystroke
  const all = useMemo(() => (state.data || []).map(e => ({ ...e, name: mobName(e.type), dist: distance(host, e.dimension, e.position) })), [state.data, host]);

  const catDef = CATS.find(c => c.value === cat) || CATS[0];
  const inCat = useMemo(() => all.filter(e => catDef.test(e) && (dim === 'all' || e.dimension === dim)), [all, catDef, dim]);
  const list = useMemo(() => {
    const needle = q.toLowerCase();
    const hit = s => s && s.toLowerCase().includes(needle);
    return inCat.filter(e => (!type || e.type === type) && (!q || hit(e.type) || hit(e.name) || hit(e.customName && stripCodes(e.customName)) || hit(e.profession && profession(e.profession))));
  }, [inCat, type, q]);

  return (
    <div className="page">
      <PageHeader title="Mobs e entidades" subtitle="Todas as entidades salvas: mobs, pets e seus donos, aldeões com profissões e trocas, itens no chão." />
      <Async state={state} loadingText="Carregando entidades…">
        {() => {
          const byType = {};
          for (const e of inCat) byType[e.type] = (byType[e.type] || 0) + 1;
          const dims = sortDims([...new Set(all.map(e => e.dimension))]);
          return (
            <>
              <div className="toolbar">
                <Tabs label="Categoria" value={cat} onChange={v => { setCat(v); setType(''); }} items={CATS.map(c => ({ value: c.value, label: c.label, count: all.filter(c.test).length }))} />
              </div>
              <div className="toolbar">
                <Tabs label="Dimensão" value={dim} onChange={setDim} items={[{ value: 'all', label: 'Todas as dimensões' }, ...dims.map(d => ({ value: d, label: d === 'unknown' ? 'Órfãs' : DIM_LABEL[d] || d, color: DIM_COLOR[d] }))]} />
                <SearchInput value={q} onChange={setQ} placeholder="Filtrar por tipo, nome ou profissão…" />
              </div>
              <div className="grid-side">
                <Panel title={`Por tipo (${Object.keys(byType).length})`} icon={PawPrint}>
                  <BarList
                    rows={Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ key: t, label: mobName(t), value: n, icon: <MobIcon id={t} size={22} />, color: t === type ? 'var(--gold)' : 'var(--purple)', active: t === type }))}
                    limit={25}
                    format={fmt}
                    onSelect={r => setType(type === r.key ? '' : r.key)}
                  />
                </Panel>
                <Panel
                  title={`${fmt(list.length)} entidades`}
                  actions={type && <button type="button" className="chip chip-active" onClick={() => setType('')} title="Remover filtro">{mobName(type)} <X size={12} /></button>}
                  pad={false}
                >
                  {list.length === 0 ? (
                    <Empty text="Nenhuma entidade com esses filtros">
                      {(q || type || dim !== 'all') && <button type="button" className="link-btn" onClick={() => { setQ(''); setType(''); setDim('all'); }}>Limpar filtros</button>}
                    </Empty>
                  ) : <EntityTable list={list} ownerNames={ownerNames} go={go} limit={limit} setLimit={setLimit} />}
                </Panel>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
