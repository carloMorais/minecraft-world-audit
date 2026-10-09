import React from 'react';
import { Heart, Drumstick, MapPin, Skull, Bed, Sparkles, Columns3, Trophy, BookOpen, Tag, Package, Crown } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { TREASURES, treasureCount } from '../treasures.js';
import { Panel, Async, Badge, BarList, Empty, CoordLink, useSort } from '../components/ui.jsx';
import { Slot, SlotGrid, TooltipScope } from '../components/inventory.jsx';
import { ItemIcon } from '../components/icons.jsx';
import { fmt, prettyName, DIM_LABEL, GAMEMODE_LABEL, playerNames, isHost } from '../format.js';

const PERM = { visitor: 'Visitante', member: 'Membro', operator: 'Operador', custom: 'Personalizado' };

function Hearts({ value = 0, max = 20, icon: Icon, cls }) {
  const n = Math.ceil(max / 2);
  return (
    <div className={`pips ${cls}`} title={`${Math.round(value * 10) / 10} / ${max}`}>
      {Array.from({ length: n }, (_, i) => {
        const fill = Math.max(0, Math.min(1, (value - i * 2) / 2));
        return <span key={i} className="pip" style={{ '--f': fill }}><Icon size={15} /></span>;
      })}
    </div>
  );
}

function XpBar({ level, progress }) {
  return (
    <div className="xp">
      <div className="xp-bar"><span style={{ width: `${(progress || 0) * 100}%` }} /></div>
      <span className="xp-level">{level}</span>
    </div>
  );
}

