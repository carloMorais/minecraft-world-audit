// Global world records that have no place on the map: paper maps, scoreboard, saved structures,
// events, plus the world settings (game rules, add-ons).
import { useEffect, useRef, useState } from 'react';
import { Trophy, Building2, Settings2, Lock, Gavel, Puzzle } from 'lucide-react';
import { useQuery, call } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, Tabs, Empty, Badge, CoordLink } from '../components/ui.jsx';
import { fmt, DIM_LABEL, DIM_COLOR, prettyName } from '../format.js';

function MapItem({ m, go }) {
  const ref = useRef();
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let alive = true;
    call('mapItem', { id: m.id }).then(px => {
      if (!alive || !px || !ref.current) return setOk(false);
      const size = Math.sqrt(px.length / 4);
      ref.current.width = size; ref.current.height = size;
      ref.current.getContext('2d').putImageData(new ImageData(px, size, size), 0, 0);
      setOk(true);
    });
    return () => { alive = false; };
  }, [m.id]);
  return (
    <div className="map-item">
      <div className="map-paper"><canvas ref={ref} />{ok === false && <span className="muted">sem imagem</span>}</div>
      <div className="map-item-meta">
        <strong>Mapa {m.id}</strong>
        <small><span className="dot" style={{ background: DIM_COLOR[m.dimension] }} /> {DIM_LABEL[m.dimension] || m.dimension} · centro <CoordLink go={go} dim={m.dimension} position={[m.center[0], null, m.center[1]]} label={`Mapa ${m.id}`}>{fmt(m.center[0])}, {fmt(m.center[1])}</CoordLink></small>
        <small>escala {m.scale} · {m.exploredPercent}% explorado {m.locked && <Lock size={11} />}</small>
      </div>
    </div>
  );
}

/** Itens › Mapas: every paper map drawn in the world. */
export function PaperMaps({ go }) {
  const state = useQuery('misc');
  const [showEmpty, setShowEmpty] = useState(false);
  const [limit, setLimit] = useState(48);
  return (
    <Async state={state} loadingText="Lendo mapas…">
      {M => {
        const drawn = M.maps.filter(m => m.exploredPercent > 0);
        const list = (showEmpty ? M.maps : drawn).slice().sort((a, b) => b.exploredPercent - a.exploredPercent);
        return (
          <>
            <div className="toolbar">
              <label className="check"><input type="checkbox" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} /> Mostrar mapas vazios ({M.maps.length - drawn.length})</label>
            </div>
            {list.length === 0 ? <Empty text="Nenhum mapa desenhado" /> : (
              <div className="map-items">{list.slice(0, limit).map(m => <MapItem key={m.id} m={m} go={go} />)}</div>
            )}
            {list.length > limit && <button type="button" className="btn btn-block" onClick={() => setLimit(limit + 48)}>Mostrar mais</button>}
          </>
        );
      }}
    </Async>
  );
}

/** Avançado › Registros: scoreboard, saved structures and the other global records. */
export function WorldRecords() {
  const state = useQuery('misc');
  const [tab, setTab] = useHashParam('rec', 'scoreboard');
  return (
    <Async state={state} loadingText="Lendo registros do mundo…">
      {M => (
        <>
          <div className="toolbar">
            <Tabs label="Registro" value={tab} onChange={setTab} items={[
              { value: 'scoreboard', label: 'Scoreboard', icon: <Trophy size={14} />, count: M.scoreboard?.objectives.length || 0 },
              { value: 'structures', label: 'Estruturas salvas', icon: <Building2 size={14} />, count: M.structureTemplates.length },
              { value: 'other', label: 'Eventos e outros', icon: <Settings2 size={14} /> },
            ]} />
          </div>

          {tab === 'scoreboard' && (M.scoreboard?.objectives.length ? (
            <div className="card-grid">
              {M.scoreboard.objectives.map(o => (
                <Panel key={o.name} title={o.displayName} icon={Trophy}>
                  <small className="muted mono">{o.name} · {o.criteria}</small>
                  <ul className="scores">
                    {[...o.scores].sort((a, b) => b.score - a.score).map((s, i) => (
                      <li key={i}><span title={s.holder}>{s.kind === 'player' ? '👤 ' : ''}{s.holder.length > 48 ? `${s.holder.slice(0, 48)}…` : s.holder}</span><b>{fmt(s.score)}</b></li>
                    ))}
                  </ul>
                </Panel>
              ))}
            </div>
          ) : <Empty text="Scoreboard vazio: nenhum add-on registrou estatísticas" />)}

          {tab === 'structures' && (M.structureTemplates.length ? (
            <div className="card-grid">
              {M.structureTemplates.map(s => (
                <Panel key={s.name} title={s.name.replace(/^mystructure:/, '')} icon={Building2}>
                  <p className="muted">{s.size?.join(' × ')} blocos · origem {s.origin?.join(', ')}</p>
                  <p>{s.blockTypes} tipos de bloco · {s.entities} entidades</p>
                  <div className="row-badges">{s.palette.slice(0, 18).map(b => <Badge key={b}>{prettyName(b)}</Badge>)}{s.palette.length > 18 && <Badge>+{s.palette.length - 18}</Badge>}</div>
                </Panel>
              ))}
            </div>
          ) : <Empty text="Nenhuma estrutura salva com bloco de estrutura" />)}

          {tab === 'other' && (
            <div className="card-grid">
              <Panel title="Eventos de mobs">
                {M.mobEvents ? <ul className="scores">{Object.entries(M.mobEvents).map(([k, v]) => <li key={k}><span>{k.replace('minecraft:', '')}</span><b>{v ? 'ativo' : 'desligado'}</b></li>)}</ul> : <Empty />}
              </Panel>
              <Panel title="Wandering Trader">
                {M.wanderingTrader ? <ul className="scores">{Object.entries(M.wanderingTrader).map(([k, v]) => <li key={k}><span>{k}</span><b>{fmt(v)}</b></li>)}</ul> : <Empty />}
              </Panel>
              <Panel title="Ender Dragon">
                {M.dimensions.dragonFight ? <ul className="scores">{Object.entries(M.dimensions.dragonFight).map(([k, v]) => <li key={k}><span>{k}</span><b>{typeof v === 'boolean' ? (v ? 'sim' : 'não') : JSON.stringify(v)}</b></li>)}</ul> : <Empty />}
              </Panel>
              <Panel title="Ticking areas">
                {M.tickingAreas.length ? <ul className="scores">{M.tickingAreas.map((t, i) => <li key={i}><span>{t.name}</span><b>{t.min.join(',')} → {t.max.join(',')}</b></li>)}</ul> : <Empty text="Nenhuma" />}
              </Panel>
              <Panel title="Neve acumulada por bioma">
                {M.biomeSnowAccumulation.length ? <ul className="scores">{M.biomeSnowAccumulation.map((b, i) => <li key={i}><span>{b.biome}</span><b>{b.snow}</b></li>)}</ul> : <Empty />}
              </Panel>
            </div>
          )}
        </>
      )}
    </Async>
  );
}

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

