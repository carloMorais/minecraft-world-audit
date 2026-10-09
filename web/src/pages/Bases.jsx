import { Castle, Info, Archive, Gem, Users, PawPrint, Bed, Hammer, Home, Signpost, X, ArrowLeft } from 'lucide-react';
import { useQuery } from '../client.js';
import { useHashParam } from '../route.js';
import { Panel, Async, PageHeader, BarList, StatCard, Badge, Empty, CoordLink, useSort } from '../components/ui.jsx';
import { ItemIcon, MobIcon } from '../components/icons.jsx';
import { blockColor } from '../../../src/extract/surface.js';
import { fmt, fmtCompact, prettyName, mobName, DIM_LABEL, DIM_COLOR, playerNames } from '../format.js';

const swatch = id => <span className="swatch" style={{ background: `rgb(${blockColor(id.split('[')[0]).join(',')})` }} />;

/** Display name of a base: sign text or named container, else its coordinates. */
export const baseName = b => b.name || `Base perto de ${fmt(b.center[0])}, ${fmt(b.center[1])}`;

const centerPos = b => [b.center[0], null, b.center[1]];

function BaseDetail({ b, names, go, onClose }) {
  const items = Object.entries(b.items).slice(0, 36);
  const mobs = Object.entries(b.mobs).slice(0, 12);
  return (
    <Panel
      title={baseName(b)}
      icon={Castle}
      className="base-detail"
      actions={<button type="button" className="icon-x" onClick={onClose} aria-label="Fechar detalhes"><X size={14} /></button>}
    >
      <div className="base-head">
        <span><span className="dot" style={{ background: DIM_COLOR[b.dimension] }} /> {DIM_LABEL[b.dimension]}</span>
        <CoordLink go={go} dim={b.dimension} position={centerPos(b)} label={baseName(b)}>{fmt(b.center[0])}, {fmt(b.center[1])}</CoordLink>
        <small className="muted mono">x {fmt(b.bounds.x[0])} → {fmt(b.bounds.x[1])} · z {fmt(b.bounds.z[0])} → {fmt(b.bounds.z[1])}</small>
        {b.village && <Badge tone="gold" title={`Vila com ${b.village.dwellers ?? '?'} moradores`}>dentro de vila</Badge>}
        {b.spawnOf.map(k => <Badge key={k} tone="blue" title="O ponto de renascimento deste jogador fica aqui">spawn de {names.get(k) || k}</Badge>)}
        {b.playersHere.map(k => <Badge key={k} tone="green" title="Jogador estava aqui quando o mundo foi salvo">{names.get(k) || k} está aqui</Badge>)}
      </div>
      <div className="stats-grid six">
        <StatCard icon={Hammer} label="Área" value={`${fmt(b.chunks)} chunks`} sub={`${fmtCompact(b.chunks * 256)} blocos²`} tone="teal" />
        <StatCard icon={Archive} label="Containers" value={fmt(b.containers)} sub={`${fmtCompact(b.storedItems)} itens guardados`} tone="orange" />
        <StatCard icon={Gem} label="Valor estimado" value={`≈ ${fmt(b.value)}`} sub="em diamantes" tone="blue" />
        <StatCard icon={Users} label="Aldeões" value={fmt(b.villagers)} sub={`${fmt(b.entities)} entidades no total`} tone="gold" />
        <StatCard icon={PawPrint} label="Pets" value={fmt(b.pets.length)} tone="purple" />
        <StatCard icon={Bed} label="Camas" value={fmt(b.beds)} sub={`${fmtCompact(b.builtBlocks)} blocos de construção`} tone="green" />
      </div>
      <div className="grid-2">
        <div>
          <h4 className="sub-head">Blocos de construção <span>{b.builtTop.length}</span></h4>
          <BarList rows={b.builtTop.map(([k, n]) => ({ key: k, label: prettyName(k), value: n, icon: swatch(k), color: `rgb(${blockColor(k).join(',')})` }))} limit={8} format={fmt} empty="Sem blocos típicos de construção" />
        </div>
        <div>
          <h4 className="sub-head">Mobs <span>{mobs.length}</span></h4>
          <BarList rows={mobs.map(([t, n]) => ({ key: t, label: mobName(t), value: n, icon: <MobIcon id={t} size={20} />, color: 'var(--purple)' }))} limit={8} format={fmt} empty="Nenhum mob aqui" />
          {b.pets.length > 0 && (
            <>
              <h4 className="sub-head">Pets</h4>
              <div className="base-pets">
                {b.pets.map((p, i) => (
                  <span key={i} className="chip"><MobIcon id={p.type} size={18} /> {p.name || mobName(p.type)}{p.owner && <small className="muted"> · {names.get(p.owner) || 'dono'}</small>}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <h4 className="sub-head">Itens guardados <span>{Object.keys(b.items).length}</span></h4>
      {items.length ? (
        <div className="base-items">
          {items.map(([id, n]) => (
            <button type="button" key={id} className="base-item" onClick={() => go('items', { q: `^${id}$` })} title={`${prettyName(id)}: ${fmt(n)} — onde está?`}>
              <ItemIcon id={id} size={28} />
              <span>{prettyName(id)}</span>
              <b>{fmtCompact(n)}</b>
            </button>
          ))}
        </div>
      ) : <Empty text="Nenhum item guardado nos containers desta base" />}
      {b.signs.length > 0 && (
        <>
          <h4 className="sub-head"><Signpost size={13} /> Placas <span>{b.signs.length}</span></h4>
          <div className="base-signs">
            {b.signs.map((s, i) => (
              <div key={i} className="base-sign">
                <p>{s.text}</p>
                <CoordLink go={go} dim={b.dimension} position={s.position} label="Placa" />
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

export default function Bases({ go }) {
  const state = useQuery('bases');
  const players = useQuery('players');
  const names = playerNames(players.data);
  const [id, setId] = useHashParam('id', '');
  const rows = state.data || [];
  const [sorted, th] = useSort(rows, {
    name: b => baseName(b), chunks: b => b.chunks, containers: b => b.containers, items: b => b.storedItems,
    value: b => b.value, villagers: b => b.villagers, pets: b => b.pets.length, score: b => b.score,
  });
  const selected = rows.find(b => String(b.id) === id);
  return (
    <div className="page">
      <PageHeader title="Bases" subtitle="Lugares onde os jogadores construíram, detectados pelo conteúdo de cada chunk: blocos de construção, baús com itens, placas, pets e camas." />
      <div className="note">
        <Info size={15} />
        <span>Estimativa: o Bedrock não registra quem construiu cada bloco. Chunks com muitos sinais de construção são agrupados em bases; estruturas geradas pelo jogo (trial chambers, ancient cities, ruínas) são descartadas, e vilas onde os jogadores mexeram aparecem marcadas como <b>dentro de vila</b>.</span>
      </div>
      <Async state={state} loadingText="Procurando bases…" loadingSub="Varre todos os chunks atrás de blocos de construção. Leva alguns segundos na primeira vez.">
        {B => (B.length === 0 ? <Empty text="Nenhuma base encontrada: o mundo parece ter só terreno e estruturas naturais." /> : (
          <>
            {selected && <BaseDetail b={selected} names={names} go={go} onClose={() => setId('')} />}
            {selected && <button type="button" className="link-btn" onClick={() => setId('')}><ArrowLeft size={13} /> Todas as bases</button>}
            <div className="stats-grid">
              <StatCard icon={Castle} label="Bases encontradas" value={fmt(B.length)} sub={`${fmt(B.reduce((a, b) => a + b.chunks, 0))} chunks construídos`} tone="green" />
              <StatCard icon={Archive} label="Itens guardados nelas" value={fmtCompact(B.reduce((a, b) => a + b.storedItems, 0))} sub={`em ${fmt(B.reduce((a, b) => a + b.containers, 0))} containers`} tone="orange" />
              <StatCard icon={Home} label="Maior base" value={baseName(B[0])} sub={`${fmt(B[0].chunks)} chunks · ≈ ${fmt(B[0].value)} diamantes`} tone="gold" onClick={() => setId(String(B[0].id))} action="Ver detalhes" />
            </div>
            <Panel title={`${B.length} bases`} icon={Castle} pad={false}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {th('name', 'Base')}
                      <th>Local</th>
                      {th('chunks', 'Chunks', { firstDesc: true })}
                      {th('containers', 'Containers', { firstDesc: true })}
                      {th('items', 'Itens', { firstDesc: true })}
                      {th('value', 'Valor', { firstDesc: true })}
                      {th('villagers', 'Aldeões', { firstDesc: true })}
                      {th('pets', 'Pets', { firstDesc: true })}
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(b => (
                      <tr key={b.id} className={`clickable${selected === b ? ' active' : ''}`} onClick={() => { setId(String(b.id)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <td><strong>{baseName(b)}</strong></td>
                        <td className="nowrap"><span className="dot" style={{ background: DIM_COLOR[b.dimension] }} /> <CoordLink go={go} dim={b.dimension} position={centerPos(b)} label={baseName(b)}>{fmt(b.center[0])}, {fmt(b.center[1])}</CoordLink></td>
                        <td className="num">{fmt(b.chunks)}</td>
                        <td className="num">{fmt(b.containers)}</td>
                        <td className="num">{fmtCompact(b.storedItems)}</td>
                        <td className="num">≈ {fmt(b.value)}</td>
                        <td className="num">{fmt(b.villagers)}</td>
                        <td className="num">{fmt(b.pets.length)}</td>
                        <td>
                          <div className="base-badges">
                            {b.village && <Badge tone="gold">dentro de vila</Badge>}
                            {b.spawnOf.length > 0 && <Badge tone="blue" title={b.spawnOf.map(k => names.get(k) || k).join(', ')}>spawn de {b.spawnOf.length === 1 ? names.get(b.spawnOf[0]) || 'jogador' : `${b.spawnOf.length} jogadores`}</Badge>}
                            {b.beds > 0 && <Badge>{fmt(b.beds)} camas</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ))}
      </Async>
    </div>
  );
}