function PlayerView({ p, name, go }) {
  const offhand = p.offhand?.[0];
  const armorBySlot = Object.fromEntries((p.armor || []).map(a => [a.slot, a]));
  const totals = Object.entries(p.itemTotals).sort((a, b) => b[1] - a[1]);
  return (
    <TooltipScope>
      {tip => (
        <div className="player-view">
          <div className="player-card">
            <div className="player-head">
              <span className="avatar big" style={{ '--c': isHost(p) ? 'var(--accent)' : 'var(--blue)' }}>{isHost(p) ? <Crown size={22} /> : name.split(' ')[1]}</span>
              <div>
                <h2>{name}</h2>
                {isHost(p) && <small className="muted">Jogador local, dono do mundo</small>}
                <div className="hero-badges">
                  {p.gameMode && <Badge tone="green">{GAMEMODE_LABEL[p.gameMode] || p.gameMode}</Badge>}
                  {p.permission && <Badge tone={p.permission === 'operator' ? 'gold' : 'neutral'}>{PERM[p.permission] || p.permission}</Badge>}
                  {p.dead && <Badge tone="red">Morto</Badge>}
                  {p.hasSeenCredits && <Badge tone="purple">Viu os créditos do End</Badge>}
                </div>
                {p.identity?.msaId && <small className="muted mono">MSA {p.identity.msaId}</small>}
              </div>
            </div>
            <div className="vitals">
              {p.health && <Hearts value={p.health.current} max={p.health.max} icon={Heart} cls="hearts" />}
              {p.hunger != null && <Hearts value={p.hunger} max={20} icon={Drumstick} cls="hunger" />}
              <XpBar level={p.xp.level} progress={p.xp.progress} />
            </div>
            <ul className="facts">
              <li><MapPin size={15} /><span>Posição</span><b>{DIM_LABEL[p.dimension]} · <CoordLink go={go} dim={p.dimension} position={p.position} label={name} /></b></li>
              <li><Bed size={15} /><span>Renascimento</span><b>{p.spawnPoint ? <>{DIM_LABEL[p.spawnPoint.dimension] || p.spawnPoint.dimension} · <CoordLink go={go} dim={p.spawnPoint.dimension} position={[p.spawnPoint.x, p.spawnPoint.y, p.spawnPoint.z]} label={`Spawn de ${name}`} /></> : 'spawn do mundo'}</b></li>
              <li><Skull size={15} /><span>Última morte</span><b>{p.hasDiedBefore && p.lastDeath ? <>{DIM_LABEL[p.lastDeath.dimension] || p.lastDeath.dimension} · <CoordLink go={go} dim={p.lastDeath.dimension} position={[p.lastDeath.x, p.lastDeath.y, p.lastDeath.z]} label={`Morte de ${name}`} /></> : 'nunca morreu'}</b></li>
              <li><BookOpen size={15} /><span>Receitas desbloqueadas</span><b>{fmt(p.unlockedRecipes.length)}</b></li>
              <li><Drumstick size={15} /><span>Fome / saturação</span><b>{p.hunger ?? '—'} / {p.saturation ?? '—'}</b></li>
            </ul>
            {p.effects.length > 0 && (
              <div className="effects">
                <h4><Sparkles size={14} /> Efeitos ativos</h4>
                {p.effects.map(e => <Badge key={e.id} tone="purple">{prettyName(e.name)} {e.amplifier + 1} · {Math.round(e.durationTicks / 20)}s</Badge>)}
              </div>
            )}
            {p.tags.length > 0 && (
              <div className="effects">
                <h4><Tag size={14} /> Tags</h4>
                {p.tags.map(t => <Badge key={t}>{t}</Badge>)}
              </div>
            )}
          </div>

          <div className="inv-col">
            <Panel title="Inventário" icon={Package}>
              <div className="mc-inventory">
                <div className="mc-equip">
                  {['head', 'chest', 'legs', 'feet'].map(s => <Slot key={s} it={armorBySlot[s]} label={{ head: 'Cabeça', chest: 'Peito', legs: 'Pernas', feet: 'Pés' }[s]} tipHandlers={tip} />)}
                  <div className="equip-gap" />
                  <Slot it={offhand} label="Mão 2" tipHandlers={tip} />
                </div>
                <div className="mc-main">
                  <SlotGrid items={p.inventory.filter(i => i.slot >= 9)} slots={27} startSlot={9} tipHandlers={tip} />
                  <div className="hotbar-sep" />
                  <div className="hotbar">
                    <SlotGrid items={p.inventory.filter(i => i.slot < 9)} slots={9} tipHandlers={tip} />
                    {p.selectedHotbarSlot != null && <span className="hotbar-sel" style={{ left: `calc(${p.selectedHotbarSlot} * (48px + var(--slot-gap)))` }} />}
                  </div>
                </div>
              </div>
            </Panel>
            <Panel title="Ender chest" icon={Package} actions={<small className="muted">{p.enderChest.length ? `${p.enderChest.length} de 27 slots ocupados` : 'vazio'}</small>}>
              <SlotGrid items={p.enderChest} slots={27} tipHandlers={tip} />
            </Panel>
            <Panel title="Total de itens carregados" icon={Package}>
              {totals.length ? (
                <BarList rows={totals.map(([id, n]) => ({ key: id, label: prettyName(id), value: n, icon: <ItemIcon id={id} size={22} /> }))} limit={10} format={fmt} />
              ) : <Empty text="Inventário vazio" />}
            </Panel>
          </div>
        </div>
      )}
    </TooltipScope>
  );
}

const COMPARE = TREASURES.filter(t => ['diamond', 'netherite', 'emerald', 'gold', 'totem', 'elytra', 'books', 'gapple'].includes(t.key));

