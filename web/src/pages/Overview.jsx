import {
  CalendarDays, Clock, ChevronRight, Gem, Users, PawPrint, Mountain, Archive, Copy, Check, Heart, Star,
  Castle, Store, Waypoints, Gauge, Trees, MapPin
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '../client.js';
import { Panel, StatCard, BarList, PieChart, Async, Badge } from '../components/ui.jsx';
import { MobIcon, ItemIcon } from '../components/icons.jsx';
import { TREASURES, treasureCount } from '../treasures.js';
import { fmt, fmtCompact, mobName, DIM_LABEL, DIM_COLOR, GAMEMODE_LABEL, DIFFICULTY_LABEL, timeAgo, pos, sortDims, playerNames, isHost, blockEntityLabel } from '../format.js';
import { CONTAINER_LABEL } from '../containers.js';


function CopySeed({ seed }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={`seed${ok ? ' copied' : ''}`} onClick={() => { navigator.clipboard?.writeText(seed); setOk(true); setTimeout(() => setOk(false), 1500); }} title="Copiar seed">
      <span>Seed</span> <code>{seed}</code> {ok ? <><Check size={14} /> <em>copiada</em></> : <Copy size={14} />}
    </button>
  );
}

function Hero({ L, icon }) {
  return (
    <div className="hero" style={icon ? { '--hero-img': `url(${icon})` } : undefined}>
      <div className="hero-overlay" />
      <div className="hero-content">
        {icon && <img className="hero-icon" src={icon} alt="" />}
        <div className="hero-text">
          <div className="hero-badges">
            <Badge tone="green">{GAMEMODE_LABEL[L.gameMode] || L.gameMode}</Badge>
            <Badge tone={L.difficulty === 'hard' ? 'red' : 'neutral'}>{DIFFICULTY_LABEL[L.difficulty] || L.difficulty}</Badge>
            {L.hardcore && <Badge tone="red"><Heart size={12} /> Hardcore</Badge>}
            {L.cheatsEnabled && <Badge tone="gold">Cheats ativos</Badge>}
            <Badge>Bedrock {L.lastOpenedWithVersion?.split('.').slice(0, 3).join('.')}</Badge>
          </div>
          <h1>{L.name}</h1>
          <p>Jogado pela última vez em {timeAgo(L.lastPlayed)}{L.timesOpened ? ` · aberto ${fmt(L.timesOpened)} vezes` : ''}</p>
          <CopySeed seed={L.seed} />
        </div>
      </div>
    </div>
  );
}

