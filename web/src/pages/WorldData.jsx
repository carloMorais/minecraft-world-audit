import { useEffect, useRef, useState } from 'react';
import { Home, Map as MapIcon, DoorOpen, Trophy, Building2, Settings2, Lock } from 'lucide-react';
import { useQuery, call } from '../client.js';
import { Panel, Async, PageHeader, Tabs, Empty, Badge } from '../components/ui.jsx';
import { fmt, DIM_LABEL, DIM_COLOR, prettyName } from '../format.js';

function MapItem({ m }) {
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
        <small><span className="dot" style={{ background: DIM_COLOR[m.dimension] }} /> {DIM_LABEL[m.dimension] || m.dimension} · centro {fmt(m.center[0])}, {fmt(m.center[1])}</small>
        <small>escala {m.scale} · {m.exploredPercent}% explorado {m.locked && <Lock size={11} />}</small>
      </div>
    </div>
  );
}

function Maps({ maps }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const [limit, setLimit] = useState(48);
  const list = maps.filter(m => showEmpty || m.exploredPercent > 0).sort((a, b) => b.exploredPercent - a.exploredPercent);
  return (
    <>
      <div className="toolbar">
        <label className="check"><input type="checkbox" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} /> Mostrar mapas vazios ({maps.length - maps.filter(m => m.exploredPercent > 0).length})</label>
      </div>
      {list.length === 0 ? <Empty text="Nenhum mapa desenhado" /> : (
        <div className="map-items">{list.slice(0, limit).map(m => <MapItem key={m.id} m={m} />)}</div>
      )}
      {list.length > limit && <button type="button" className="btn btn-block" onClick={() => setLimit(limit + 48)}>Mostrar mais</button>}
    </>
  );
}

const POI = { villager: 'Camas', undefined: 'Sinos/encontro', farmer: 'Composteira', librarian: 'Atril', armorer: 'Alto-forno', weaponsmith: 'Rebolo', toolsmith: 'Mesa de ferraria', fletcher: 'Mesa de arco', cartographer: 'Mesa de cartografia', cleric: 'Suporte de poções', fisherman: 'Barril', shepherd: 'Tear', butcher: 'Defumador', leatherworker: 'Caldeirão', mason: 'Cortador de pedras' };

export default function WorldData({ nav }) {
  const state = useQuery('misc');
  const [tab, setTab] = useState(nav?.tab || 'villages');
  return (
    <div className="page">
      <PageHeader title="Vilas, mapas e mais" subtitle="Registros globais do mundo: vilas, mapas de papel, portais, scoreboard (estatísticas de add-ons), estruturas e eventos." />
      <Async state={state} loadingText="Lendo registros do mundo…">
        {M => (
          <>
            <div className="toolbar">
              <Tabs value={tab} onChange={setTab} items={[
                { value: 'villages', label: 'Vilas', icon: <Home size={14} />, count: M.villages.length },
                { value: 'maps', label: 'Mapas', icon: <MapIcon size={14} />, count: M.maps.length },
                { value: 'portals', label: 'Portais', icon: <DoorOpen size={14} />, count: M.portals.length },
                { value: 'scoreboard', label: 'Scoreboard', icon: <Trophy size={14} />, count: M.scoreboard?.objectives.length || 0 },
                { value: 'structures', label: 'Estruturas', icon: <Building2 size={14} />, count: M.structureTemplates.length },
                { value: 'other', label: 'Outros', icon: <Settings2 size={14} /> },
              ]} />
            </div>

            {tab === 'villages' && (M.villages.length ? (
              <div className="card-grid">
                {M.villages.map(v => (
                  <Panel key={v.id} title={`Vila em ${v.bounds ? `${fmt(Math.round((v.bounds.min[0] + v.bounds.max[0]) / 2))}, ${fmt(Math.round((v.bounds.min[2] + v.bounds.max[2]) / 2))}` : v.id.slice(0, 8)}`} icon={Home}>
                    <div className="village-stats">
                      <div><strong>{v.dwellers ?? '—'}</strong><small>moradores</small></div>
                      <div><strong>{v.pointsOfInterest?.villager ?? '—'}</strong><small>camas</small></div>
                      <div><strong>{v.playerReputation?.length ?? 0}</strong><small>jogadores conhecidos</small></div>
                    </div>
                    {v.bounds && <p className="muted mono small">x {v.bounds.min[0]}→{v.bounds.max[0]} · y {v.bounds.min[1]}→{v.bounds.max[1]} · z {v.bounds.min[2]}→{v.bounds.max[2]}</p>}
                    <div className="row-badges">
                      {Object.entries(v.pointsOfInterest || {}).filter(([k]) => k !== 'villager').map(([k, n]) => <Badge key={k}>{POI[k] || k}: {n}</Badge>)}
                    </div>
                    {v.raid && <Badge tone="red">Invasão em andamento</Badge>}
                  </Panel>
                ))}
              </div>
            ) : <Empty text="Nenhuma vila registrada" />)}

            {tab === 'maps' && <Maps maps={M.maps} />}

            {tab === 'portals' && (M.portals.length ? (
              <Panel pad={false}>
                <table className="table">
                  <thead><tr><th>Dimensão</th><th>Posição</th><th>Largura</th><th>Eixo</th></tr></thead>
                  <tbody>{M.portals.map((p, i) => <tr key={i}><td><span className="dot" style={{ background: DIM_COLOR[p.dimension] }} /> {DIM_LABEL[p.dimension]}</td><td className="mono">{p.position.join(', ')}</td><td>{p.span}</td><td>{p.orientation.toUpperCase()}</td></tr>)}</tbody>
                </table>
              </Panel>
            ) : <Empty text="Nenhum portal registrado" />)}

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
            ) : <Empty text="Scoreboard vazio" />)}

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
    </div>
  );
}