/** Side-by-side table of every player; the leader of each column is highlighted. */
function Compare({ players, names, go, open }) {
  const rows = players.map(p => {
    const owned = { ...p.itemTotals };
    for (const [id, n] of Object.entries(p.enderChestTotals || {})) owned[id] = (owned[id] || 0) + n;
    const counts = Object.fromEntries(COMPARE.map(t => [t.key, treasureCount(t, owned)]));
    return { p, name: names.get(p.key), counts, items: Object.values(p.itemTotals).reduce((a, b) => a + b, 0) };
  });
  const best = Object.fromEntries(COMPARE.map(t => [t.key, Math.max(0, ...rows.map(r => r.counts[t.key]))]));
  const getters = { name: r => r.name, level: r => r.p.xp.level, hp: r => r.p.health?.current, items: r => r.items };
  for (const t of COMPARE) getters[t.key] = r => r.counts[t.key];
  const [sorted, th] = useSort(rows, getters);
  return (
    <Panel title="Comparar jogadores" icon={Columns3} pad={false} actions={<small className="muted"><Trophy size={12} /> = quem tem mais · conta inventário, ender chest e shulkers carregadas</small>}>
      <div className="table-wrap">
        <table className="table compare">
          <thead>
            <tr>
              {th('name', 'Jogador')}{th('level', 'Nível', { firstDesc: true, className: 'num' })}{th('hp', 'Vida', { firstDesc: true, className: 'num' })}{th('items', 'Itens', { firstDesc: true, className: 'num' })}
              {COMPARE.map(t => <React.Fragment key={t.key}>{th(t.key, <span className="th-item" title={t.label}><ItemIcon id={t.icon} size={18} /><span>{t.label}</span></span>, { firstDesc: true, className: 'num' })}</React.Fragment>)}
              <th>Posição</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.p.key} className="clickable" onClick={() => open(r.p.key)} title="Ver inventário">
                <td className="nowrap"><span className="avatar sm" style={{ '--c': isHost(r.p) ? 'var(--accent)' : 'var(--blue)' }}>{isHost(r.p) ? 'H' : r.name.split(' ')[1]}</span> <strong>{r.name}</strong>{r.p.hasDiedBefore && <Skull size={12} className="muted" title="Já morreu" />}</td>
                <td className="num">{r.p.xp.level}</td>
                <td className="num">{r.p.health ? Math.round(r.p.health.current) : '—'}</td>
                <td className="num">{fmt(r.items)}</td>
                {COMPARE.map(t => {
                  const n = r.counts[t.key];
                  const lead = n > 0 && n === best[t.key];
                  return <td key={t.key} className={`num${lead ? ' lead' : ''}${n ? '' : ' muted'}`}>{lead && <Trophy size={11} />}{n ? fmt(n) : '–'}</td>;
                })}
                <td className="nowrap">{DIM_LABEL[r.p.dimension]} <CoordLink go={go} dim={r.p.dimension} position={r.p.position} label={r.name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function Players({ go }) {
  const state = useQuery('players');
  const [sel, setSel] = useHashParam('p', '');
  const [view, setView] = useHashParam('view', '');
  return (
    <>
      <Async state={state} loadingText="Lendo jogadores…">
        {players => {
          const idx = Math.max(0, players.findIndex(p => p.key === sel));
          const comparing = view === 'compare' && players.length > 1;
          const p = players[idx];
          const names = playerNames(players);
          return (
            <>
              <div className="player-tabs" role="tablist" aria-label="Jogadores">
                {players.map((pl, i) => (
                  <button type="button" role="tab" aria-selected={!comparing && i === idx} key={pl.key} className={!comparing && i === idx ? 'active' : ''} onClick={() => { setSel(pl.key); setView(''); }}>
                    <span className="avatar" style={{ '--c': isHost(pl) ? 'var(--accent)' : 'var(--blue)' }}>{isHost(pl) ? 'H' : names.get(pl.key).split(' ')[1]}</span>
                    <div><strong>{names.get(pl.key)}</strong><small>Nível {pl.xp.level} · {fmt(Object.values(pl.itemTotals).reduce((a, b) => a + b, 0))} itens</small></div>
                  </button>
                ))}
                {players.length > 1 && (
                  <button type="button" role="tab" aria-selected={comparing} className={`compare-tab${comparing ? ' active' : ''}`} onClick={() => setView('compare')}>
                    <span className="avatar" style={{ '--c': 'var(--gold)' }}><Columns3 size={16} /></span>
                    <div><strong>Comparar</strong><small>todos lado a lado</small></div>
                  </button>
                )}
              </div>
              {comparing
                ? <Compare players={players} names={names} go={go} open={key => { setSel(key); setView(''); }} />
                : p ? <PlayerView key={p.key} p={p} name={names.get(p.key)} go={go} /> : <Empty text="Nenhum jogador salvo neste mundo" />}
            </>
          );
        }}
      </Async>
    </>
  );
}