function PlayersPanel({ players, go }) {
  const names = playerNames(players);
  return (
    <Panel title="Jogadores" icon={Users} actions={<button type="button" className="link-btn" onClick={() => go('players')}>Ver inventários →</button>}>
      <div className="player-list">
        {players.map(p => (
          <button type="button" key={p.key} className="player-row" onClick={() => go('players', { p: p.key })}>
            <span className="avatar" style={{ '--c': isHost(p) ? 'var(--accent)' : 'var(--blue)' }}>{isHost(p) ? 'H' : names.get(p.key).split(' ')[1]}</span>
            <div className="player-row-main">
              <strong>{names.get(p.key)}{isHost(p) && <small className="muted"> · jogador local</small>}</strong>
              <small>{DIM_LABEL[p.dimension]} · {pos(p.position)}</small>
            </div>
            <div className="player-row-stats">
              <span title="Nível de XP"><Star size={13} /> {p.xp.level}</span>
              <span title="Vida"><Heart size={13} /> {p.health ? Math.round(p.health.current) : '—'}</span>
              <span title="Itens carregados">{fmt(Object.values(p.itemTotals).reduce((a, b) => a + b, 0))} itens</span>
              <ChevronRight size={15} className="row-go" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

/** Valuable items across the whole world; each one opens the item search. */
function Treasures({ totals, go }) {
  return (
    <Panel title="Tesouros do mundo" icon={Gem} actions={<small className="muted">somando baús, jogadores, shulkers e mobs</small>}>
      <div className="treasures">
        {TREASURES.map(t => {
          const n = treasureCount(t, totals);
          return (
            <button type="button" key={t.key} className={`treasure${n ? '' : ' none'}`} onClick={() => go('items', { q: t.q })} title={`Onde estão: ${t.label}`}>
              <ItemIcon id={t.icon} size={34} enchanted={t.key === 'books'} />
              <div>
                <strong>{fmt(n)}</strong>
                <small>{t.label}{t.hint ? ` (${t.hint})` : ''}</small>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

const MAP_VIEWS = [
  ['bases', 'Bases', Castle], ['containers', 'Baús', Archive], ['villagers', 'Vilas e aldeões', Store], ['portals', 'Portais', Waypoints],
  ['mobs', 'Mobs', PawPrint], ['lag', 'Lag e farms', Gauge], ['biomes', 'Biomas', Trees], ['graveyard', 'Cemitério', MapPin]
];

export default function Overview({ icon, go }) {
  const level = useQuery('level');
  const players = useQuery('players');
  const items = useQuery('items');
  const state = useQuery('summary');
  return (
    <div className="page">
      {level.data ? <Hero L={level.data} icon={icon} /> : <div className="hero hero-skeleton" />}
      <Async state={state} loadingText="Contando mobs, baús e blocos especiais…" loadingSub="O resumo aparece em seguida; os jogadores já estão abaixo.">
      {S => {
        const L = S.level;
        const totalChunks = Object.values(S.coverage).reduce((a, c) => a + c.chunks, 0);
        const topMobs = Object.entries(S.entities.byType).filter(([t]) => !/^minecraft:(item|xp_orb|arrow|falling_block)$/.test(t)).slice(0, 10);
        return (
          <>
            <div className="stats-grid six">
              <StatCard icon={CalendarDays} label="Dias no jogo" value={fmt(L.time.daysPlayed)} sub={`tick ${fmtCompact(L.time.worldTimeTicks)}`} tone="gold" />
              <StatCard icon={Clock} label="Tempo de jogo" value={`${fmt(Math.round(L.time.approxPlayTimeHours))} h`} sub="com o mundo aberto" tone="blue" />
              <StatCard icon={Users} label="Jogadores" value={S.players.length} sub={`${S.players.filter(p => p.hasDiedBefore).length} já morreram`} tone="green" onClick={() => go('players')} action="Ver jogadores e inventários" />
              <StatCard icon={PawPrint} label="Entidades" value={fmtCompact(S.entities.total)} sub={`${S.entities.tamedOrOwned.length} pets · ${S.entities.villagers.length} aldeões`} tone="purple" onClick={() => go('map', { view: 'mobs' })} action="Ver mobs no mapa" />
              <StatCard icon={Mountain} label="Chunks explorados" value={fmtCompact(totalChunks)} sub={`${fmtCompact(totalChunks * 256)} blocos²`} tone="teal" onClick={() => go('map')} action="Abrir o mapa" />
              <StatCard icon={Archive} label="Containers com itens" value={fmt(S.blockEntities.containersWithItems)} sub={`+${fmt(S.blockEntities.unopenedLootContainers)} de loot intactos`} tone="orange" onClick={() => go('items', { tab: 'containers' })} action="Ver baús e containers" />
            </div>

            {items.data && <Treasures totals={items.data} go={go} />}

            <div className="grid-2">
              {players.data && <PlayersPanel players={players.data} go={go} />}
              <details className="panel panel-collapsible" open>
                <summary><h3><Mountain size={16} />Exploração por dimensão</h3></summary>
                <div className="panel-body">
                  <div className="dim-bars">
                    {sortDims(Object.keys(S.coverage)).map(d => [d, S.coverage[d]]).map(([d, c]) => (
                      <button type="button" key={d} className="dim-bar" onClick={() => go('map', { dim: d })} title={`Abrir o mapa do ${DIM_LABEL[d]}`}>
                        <div className="dim-bar-head"><span className="dot" style={{ background: DIM_COLOR[d] }} />{DIM_LABEL[d]}<b>{fmt(c.chunks)} chunks</b></div>
                        <div className="track"><span style={{ width: `${(100 * c.chunks) / totalChunks}%`, background: DIM_COLOR[d] }} /></div>
                        <small>x {fmt(c.boundsBlocks.x[0])} → {fmt(c.boundsBlocks.x[1])} · z {fmt(c.boundsBlocks.z[0])} → {fmt(c.boundsBlocks.z[1])} · Distância máx: {fmt(Math.max(Math.abs(c.boundsBlocks.x[0]), Math.abs(c.boundsBlocks.x[1]), Math.abs(c.boundsBlocks.z[0]), Math.abs(c.boundsBlocks.z[1])))} blocos</small>
                      </button>
                    ))}
                  </div>
                  <h4 className="sub-head">Explorar no mapa</h4>
                  <div className="view-links">
                    {MAP_VIEWS.map(([id, label, Icon]) => <button type="button" key={id} className="chip" onClick={() => go('map', { view: id })}><Icon size={14} /> {label}</button>)}
                  </div>
                </div>
              </details>
            </div>

            <div className="grid-2">
              <Panel title="Mobs mais comuns" icon={PawPrint} actions={<button type="button" className="link-btn" onClick={() => go('map', { view: 'mobs' })}>No mapa →</button>}>
                <PieChart data={topMobs.map(([t, n], i) => ({ key: t, label: mobName(t), value: n, color: `hsl(${260 + i * 20}, 70%, 65%)` }))} format={fmtCompact} />
              </Panel>
              <Panel title="Blocos especiais" icon={Archive}>
                <PieChart data={Object.entries(S.blockEntities.byType).sort((a, b) => b[1] - a[1]).map(([t, n], i) => ({ key: t, label: blockEntityLabel(t, CONTAINER_LABEL), value: n, color: `hsl(${30 + i * 15}, 80%, 55%)` }))} format={fmtCompact} />
              </Panel>
            </div>
          </>
        );
      }}
      </Async>
      {!state.data && !state.error && players.data && <div className="grid-2"><PlayersPanel players={players.data} go={go} /></div>}
    </div>
  );
}
