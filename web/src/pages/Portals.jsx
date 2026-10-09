import { Waypoints, Info, ArrowRight, Repeat, AlertTriangle, Route } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, StatCard, CoordLink, Empty, Badge } from '../components/ui.jsx';
import { fmt, DIM_LABEL, DIM_COLOR } from '../format.js';

const xz = p => `${fmt(Math.floor(p[0]))}, ${fmt(Math.floor(p[2]))}`;
const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const Dim = ({ d }) => <span className="nowrap"><span className="dot" style={{ background: DIM_COLOR[d] }} /> {DIM_LABEL[d]}</span>;

function LinkRow({ l, portals, go }) {
  const from = portals[l.from];
  const to = l.to != null ? portals[l.to] : null;
  const toDim = from.dimension === 'overworld' ? 'nether' : 'overworld';
  const target = [l.target[0], null, l.target[1]];
  return (
    <tr>
      <td><Dim d={from.dimension} /></td>
      <td className="nowrap"><CoordLink go={go} dim={from.dimension} position={from.position} label="Portal">{xz(from.position)}</CoordLink> <small className="muted">Y {from.position[1]}</small></td>
      <td className="cell-icon"><ArrowRight size={14} /></td>
      <td className="nowrap">
        {to
          ? <><CoordLink go={go} dim={to.dimension} position={to.position} label="Portal">{xz(to.position)}</CoordLink> <small className="muted">{DIM_LABEL[to.dimension]}</small></>
          : <span className="muted">nenhum portal perto</span>}
      </td>
      <td>
        {!to && <Badge tone="gold" title="Ao atravessar, o jogo cria um portal novo perto deste ponto">o jogo cria um novo</Badge>}
        {to && l.twoWay && <Badge tone="green"><Repeat size={11} /> ida e volta</Badge>}
        {to && !l.twoWay && <Badge tone="red" title="Ao voltar por esse portal, você sai em outro lugar">volta cai em outro portal</Badge>}
      </td>
      <td className="nowrap">
        <CoordLink go={go} dim={toDim} position={target} label={`Ideal para o portal (${DIM_LABEL[toDim]})`}>{fmt(l.target[0])}, {fmt(l.target[1])}</CoordLink>
        {to && <small className="muted"> · {fmt(Math.round(Math.max(Math.abs(to.position[0] - l.target[0]), Math.abs(to.position[2] - l.target[1]))))} blocos do ideal</small>}
      </td>
    </tr>
  );
}

/** Pairs of Overworld portals both linked into the Nether: walking distance vs the Nether shortcut. */
function Shortcuts({ portals, links, go }) {
  const linked = links.filter(l => l.dimension === 'overworld' && l.to != null);
  const pairs = [];
  for (let i = 0; i < linked.length; i++) {
    for (let j = i + 1; j < linked.length; j++) {
      const a = portals[linked[i].from], b = portals[linked[j].from];
      const na = portals[linked[i].to], nb = portals[linked[j].to];
      if (na === nb) continue;
      const over = flat(a.position, b.position), nether = flat(na.position, nb.position);
      if (over < 64) continue;
      pairs.push({ a, b, over, nether, saved: over - nether });
    }
  }
  pairs.sort((x, y) => y.saved - x.saved);
  if (!pairs.length) return <Empty text="É preciso ter dois portais do Overworld ligados a portais diferentes no Nether" />;
  return (
    <div className="table-wrap short">
      <table className="table">
        <thead><tr><th>De</th><th>Para</th><th className="num">A pé no Overworld</th><th className="num">Pelo Nether</th><th className="num">Economia</th></tr></thead>
        <tbody>
          {pairs.slice(0, 50).map((p, i) => (
            <tr key={i}>
              <td className="nowrap"><CoordLink go={go} dim="overworld" position={p.a.position} label="Portal">{xz(p.a.position)}</CoordLink></td>
              <td className="nowrap"><CoordLink go={go} dim="overworld" position={p.b.position} label="Portal">{xz(p.b.position)}</CoordLink></td>
              <td className="num">{fmt(Math.round(p.over))} blocos</td>
              <td className="num">{fmt(Math.round(p.nether))} blocos</td>
              <td className="num"><strong className="good-text">{Math.round(100 * (1 - p.nether / p.over))}%</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Portals({ go }) {
  const state = useQuery('portals');
  return (
    <div className="page">
      <PageHeader title="Rede de portais" subtitle="Para onde leva cada portal do Nether, quais têm ida e volta e quanto caminho o Nether economiza." />
      <div className="note">
        <Info size={15} />
        <span>Aproximação da regra do jogo: o destino é a coordenada dividida por 8 (indo para o Nether) ou multiplicada por 8 (voltando), e o jogo usa o portal existente mais próximo, num raio de cerca de 16 blocos no Nether e 128 no Overworld. A altura também conta no jogo, então um portal muito acima ou abaixo pode mudar o resultado.</span>
      </div>
      <Async state={state} loadingText="Lendo portais…">
        {({ portals, links }) => {
          if (!portals.length) return <Empty text="Nenhum portal do Nether registrado neste mundo" />;
          const ow = portals.filter(p => p.dimension === 'overworld').length;
          const ne = portals.filter(p => p.dimension === 'nether').length;
          const twoWay = links.filter(l => l.twoWay).length;
          const broken = links.filter(l => l.to != null && !l.twoWay).length;
          const sorted = [...links].sort((a, b) => (a.dimension === b.dimension ? 0 : a.dimension === 'overworld' ? -1 : 1));
          return (
            <>
              <div className="stats-grid four">
                <StatCard icon={Waypoints} label="Portais no Overworld" value={fmt(ow)} tone="green" />
                <StatCard icon={Waypoints} label="Portais no Nether" value={fmt(ne)} tone="red" />
                <StatCard icon={Repeat} label="Com ida e volta" value={fmt(twoWay)} sub={`de ${fmt(links.length)} portais`} tone="teal" />
                <StatCard icon={AlertTriangle} label="Ligações cruzadas" value={fmt(broken)} sub="a volta sai em outro portal" tone="gold" />
              </div>
              <Panel title="Para onde cada portal leva" icon={Waypoints} pad={false}>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Dimensão</th><th>Portal</th><th /><th>Destino</th><th>Situação</th><th>Ponto ideal do outro lado</th></tr></thead>
                    <tbody>{sorted.map(l => <LinkRow key={`${l.dimension}:${l.from}`} l={l} portals={portals} go={go} />)}</tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Atalhos pelo Nether" icon={Route} actions={<small className="muted">pares de portais do Overworld</small>}>
                <Shortcuts portals={portals} links={links} go={go} />
              </Panel>
            </>
          );
        }}
      </Async>
    </div>
  );
}
