import {
  CalendarDays, Clock, Users, PawPrint, Mountain, Archive, Trophy, Skull, Copy, Check, Info, Puzzle, Gavel, Sparkles, Heart, Star,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '../client.js';
import { Panel, StatCard, BarList, Async, Badge } from '../components/ui.jsx';
import { MobIcon } from '../components/icons.jsx';
import { fmt, fmtCompact, prettyName, DIM_LABEL, DIM_COLOR, GAMEMODE_LABEL, DIFFICULTY_LABEL, timeAgo, pos, sortDims } from '../format.js';

const RULE_LABEL = {
  keepinventory: 'Manter inventário', dodaylightcycle: 'Ciclo dia/noite', doweathercycle: 'Ciclo do clima', mobgriefing: 'Mobs destroem blocos',
  domobspawning: 'Spawn de mobs', pvp: 'PvP', naturalregeneration: 'Regeneração natural', showcoordinates: 'Mostrar coordenadas',
  showdaysplayed: 'Mostrar dias jogados', dofiretick: 'Fogo se espalha', tntexplodes: 'TNT explode', doinsomnia: 'Phantoms (insônia)',
  falldamage: 'Dano de queda', firedamage: 'Dano de fogo', drowningdamage: 'Afogamento', freezedamage: 'Dano de congelamento',
  doimmediaterespawn: 'Renascer imediato', domobloot: 'Mobs dropam itens', dotiledrops: 'Blocos dropam itens', doentitydrops: 'Entidades dropam',
  commandblocksenabled: 'Blocos de comando', showdeathmessages: 'Mensagens de morte', recipesunlock: 'Desbloquear receitas',
  dolimitedcrafting: 'Crafting limitado', projectilescanbreakblocks: 'Projéteis quebram blocos', respawnblocksexplode: 'Âncoras explodem',
  tntexplosiondropdecay: 'Decaimento de drops de TNT', showtags: 'Mostrar tags', sendcommandfeedback: 'Feedback de comandos',
  commandblockoutput: 'Saída de blocos de comando', showrecipemessages: 'Mensagens de receita', showbordereffect: 'Efeito de borda',
};

function CopySeed({ seed }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="seed" onClick={() => { navigator.clipboard?.writeText(seed); setOk(true); setTimeout(() => setOk(false), 1500); }} title="Copiar seed">
      <span>Seed</span> <code>{seed}</code> {ok ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function Overview({ icon, go }) {
  const state = useQuery('summary');
  return (
    <Async state={state} loadingText="Montando o resumo do mundo…">
      {S => {
        const L = S.level;
        const totalChunks = Object.values(S.coverage).reduce((a, c) => a + c.chunks, 0);
        const topMobs = Object.entries(S.entities.byType).filter(([t]) => !/^minecraft:(item|xp_orb|arrow|falling_block)$/.test(t)).slice(0, 10);
        const rules = Object.entries(L.gameRules).filter(([k, v]) => typeof v === 'number' && (v === 0 || v === 1) && RULE_LABEL[k]);
        return (
          <div className="page">
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

            <div className="stats-grid">
              <StatCard icon={CalendarDays} label="Dias no jogo" value={fmt(L.time.daysPlayed)} sub={`tick ${fmtCompact(L.time.worldTimeTicks)}`} tone="gold" />
              <StatCard icon={Clock} label="Tempo de jogo" value={`${fmt(Math.round(L.time.approxPlayTimeHours))} h`} sub="tempo simulado com o mundo aberto" tone="blue" />
              <StatCard icon={Users} label="Jogadores" value={S.players.length} sub={`${S.players.filter(p => p.hasDiedBefore).length} já morreram`} tone="green" />
              <StatCard icon={PawPrint} label="Entidades" value={fmtCompact(S.entities.total)} sub={`${S.entities.tamedOrOwned.length} pets · ${S.entities.villagers.length} aldeões`} tone="purple" />
              <StatCard icon={Mountain} label="Chunks explorados" value={fmtCompact(totalChunks)} sub={`${fmtCompact(totalChunks * 256)} blocos²`} tone="teal" />
              <StatCard icon={Archive} label="Containers com itens" value={fmt(S.blockEntities.containersWithItems)} sub={`${fmt(S.blockEntities.unopenedLootContainers)} de loot nunca abertos`} tone="orange" />
            </div>

            <div className="grid-2">
              <Panel title="Jogadores" icon={Users} actions={<button type="button" className="link-btn" onClick={() => go('players')}>Ver inventários →</button>}>
                <div className="player-list">
                  {S.players.map(p => (
                    <button type="button" key={p.key} className="player-row" onClick={() => go('players', { key: p.key })}>
                      <span className="avatar" style={{ '--c': p.role.startsWith('local') ? 'var(--accent)' : 'var(--blue)' }}>{p.role.startsWith('local') ? 'H' : 'P'}</span>
                      <div className="player-row-main">
                        <strong>{p.role.startsWith('local') ? 'Jogador local (host)' : `Jogador ${p.key.replace('player_server_', '').slice(0, 8)}`}</strong>
                        <small>{DIM_LABEL[p.dimension]} · {pos(p.position)}</small>
                      </div>
                      <div className="player-row-stats">
                        <span title="Nível de XP"><Star size={13} /> {p.xp.level}</span>
                        <span title="Vida"><Heart size={13} /> {p.health ? Math.round(p.health.current) : '—'}</span>
                        <span title="Itens">{fmt(p.itemCount)} itens</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="Conquistas e progresso" icon={Trophy}>
                <div className="kv-cards">
                  <div className={`kv-card ${L.achievements.disabled ? 'bad' : 'good'}`}>
                    <Trophy size={18} />
                    <div>
                      <strong>{L.achievements.disabled ? 'Conquistas desativadas' : 'Conquistas permitidas'}</strong>
                      <small>{L.achievements.disabled ? `Motivo: ${L.achievements.reason.map(r => (r.includes('cheats') ? 'cheats/comandos ativados' : 'mundo já foi aberto no criativo')).join(' e ')}` : 'O progresso é salvo na conta Xbox, não no mundo.'}</small>
                    </div>
                  </div>
                  <div className={`kv-card ${S.dragonFight?.dragonKilled || S.dragonFight?.previouslyKilled ? 'good' : ''}`}>
                    <Skull size={18} />
                    <div>
                      <strong>Ender Dragon {S.dragonFight?.dragonKilled || S.dragonFight?.previouslyKilled ? 'derrotado' : 'ainda vivo'}</strong>
                      <small>{S.dragonFight ? `${S.dragonFight.gatewaysRemaining ?? '?'} portais de passagem restantes` : 'O End ainda não foi visitado'}</small>
                    </div>
                  </div>
                  <div className="kv-card">
                    <Sparkles size={18} />
                    <div>
                      <strong>{fmt(S.counts.villages)} vilas · {fmt(S.counts.portals)} portais · {fmt(S.counts.maps)} mapas</strong>
                      <small>{fmt(S.counts.objectives)} objetivos de scoreboard · {fmt(S.counts.structures)} estruturas salvas</small>
                    </div>
                  </div>
                </div>
                <div className="note">
                  <Info size={15} />
                  <span>O Bedrock <b>não grava</b> no mundo estatísticas como mobs mortos ou blocos colocados/minerados. Elas só aparecem quando um add-on as registra no scoreboard (veja em <button type="button" className="link-btn" onClick={() => go('world', { tab: 'scoreboard' })}>Scoreboard</button>).</span>
                </div>
              </Panel>
            </div>

            <div className="grid-3">
              <Panel title="Exploração por dimensão" icon={Mountain}>
                <div className="dim-bars">
                  {sortDims(Object.keys(S.coverage)).map(d => [d, S.coverage[d]]).map(([d, c]) => (
                    <div key={d} className="dim-bar">
                      <div className="dim-bar-head"><span className="dot" style={{ background: DIM_COLOR[d] }} />{DIM_LABEL[d]}<b>{fmt(c.chunks)} chunks</b></div>
                      <div className="track"><span style={{ width: `${(100 * c.chunks) / totalChunks}%`, background: DIM_COLOR[d] }} /></div>
                      <small>x {fmt(c.boundsBlocks.x[0])} → {fmt(c.boundsBlocks.x[1])} · z {fmt(c.boundsBlocks.z[0])} → {fmt(c.boundsBlocks.z[1])}</small>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-block" onClick={() => go('map')}>Abrir mapa do mundo</button>
              </Panel>

              <Panel title="Mobs mais comuns" icon={PawPrint} actions={<button type="button" className="link-btn" onClick={() => go('entities')}>Todos →</button>}>
                <BarList rows={topMobs.map(([t, n]) => ({ key: t, label: prettyName(t), value: n, icon: <MobIcon id={t} size={22} />, color: 'var(--purple)' }))} limit={10} format={fmt} />
              </Panel>

              <Panel title="Blocos especiais" icon={Archive}>
                <BarList rows={Object.entries(S.blockEntities.byType).map(([t, n]) => ({ key: t, label: t, value: n, color: 'var(--orange)' }))} limit={10} format={fmt} />
              </Panel>
            </div>

            <div className="grid-2">
              <Panel title="Regras do jogo" icon={Gavel}>
                <div className="rules">
                  {rules.map(([k, v]) => (
                    <span key={k} className={`rule ${v ? 'on' : 'off'}`} title={k}>{RULE_LABEL[k]}</span>
                  ))}
                </div>
                <div className="rules-extra">
                  {['randomtickspeed', 'spawnradius', 'playerssleepingpercentage', 'functioncommandlimit'].filter(k => k in L.gameRules).map(k => (
                    <span key={k}><code>{k}</code> {L.gameRules[k]}</span>
                  ))}
                </div>
              </Panel>
              <Panel title="Add-ons e experimentos" icon={Puzzle}>
                {[...L.behaviorPacks.map(p => ({ ...p, kind: 'Comportamento' })), ...L.resourcePacks.map(p => ({ ...p, kind: 'Recursos' }))].length === 0
                  ? <p className="muted">Nenhum pacote instalado.</p>
                  : (
                    <ul className="packs">
                      {[...L.behaviorPacks.map(p => ({ ...p, kind: 'BP' })), ...L.resourcePacks.map(p => ({ ...p, kind: 'RP' }))].map((p, i) => (
                        <li key={`${p.id}${i}`}>
                          <Badge tone={p.kind === 'BP' ? 'green' : 'blue'}>{p.kind}</Badge>
                          <span className="pack-name">{p.name ? p.name.replace(/§./g, '') : <i className="muted">{p.id} (não incluso no arquivo)</i>}</span>
                          <small>v{p.version}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                <div className="rules" style={{ marginTop: 12 }}>
                  {Object.entries(L.experiments).filter(([, v]) => v).map(([k]) => <span key={k} className="rule exp">{k}</span>)}
                </div>
              </Panel>
            </div>
          </div>
        );
      }}
    </Async>
  );
}
