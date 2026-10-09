import { Trophy, PawPrint, Trees, Info, Skull, Sparkles } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Loading, ErrorBox, StatCard } from '../components/ui.jsx';
import { ItemIcon, MobIcon } from '../components/icons.jsx';
import { fmt, prettyName, mobName, DIM_LABEL, DIM_COLOR } from '../format.js';
import { ITEM_COLLECTIONS, TAMEABLE, CURRENT_BIOMES, BIOME_LABEL, colorOf } from '../collections.js';

function Progress({ have, total }) {
  const pct = total ? Math.round((100 * have) / total) : 0;
  return (
    <div className="coll-progress" title={`${have} de ${total}`}>
      <div className="track"><span style={{ width: `${pct}%`, background: have === total ? 'var(--gold)' : 'var(--accent)' }} /></div>
      <b>{have}/{total}</b>
    </div>
  );
}

/** A checklist panel: owned entries in full colour, missing ones faded. */
function Checklist({ title, icon, hint, entries }) {
  const have = entries.filter(e => e.have).length;
  return (
    <Panel title={title} icon={icon} actions={<Progress have={have} total={entries.length} />}>
      {hint && <p className="muted small coll-hint">{hint}</p>}
      <div className="coll-grid">
        {entries.map(e => {
          const Tag = e.onClick ? 'button' : 'div';
          return (
            <Tag key={e.key} type={e.onClick ? 'button' : undefined} className={`coll-tile${e.have ? ' have' : ''}`} onClick={e.onClick} title={e.have ? `${e.label}${e.count ? `: ${fmt(e.count)}` : ''}` : `${e.label} (falta)`}>
              <span className="coll-icon">{e.icon}</span>
              <span className="coll-label">{e.label}</span>
              {e.have && e.count != null && <small>{e.countLabel ?? fmt(e.count)}</small>}
            </Tag>
          );
        })}
      </div>
    </Panel>
  );
}

/** Achievements state, the dragon and what the world keeps (moved here from the overview). */
function Achievements({ S, go }) {
  const L = S.level;
  const dragon = S.dragonFight?.dragonKilled || S.dragonFight?.previouslyKilled;
  return (
    <Panel title="Conquistas e progresso" icon={Trophy}>
      <div className="kv-cards">
        <div className={`kv-card ${L.achievements.disabled ? 'bad' : 'good'}`}>
          <Trophy size={18} />
          <div>
            <strong>{L.achievements.disabled ? 'Conquistas desativadas' : 'Conquistas permitidas'}</strong>
            <small>{L.achievements.disabled ? `Motivo: ${L.achievements.reason.map(r => (r.includes('cheats') ? 'cheats/comandos ativados' : 'mundo já foi aberto no criativo')).join(' e ')}` : 'O progresso é salvo na conta Xbox, não no mundo.'}</small>
          </div>
        </div>
        <div className={`kv-card ${dragon ? 'good' : ''}`}>
          <Skull size={18} />
          <div>
            <strong>Ender Dragon {dragon ? 'derrotado' : 'ainda vivo'}</strong>
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
        <span>O Bedrock <b>não grava</b> no mundo estatísticas como mobs mortos ou blocos colocados/minerados. Elas só aparecem quando um add-on as registra no scoreboard (veja em <button type="button" className="link-btn" onClick={() => go('advanced', { tab: 'records' })}>Avançado › Registros</button>).</span>
      </div>
    </Panel>
  );
}

export default function Collections({ go }) {
  const items = useQuery('items');
  const summary = useQuery('summary');
  const biomes = useQuery('biomes');
  if (items.error) return <ErrorBox error={items.error} />;

  const totals = items.data || {};
  const lists = ITEM_COLLECTIONS.map(c => ({
    ...c,
    entries: c.ids.map(id => {
      const color = c.color ? colorOf(id) : null;
      return {
        key: id, label: prettyName(id), have: !!totals[id], count: totals[id],
        icon: color ? <span className="coll-swatch" style={{ background: color }}><ItemIcon id={id} size={28} /></span> : <ItemIcon id={id} size={32} />,
        onClick: totals[id] ? () => go('items', { q: `^${id}$` }) : undefined,
      };
    }),
  }));

  const tamed = {};
  for (const e of summary.data?.entities.tamedOrOwned || []) tamed[e.type] = (tamed[e.type] || 0) + 1;
  const tameEntries = TAMEABLE.map(id => ({
    key: id, label: mobName(id), have: !!tamed[id], count: tamed[id], icon: <MobIcon id={id} size={32} />,
    onClick: tamed[id] ? () => go('map', { view: 'mobs', cat: 'pets', type: id }) : undefined,
  }));

  const biomeLists = Object.entries(CURRENT_BIOMES).map(([dim, list]) => ({
    dim,
    entries: list.map(b => {
      const v = biomes.data?.[dim]?.[b];
      return {
        key: b, label: BIOME_LABEL[b] || b, have: !!v, count: v?.blocks, countLabel: v ? `${v.percent.toLocaleString('pt-BR')}%` : null,
        icon: <span className="coll-biome" style={{ '--c': DIM_COLOR[dim] }}><Trees size={18} /></span>,
      };
    }),
  }));

  const all = [...lists.flatMap(l => l.entries), ...tameEntries, ...(biomes.data ? biomeLists.flatMap(l => l.entries) : [])];
  const have = all.filter(e => e.have).length;

  return (
    <>
      {summary.data && <Achievements S={summary.data} go={go} />}
      {items.loading ? <Loading text="Somando itens do mundo…" /> : (
        <>
          <div className="stats-grid">
            <StatCard icon={Trophy} label="Progresso geral" value={`${Math.round((100 * have) / all.length)}%`} sub={`${fmt(have)} de ${fmt(all.length)} itens, mobs e biomas`} tone="gold" />
            <StatCard icon={PawPrint} label="Mobs domados" value={`${tameEntries.filter(e => e.have).length}/${tameEntries.length}`} sub="espécies com dono no mundo" tone="purple" />
            <StatCard icon={Trees} label="Biomas visitados" value={biomes.data ? `${biomeLists.reduce((s, l) => s + l.entries.filter(e => e.have).length, 0)}/${biomeLists.reduce((s, l) => s + l.entries.length, 0)}` : '…'} sub="nas áreas já geradas" tone="green" />
          </div>
          <div className="note"><Info size={15} /><span>Conta itens guardados em qualquer lugar: inventários, ender chests, baús, shulkers, molduras e mobs. Itens que já foram usados ou perdidos não aparecem. Clique em um item para ver onde ele está.</span></div>
          <div className="grid-2 coll-cols">
            {lists.map(l => <Checklist key={l.key} title={l.label} icon={Trophy} hint={l.hint} entries={l.entries} />)}
            <Checklist title="Mobs domados" icon={PawPrint} hint="Pets e montarias com dono, salvos no mundo agora" entries={tameEntries} />
          </div>
          {biomes.loading && <Loading text="Lendo biomas…" />}
          {biomes.data && biomeLists.map(l => (
            <Checklist key={l.dim} title={`Biomas — ${DIM_LABEL[l.dim]}`} icon={Trees} hint="Gerado não é o mesmo que visitado a pé: entra todo bioma que existe nos chunks salvos." entries={l.entries} />
          ))}
        </>
      )}
    </>
  );
}
