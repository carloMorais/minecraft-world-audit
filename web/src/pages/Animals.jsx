import { useQuery } from '../client.js';
import { Async, Panel, CoordLink, Empty } from '../components/ui.jsx';
import { PawPrint, MapPin } from 'lucide-react';
import McText from '../components/McText.jsx';
import { DIM_LABEL, DIM_COLOR } from '../format.js';

function AnimalRow({ entity, go }) {
  const name = entity.customName;
  const label = entity.type.replace(/^minecraft:/, '');

  return (
    <tr>
      <td>
        <span className="item-cell">
          <strong>{name ? <McText text={name} /> : <span className="muted">{label}</span>}</strong>
          {name && <small className="muted">{label}</small>}
        </span>
      </td>
      <td>
        {entity.owner ? entity.owner : <span className="muted">—</span>}
      </td>
      <td>
        <span className="dot" style={{ background: DIM_COLOR[entity.dimension] }} /> {DIM_LABEL[entity.dimension]}
      </td>
      <td className="nowrap">
        <CoordLink go={go} dim={entity.dimension} position={entity.position} label={name ? name.replace(/§./g, '') : label} />
      </td>
    </tr>
  );
}

export default function Animals({ go }) {
  const state = useQuery('summary');

  return (
    <div className="page">
      <Async state={state} loadingText="Carregando zoológico e animais…">
        {summary => {
          const entities = summary.entities.tamedOrOwned;
          const namedEntities = summary.entities.named.filter(e => !entities.some(t => t.position && e.position && t.position[0] === e.position[0] && t.position[1] === e.position[1] && t.position[2] === e.position[2]));

          const list = [...entities, ...namedEntities];

          if (list.length === 0) {
            return <Empty text="Nenhum animal de estimação ou com nome encontrado." />;
          }

          return (
            <Panel title="Zoológico e Animais de Estimação" icon={PawPrint} actions={<small className="muted">{list.length} animais</small>}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Dono</th>
                      <th>Dimensão</th>
                      <th>Coordenadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e, i) => <AnimalRow key={i} entity={e} go={go} />)}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        }}
      </Async>
    </div>
  );
}
