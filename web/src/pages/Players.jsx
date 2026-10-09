import { useState } from 'react';
import { Heart, Drumstick, MapPin, Skull, Bed, Sparkles, BookOpen, Tag, Package, Crown } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, Badge, PageHeader, BarList, Empty, CoordLink } from '../components/ui.jsx';
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

export default function Players({ nav, go }) {
  const state = useQuery('players');
  const [sel, setSel] = useState(nav?.key || null);
  return (
    <div className="page">
      <PageHeader title="Jogadores" subtitle="Tudo o que o mundo guarda de cada jogador: inventário, armadura, ender chest, vida, XP, spawn e morte." />
      <Async state={state} loadingText="Lendo jogadores…">
        {players => {
          const idx = Math.max(0, players.findIndex(p => p.key === sel));
          const p = players[idx];
          const names = playerNames(players);
          return (
            <>
              <div className="player-tabs" role="tablist" aria-label="Jogadores">
                {players.map((pl, i) => (
                  <button type="button" role="tab" aria-selected={i === idx} key={pl.key} className={i === idx ? 'active' : ''} onClick={() => setSel(pl.key)}>
                    <span className="avatar" style={{ '--c': isHost(pl) ? 'var(--accent)' : 'var(--blue)' }}>{isHost(pl) ? 'H' : names.get(pl.key).split(' ')[1]}</span>
                    <div><strong>{names.get(pl.key)}</strong><small>Nível {pl.xp.level} · {fmt(Object.values(pl.itemTotals).reduce((a, b) => a + b, 0))} itens</small></div>
                  </button>
                ))}
              </div>
              {p ? <PlayerView key={p.key} p={p} name={names.get(p.key)} go={go} /> : <Empty text="Nenhum jogador salvo neste mundo" />}
            </>
          );
        }}
      </Async>
    </div>
  );
}
