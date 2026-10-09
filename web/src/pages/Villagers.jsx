import { useMemo } from 'react';
import { Store, BookOpen, Gem, Home, Users, Baby, UserX, Info, Warehouse } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, PageHeader, BarList, StatCard, Badge, CoordLink, Empty, useSort } from '../components/ui.jsx';
import { ItemIcon, MobIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { fmt, prettyName, mobName, DIM_LABEL, DIM_COLOR, ENCHANT_LABEL, roman } from '../format.js';

const PROFESSION = {
  farmer: 'Fazendeiro', fisherman: 'Pescador', shepherd: 'Pastor', fletcher: 'Flecheiro', librarian: 'Bibliotecário', cartographer: 'Cartógrafo',
  cleric: 'Clérigo', armorer: 'Armeiro', weaponsmith: 'Armeiro de armas', toolsmith: 'Ferramenteiro', butcher: 'Açougueiro',
  leatherworker: 'Coureiro', stone_mason: 'Pedreiro', mason: 'Pedreiro', nitwit: 'Bobo', unskilled: 'Desempregado', none: 'Desempregado',
};
const UNEMPLOYED = new Set(['unskilled', 'none']);
const profKey = v => String(v.profession ?? 'none').toLowerCase();
const TIER = ['Novato', 'Aprendiz', 'Artesão', 'Especialista', 'Mestre'];
// Highest level of each enchantment, to flag the books that are already maxed out.
const MAX_LEVEL = {
  protection: 4, fire_protection: 4, feather_falling: 4, blast_protection: 4, projectile_protection: 4, thorns: 3, respiration: 3, depth_strider: 3,
  aqua_affinity: 1, sharpness: 5, smite: 5, bane_of_arthropods: 5, knockback: 2, fire_aspect: 2, looting: 3, efficiency: 5, silk_touch: 1,
  unbreaking: 3, fortune: 3, power: 5, punch: 2, flame: 1, infinity: 1, luck_of_the_sea: 3, lure: 3, frost_walker: 2, mending: 1,
  impaling: 5, riptide: 3, loyalty: 3, channeling: 1, multishot: 1, piercing: 4, quick_charge: 3, soul_speed: 3, swift_sneak: 3,
  binding_curse: 1, vanishing_curse: 1, density: 5, breach: 4, wind_burst: 3,
};
const POI_SKIP = new Set(['villager', 'undefined']);
const emeraldsIn = t => [t.buyA, t.buyB].reduce((s, it) => s + (it?.item === 'minecraft:emerald' ? it.count : 0), 0);
const villagerName = v => (v.customName ? <McText text={v.customName} /> : PROFESSION[profKey(v)] || mobName(v.type));

/** Clusters of at least `min` villagers inside a 3×3-chunk window (trading halls, breeders, iron farms). */
function crowds(villagers, min = 6) {
  const byChunk = new Map();
  for (const v of villagers) {
    if (!v.position) continue;
    const k = `${v.dimension}:${Math.floor(v.position[0] / 16)}:${Math.floor(v.position[2] / 16)}`;
    byChunk.set(k, [...(byChunk.get(k) || []), v]);
  }
  const used = new Set(), out = [];
  const ranked = [...byChunk.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [k] of ranked) {
    if (used.has(k)) continue;
    const [dim, cx, cz] = k.split(':');
    const members = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const kk = `${dim}:${+cx + dx}:${+cz + dz}`;
      if (used.has(kk)) continue;
      members.push(...(byChunk.get(kk) || []));
    }
    if (members.length < min) continue;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) used.add(`${dim}:${+cx + dx}:${+cz + dz}`);
    const profs = {};
    for (const v of members) profs[profKey(v)] = (profs[profKey(v)] || 0) + 1;
    const avg = i => members.reduce((s, v) => s + v.position[i], 0) / members.length;
    const center = [avg(0), avg(1), avg(2)];
    out.push({ dimension: dim, count: members.length, center, profs: Object.entries(profs).sort((a, b) => b[1] - a[1]) });
  }
  return out;
}