/** Avançado › Configuração: game rules, add-on packs and experiments. */
export function WorldConfig() {
  const state = useQuery('level');
  return (
    <Async state={state} loadingText="Lendo o level.dat…">
      {L => {
        const rules = Object.entries(L.gameRules).filter(([k, v]) => typeof v === 'number' && (v === 0 || v === 1) && RULE_LABEL[k])
          .sort((a, b) => RULE_LABEL[a[0]].localeCompare(RULE_LABEL[b[0]], 'pt-BR'));
        const rulesOn = rules.filter(([, v]) => v), rulesOff = rules.filter(([, v]) => !v);
        const packs = [...L.behaviorPacks.map(p => ({ ...p, kind: 'BP' })), ...L.resourcePacks.map(p => ({ ...p, kind: 'RP' }))];
        const experiments = Object.entries(L.experiments).filter(([, v]) => v);
        return (
          <div className="grid-2">
            <Panel title="Regras do jogo" icon={Gavel}>
              <h4 className="sub-head">Ativadas <span>{rulesOn.length}</span></h4>
              <div className="rules">{rulesOn.map(([k]) => <span key={k} className="rule on" title={k}>{RULE_LABEL[k]}</span>)}</div>
              {rulesOff.length > 0 && (
                <>
                  <h4 className="sub-head">Desativadas <span>{rulesOff.length}</span></h4>
                  <div className="rules">{rulesOff.map(([k]) => <span key={k} className="rule off" title={k}>{RULE_LABEL[k]}</span>)}</div>
                </>
              )}
              <div className="rules-extra">
                {['randomtickspeed', 'spawnradius', 'playerssleepingpercentage', 'functioncommandlimit'].filter(k => k in L.gameRules).map(k => (
                  <span key={k}><code>{k}</code> <b>{L.gameRules[k]}</b></span>
                ))}
              </div>
            </Panel>
            <Panel title="Add-ons e experimentos" icon={Puzzle}>
              {packs.length === 0
                ? <p className="muted">Nenhum pacote instalado.</p>
                : (
                  <ul className="packs">
                    {packs.map((p, i) => (
                      <li key={`${p.id}${i}`} className={p.name ? '' : 'missing'}>
                        <Badge tone={p.kind === 'BP' ? 'green' : 'blue'} title={p.kind === 'BP' ? 'Pacote de comportamento' : 'Pacote de recursos'}>{p.kind}</Badge>
                        <span className="pack-name" title={p.name ? undefined : p.id}>
                          {p.name ? p.name.replace(/§./g, '') : <>Pacote não incluso no arquivo <code>{p.id.slice(0, 8)}</code></>}
                        </span>
                        <small>v{p.version}</small>
                      </li>
                    ))}
                  </ul>
                )}
              {experiments.length > 0 && (
                <>
                  <h4 className="sub-head">Experimentos <span>{experiments.length}</span></h4>
                  <div className="rules">{experiments.map(([k]) => <span key={k} className="rule exp">{k}</span>)}</div>
                </>
              )}
            </Panel>
          </div>
        );
      }}
    </Async>
  );
}
