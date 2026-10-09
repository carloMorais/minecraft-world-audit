// Detail card of the selected map marker, one body per kind of marker.
import { Archive, Gem, Users, PawPrint, Bed, Hammer, Signpost, Heart, ArrowRight, Repeat, X, Crosshair, Filter, Cpu, Timer, Sparkles, ShoppingBag } from 'lucide-react';
import { Badge, BarList } from '../components/ui.jsx';
import { ItemIcon, MobIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { Slot, TooltipScope } from '../components/inventory.jsx';
import { blockColor } from '../../../src/extract/surface.js';
import { fmt, fmtCompact, prettyName, mobName, DIM_LABEL } from '../format.js';
import { CONTAINER_LABEL, containerItems } from '../containers.js';
import { professionLabel, TRADE_TIER } from '../domain.js';
import { LAYER, PORTAL_STATUS, portalStatus, FARM_KIND } from './layers.js';

const swatch = id => <span className="swatch" style={{ background: `rgb(${blockColor(id.split('[')[0]).join(',')})` }} />;
const xz = p => `${fmt(Math.floor(p[0]))}, ${fmt(Math.floor(p[2]))}`;

function Kv({ items }) {
  return (
    <div className="mk-kv">
      {items.filter(Boolean).map(([Icon, label, value]) => (
        <div key={label}><Icon size={13} /><span>{label}</span><b>{value}</b></div>
      ))}
    </div>
  );
}

export function Trades({ trades, tip, size = 34 }) {
  return (
    <div className="trades">
      {trades.map((t, i) => (
        <div key={i} className="trade">
          <Slot it={t.buyA} size={size} tipHandlers={tip} />
          {t.buyB ? <Slot it={t.buyB} size={size} tipHandlers={tip} /> : <span className="trade-gap" style={{ width: size }} />}
          <span className="trade-arrow">→</span>
          <Slot it={t.sell} size={size} tipHandlers={tip} />
          <small>{t.uses}/{t.maxUses}</small>
        </div>
      ))}
    </div>
  );
}

function BaseBody({ b, names, go }) {
  const items = Object.entries(b.items).slice(0, 40);
  const mobs = Object.entries(b.mobs).slice(0, 10);
  return (
    <>
      <div className="row-badges">
        {b.village && <Badge tone="gold" title={`Vila com ${b.village.dwellers ?? '?'} moradores`}>dentro de vila</Badge>}
        {b.spawnOf.map(k => <Badge key={k} tone="blue" title="O ponto de renascimento deste jogador fica aqui">spawn de {names.get(k) || k}</Badge>)}
        {b.playersHere.map(k => <Badge key={k} tone="green" title="Jogador estava aqui quando o mundo foi salvo">{names.get(k) || k} está aqui</Badge>)}
      </div>
      <Kv items={[
        [Hammer, 'Área', `${fmt(b.chunks)} chunks`],
        [Archive, 'Containers', fmt(b.containers)],
        [Archive, 'Itens guardados', fmtCompact(b.storedItems)],
        [Gem, 'Valor', `≈ ${fmt(b.value)} diamantes`],
        [Users, 'Aldeões', fmt(b.villagers)],
        [PawPrint, 'Pets', fmt(b.pets.length)],
        [Bed, 'Camas', fmt(b.beds)],
      ]} />
      <small className="muted mono">x {fmt(b.bounds.x[0])} → {fmt(b.bounds.x[1])} · z {fmt(b.bounds.z[0])} → {fmt(b.bounds.z[1])}</small>
      <h5>Blocos de construção</h5>
      <BarList rows={b.builtTop.map(([k, n]) => ({ key: k, label: prettyName(k), value: n, icon: swatch(k), color: `rgb(${blockColor(k).join(',')})` }))} limit={6} format={fmt} empty="Sem blocos típicos de construção" />
      {mobs.length > 0 && (
        <>
          <h5>Mobs</h5>
          <BarList rows={mobs.map(([t, n]) => ({ key: t, label: mobName(t), value: n, icon: <MobIcon id={t} size={18} />, color: 'var(--purple)' }))} limit={6} format={fmt} />
        </>
      )}
      {b.pets.length > 0 && (
        <div className="base-pets">
          {b.pets.map((p, i) => <span key={i} className="chip"><MobIcon id={p.type} size={16} /> {p.name || mobName(p.type)}{p.owner && <small className="muted"> · {names.get(p.owner) || 'dono'}</small>}</span>)}
        </div>
      )}
      <h5>Itens guardados <span className="muted">{Object.keys(b.items).length}</span></h5>
      {items.length ? (
        <div className="base-items">
          {items.map(([id, n]) => (
            <button type="button" key={id} className="base-item" onClick={() => go('items', { q: `^${id}$` })} title={`${prettyName(id)}: ${fmt(n)} — onde está?`}>
              <ItemIcon id={id} size={24} />
              <span>{prettyName(id)}</span>
              <b>{fmtCompact(n)}</b>
            </button>
          ))}
        </div>
      ) : <p className="muted small">Nenhum item guardado nos containers desta base.</p>}
      {b.signs.length > 0 && (
        <>
          <h5><Signpost size={12} /> Placas <span className="muted">{b.signs.length}</span></h5>
          <div className="base-signs">{b.signs.map((s, i) => <div key={i} className="base-sign"><p>{s.text}</p></div>)}</div>
        </>
      )}
    </>
  );
}

function PortalBody({ mk, onJump }) {
  const { portal: p, link: l, portals } = mk;
  const toDim = p.dimension === 'overworld' ? 'nether' : 'overworld';
  const to = l?.to != null ? portals[l.to] : null;
  const st = portalStatus(l);
  return (
    <>
      <div className="row-badges">
        <Badge tone={st === 'twoWay' ? 'green' : st === 'crossed' ? 'red' : 'gold'}>{st === 'twoWay' && <Repeat size={11} />} {PORTAL_STATUS[st].label}</Badge>
        <Badge>largura {p.span} · eixo {p.orientation.toUpperCase()}</Badge>
      </div>
      {to ? (
        <div className="portal-dest">
          <ArrowRight size={14} />
          <span>Leva a <b>{xz(to.position)}</b> no {DIM_LABEL[to.dimension]}<small className="muted"> · {fmt(Math.round(Math.max(Math.abs(to.position[0] - l.target[0]), Math.abs(to.position[2] - l.target[1]))))} blocos do ponto ideal</small></span>
        </div>
      ) : <p className="muted small">Nenhum portal perto do destino: ao atravessar, o jogo cria um novo perto de {fmt(l?.target[0])}, {fmt(l?.target[1])} no {DIM_LABEL[toDim]}.</p>}
      <div className="marker-actions">
        {to && <button type="button" className="btn btn-sm btn-primary" onClick={() => onJump(to.dimension, to.position[0], to.position[2], { layer: 'portals', key: String(to.index) })}>Ir para o destino</button>}
        {l && <button type="button" className="btn btn-sm" onClick={() => onJump(toDim, l.target[0], l.target[1], null, `Ponto ideal (${DIM_LABEL[toDim]})`)}>Ver ponto ideal</button>}
      </div>
    </>
  );
}

function EntityBody({ e, ownerNames }) {
  const items = [...(e.equipment || []), ...(e.inventory || []), ...(e.item ? [e.item] : [])];
  return (
    <TooltipScope>
      {tip => (
        <>
          <div className="row-badges">
            {e.profession && <Badge tone="gold">{professionLabel(e.profession)}{e.tradeTier != null ? ` · ${TRADE_TIER[e.tradeTier] || ''}` : ''}</Badge>}
            {e.tamed && <Badge tone="green">domesticado</Badge>}
            {e.baby && <Badge>filhote</Badge>}
            {e.ownerId && <Badge tone="blue">dono: {ownerNames?.[e.ownerId] || 'jogador'}</Badge>}
            {e.health && <Badge><Heart size={11} /> {e.health.current}/{e.health.max}</Badge>}
          </div>
          {e.trades?.length > 0 && <><h5>Trocas <span className="muted">{e.trades.length}</span></h5><Trades trades={e.trades} tip={tip} /></>}
          {items.length > 0 && <><h5>Itens</h5><div className="marker-items">{items.map((it, i) => <Slot key={i} it={it} size={34} tipHandlers={tip} />)}</div></>}
        </>
      )}
    </TooltipScope>
  );
}

function ChunkBody({ r }) {
  return (
    <>
      <Kv items={[
        [PawPrint, 'Entidades', fmt(r.entities)],
        [ShoppingBag, 'Itens no chão', fmt(r.items)],
        [Sparkles, 'Orbes de XP', fmt(r.xpOrbs)],
        [Filter, 'Funis', fmt(r.hoppers)],
        [Cpu, 'Blocos ativos', fmt(r.ticking)],
        [Timer, 'Ticks pendentes', fmt(r.pendingTicks)],
      ]} />
      {r.topMobs.length > 0 && <div className="mob-chips">{r.topMobs.map(([t, n]) => <span key={t} className="mob-chip" title={mobName(t)}><MobIcon id={t} size={20} />{fmt(n)}</span>)}</div>}
    </>
  );
}

/** Card of a marker. `full` adds the rich body (selected markers); hovering shows only the header. */
export function MarkerCard({ mk, full, go, names, ownerNames, onCenter, onClose, onJump }) {
  const L = LAYER[mk.layer];
  const color = mk.color || L.color;
  const items = mk.container ? containerItems(mk.container) : [];
  const kind = mk.container ? CONTAINER_LABEL[mk.container.id] || mk.container.id : L.label;
  return (
    <div className={`marker-card${full ? ' full' : ''}`} style={{ '--c': color }}>
      <div className="mk-head">
        <span className={mk.shape ? 'sq' : 'dot'} style={{ background: color }} />
        <div>
          <strong>{mk.container?.customName ? <McText text={mk.container.customName} /> : mk.label}</strong>
          <small>{kind}{mk.detail ? ` · ${mk.detail}` : ''}</small>
        </div>
        {full && onClose && <button type="button" className="icon-x" onClick={onClose} aria-label="Fechar"><X size={13} /></button>}
      </div>
      <code>X {fmt(Math.floor(mk.x))}{mk.y != null ? ` · Y ${mk.y}` : ''} · Z {fmt(Math.floor(mk.z))}</code>
      {items.length > 0 && (
        <TooltipScope>
          {tip => <div className="marker-items">{items.slice(0, full ? 54 : 27).map((it, i) => <Slot key={i} it={it} size={34} tipHandlers={tip} />)}</div>}
        </TooltipScope>
      )}
      {full && mk.base && <BaseBody b={mk.base} names={names} go={go} />}
      {full && mk.portal && <PortalBody mk={mk} onJump={onJump} />}
      {full && mk.entity && <EntityBody e={mk.entity} ownerNames={ownerNames} />}
      {full && mk.chunk && <ChunkBody r={mk.chunk} />}
      {full && mk.farm && <p className="muted small"><Badge tone={FARM_KIND[mk.farm.kind]?.tone}>{FARM_KIND[mk.farm.kind]?.label}</Badge> Um tipo de mob concentrado num espaço de 3×3 chunks.</p>}
      {full && mk.village && (
        <div className="row-badges">
          <Badge>{mk.village.pointsOfInterest?.villager ?? 0} camas</Badge>
          <Badge>{mk.village.playerReputation?.length ?? 0} jogadores conhecidos</Badge>
          {mk.village.raid && <Badge tone="red">Invasão em andamento</Badge>}
        </div>
      )}
      {full && mk.hit && mk.hit.where && <p className="small">{mk.hit.where}</p>}
      {full && (
        <div className="marker-actions">
          <button type="button" className="btn btn-sm" onClick={onCenter}><Crosshair size={13} /> Aproximar</button>
          {mk.player && <button type="button" className="btn btn-sm" onClick={() => go('players', { p: mk.player.key })}>Ver inventário</button>}
        </div>
      )}
    </div>
  );
}