function BookDeals({ villagers, go }) {
  const deals = useMemo(() => {
    const best = {};
    for (const v of villagers) {
      for (const t of v.trades || []) {
        if (t.sell?.item !== 'minecraft:enchanted_book') continue;
        const price = emeraldsIn(t);
        for (const e of t.sell.enchantments || []) {
          const k = `${e.name}|${e.level}`;
          if (!best[k] || price < best[k].price) best[k] = { key: k, name: e.name, level: e.level, price, villager: v, uses: t.uses, maxUses: t.maxUses, offers: (best[k]?.offers || 0) + 1 };
          else best[k].offers++;
        }
      }
    }
    return Object.values(best).map(d => ({ ...d, label: ENCHANT_LABEL[d.name] || d.name, max: d.level >= (MAX_LEVEL[d.name] ?? 99) }));
  }, [villagers]);
  const [rows, th] = useSort(deals, { ench: d => d.label, price: d => d.price, offers: d => d.offers }, 'price');
  if (!deals.length) return <Empty text="Nenhum bibliotecário está vendendo livros encantados" />;
  return (
    <div className="table-wrap short">
      <table className="table">
        <thead><tr><th />{th('ench', 'Encantamento')}{th('price', 'Preço', { className: 'num' })}{th('offers', 'Ofertas', { className: 'num', firstDesc: true })}<th>Melhor aldeão</th><th>Local</th></tr></thead>
        <tbody>
          {rows.map(d => (
            <tr key={d.key}>
              <td className="cell-icon"><ItemIcon id="minecraft:enchanted_book" size={26} enchanted /></td>
              <td><strong>{d.label} {roman(d.level)}</strong>{d.max && <> <Badge tone="gold" title="Nível máximo deste encantamento">máx.</Badge></>}{d.name === 'mending' && <> <Badge tone="purple">Remendo!</Badge></>}</td>
              <td className="num nowrap">{fmt(d.price)} <ItemIcon id="minecraft:emerald" size={16} /> <small className="muted">+ livro</small></td>
              <td className="num">{fmt(d.offers)}</td>
              <td>{villagerName(d.villager)} <small className="muted">{TIER[d.villager.tradeTier] || ''}{d.uses >= d.maxUses ? ' · esgotado' : ''}</small></td>
              <td className="nowrap"><CoordLink go={go} dim={d.villager.dimension} position={d.villager.position} label={`${d.label} ${roman(d.level)}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Items villagers buy for emeralds, with the fewest items needed per emerald. */
function EmeraldSources({ villagers, go }) {
  const rows = useMemo(() => {
    const best = {};
    for (const v of villagers) {
      for (const t of v.trades || []) {
        if (t.sell?.item !== 'minecraft:emerald' || !t.buyA || t.buyB) continue;
        const per = t.buyA.count / t.sell.count;
        const k = t.buyA.item;
        if (!best[k] || per < best[k].per) best[k] = { item: k, per, villager: v, count: (best[k]?.count || 0) + 1 };
        else best[k].count++;
      }
    }
    return Object.values(best).sort((a, b) => a.per - b.per);
  }, [villagers]);
  if (!rows.length) return <Empty text="Nenhum aldeão compra itens por esmeraldas" />;
  return (
    <div className="table-wrap short">
      <table className="table">
        <thead><tr><th /><th>Item</th><th className="num">Por esmeralda</th><th className="num">Aldeões</th><th>Melhor aldeão</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.item}>
              <td className="cell-icon"><ItemIcon id={r.item} size={26} /></td>
              <td><strong>{prettyName(r.item)}</strong></td>
              <td className="num">{fmt(+r.per.toFixed(1))}</td>
              <td className="num">{fmt(r.count)}</td>
              <td className="nowrap">{villagerName(r.villager)} <CoordLink go={go} dim={r.villager.dimension} position={r.villager.position} label={prettyName(r.item)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Villagers({ go }) {
  const state = useQuery('villagers');
  return (
    <div className="page">
      <PageHeader title="Aldeões e trocas" subtitle="Profissões, os livros encantados mais baratos, quem compra o quê por esmeraldas, vilas e aglomerações de aldeões." />
      <Async state={state} loadingText="Lendo aldeões e vilas…">
        {({ villagers: all, villages }) => {
          const villagers = all.filter(v => /villager/.test(v.type));
          const traders = all.filter(v => /wandering_trader/.test(v.type));
          const profs = {};
          for (const v of villagers) if (!v.baby) profs[profKey(v)] = (profs[profKey(v)] || 0) + 1;
          const unemployed = villagers.filter(v => !v.baby && UNEMPLOYED.has(profKey(v))).length;
          const nitwits = villagers.filter(v => profKey(v) === 'nitwit').length;
          const babies = villagers.filter(v => v.baby).length;
          const halls = crowds(villagers);
          return (
            <>
              <div className="stats-grid four">
                <StatCard icon={Users} label="Aldeões" value={fmt(villagers.length)} sub={traders.length ? `+ ${traders.length} vendedor(es) ambulante(s)` : `${villages.length} vilas registradas`} tone="gold" />
                <StatCard icon={UserX} label="Desempregados" value={fmt(unemployed)} sub="adultos sem bloco de trabalho" tone="orange" />
                <StatCard icon={Baby} label="Bebês" value={fmt(babies)} sub={`${fmt(nitwits)} bobo(s), que nunca trabalham`} tone="blue" />
                <StatCard icon={Warehouse} label="Aglomerações" value={fmt(halls.length)} sub="6+ aldeões num espaço de 3×3 chunks" tone="purple" />
              </div>
              <div className="grid-2">
                <Panel title="Profissões" icon={Store}>
                  <BarList rows={Object.entries(profs).sort((a, b) => b[1] - a[1]).map(([p, n]) => ({ key: p, label: PROFESSION[p] || p, value: n, color: UNEMPLOYED.has(p) || p === 'nitwit' ? 'var(--faint)' : 'var(--gold)' }))} limit={16} format={fmt} empty="Nenhum aldeão adulto" />
                </Panel>
                <Panel title="Aglomerações de aldeões" icon={Warehouse}>
                  <div className="note"><Info size={15} /><span>Muitos aldeões em pouco espaço costumam ser um salão de trocas, um criadouro ou uma farm de ferro. É uma estimativa pela posição.</span></div>
                  {halls.length === 0 ? <Empty text="Nenhuma aglomeração encontrada" /> : (
                    <div className="crowd-list">
                      {halls.map((h, i) => (
                        <div key={i} className="crowd">
                          <MobIcon id="minecraft:villager_v2" size={30} />
                          <div>
                            <strong>{fmt(h.count)} aldeões</strong>
                            <small>{h.profs.slice(0, 4).map(([p, n]) => `${n} ${(PROFESSION[p] || p).toLowerCase()}`).join(' · ')}</small>
                          </div>
                          <CoordLink go={go} dim={h.dimension} position={h.center} label={`${h.count} aldeões`} />
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
              <Panel title="Livros encantados à venda" icon={BookOpen} actions={<small className="muted">o preço mais baixo de cada encantamento</small>}>
                <BookDeals villagers={villagers} go={go} />
              </Panel>
              <Panel title="Onde ganhar esmeraldas" icon={Gem} actions={<small className="muted">itens que os aldeões compram, do mais barato</small>}>
                <EmeraldSources villagers={villagers} go={go} />
              </Panel>
              <Panel title="Vilas" icon={Home}>
                {villages.length === 0 ? <Empty text="Nenhuma vila registrada" /> : (
                  <>
                    <div className="note"><Info size={15} /><span>Números do registro interno da vila: "camas" e "postos de trabalho" são os pontos de interesse que o jogo associou a ela, não uma contagem exata de blocos.</span></div>
                    <div className="table-wrap short">
                      <table className="table">
                        <thead><tr><th>Dimensão</th><th className="num">Moradores</th><th className="num">Camas</th><th className="num">Postos de trabalho</th><th>Situação</th><th>Centro</th></tr></thead>
                        <tbody>
                          {villages.map(v => {
                            const poi = v.pointsOfInterest || {};
                            const beds = poi.villager || 0;
                            const work = Object.entries(poi).filter(([k]) => !POI_SKIP.has(k)).reduce((s, [, n]) => s + n, 0);
                            const dim = (v.dimension || '').toLowerCase();
                            const center = v.bounds ? [(v.bounds.min[0] + v.bounds.max[0]) / 2, (v.bounds.min[1] + v.bounds.max[1]) / 2, (v.bounds.min[2] + v.bounds.max[2]) / 2] : null;
                            return (
                              <tr key={v.id}>
                                <td><span className="dot" style={{ background: DIM_COLOR[dim] }} /> {DIM_LABEL[dim] || v.dimension}</td>
                                <td className="num">{fmt(v.dwellers ?? 0)}</td>
                                <td className="num">{fmt(beds)}</td>
                                <td className="num">{fmt(work)}</td>
                                <td>{v.raid ? <Badge tone="red">Invasão em andamento</Badge> : beds < (v.dwellers ?? 0) ? <Badge tone="gold">Faltam camas</Badge> : (v.dwellers ?? 0) === 0 ? <Badge>Abandonada</Badge> : <Badge tone="green">OK</Badge>}</td>
                                <td className="nowrap">{center ? <CoordLink go={go} dim={dim} position={center} label="Vila" /> : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Panel>
            </>
          );
        }}
      </Async>
    </div>
  );
}
