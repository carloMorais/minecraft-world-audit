// Itens › Livros e trocas: the villager economy (where villagers live is on the map's "Vilas e aldeões" view).
import { useMemo } from 'react';
import { BookOpen, Gem, Map as MapIcon, Home, ShieldAlert } from 'lucide-react';
import { useQuery } from '../client.js';
import { Panel, Async, Badge, CoordLink, Empty, useSort } from '../components/ui.jsx';
import { ItemIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { fmt, prettyName, mobName, ENCHANT_LABEL, roman, DIM_LABEL, DIM_COLOR } from '../format.js';
import { PROFESSION, profKey, TRADE_TIER, ENCHANT_MAX, emeraldsIn } from '../domain.js';

const villagerName = v => (v.customName ? <McText text={v.customName} /> : PROFESSION[profKey(v)] || mobName(v.type));

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
    return Object.values(best).map(d => ({ ...d, label: ENCHANT_LABEL[d.name] || d.name, max: d.level >= (ENCHANT_MAX[d.name] ?? 99) }));
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
              <td>{villagerName(d.villager)} <small className="muted">{TRADE_TIER[d.villager.tradeTier] || ''}{d.uses >= d.maxUses ? ' · esgotado' : ''}</small></td>
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

function Villages({ villages, go }) {
  const [rows, th] = useSort(villages, {
    dwellers: v => v.dwellers,
    dim: v => v.dimension,
  }, '-dwellers');

  if (!villages.length) return <Empty text="Nenhuma vila detectada" />;
  return (
    <div className="table-wrap short">
      <table className="table">
        <thead>
          <tr>
            <th>Status</th>
            {th('dwellers', 'Habitantes', { className: 'num', firstDesc: true })}
            {th('dim', 'Dimensão')}
            <th>Local</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(v => {
            const center = [
              (v.bounds.x[0] + v.bounds.x[1]) / 2,
              (v.bounds.y[0] + v.bounds.y[1]) / 2,
              (v.bounds.z[0] + v.bounds.z[1]) / 2
            ];
            return (
              <tr key={v.id}>
                <td>
                  {v.raid ? <Badge tone="red" title="A vila está sob ataque (Invasão)"><ShieldAlert size={12} /> Invasão</Badge> : <Badge tone="green">Pacífica</Badge>}
                </td>
                <td className="num"><strong>{fmt(v.dwellers)}</strong></td>
                <td><span className="dot" style={{ background: DIM_COLOR[v.dimension] }} /> {DIM_LABEL[v.dimension] || v.dimension}</td>
                <td className="nowrap"><CoordLink go={go} dim={v.dimension} position={center} label={`Vila ${v.id.substring(0,6)}`} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Trades({ go }) {
  const state = useQuery('villagers');
  return (
    <Async state={state} loadingText="Lendo as trocas dos aldeões…">
      {({ villagers: all, villages }) => {
        const villagers = all.filter(v => /villager/.test(v.type));
        return (
          <>
            <div className="toolbar">
              <button type="button" className="btn" onClick={() => go('map', { view: 'villagers' })}><MapIcon size={15} /> Ver aldeões, vilas e aglomerações no mapa</button>
            </div>
            <Panel title="Saúde das Vilas" icon={Home} actions={<small className="muted">{fmt(villages?.length || 0)} vilas registradas pelo jogo</small>}>
              <Villages villages={villages || []} go={go} />
            </Panel>
            <Panel title="Livros encantados à venda" icon={BookOpen} actions={<small className="muted">o preço mais baixo de cada encantamento</small>}>
              <BookDeals villagers={villagers} go={go} />
            </Panel>
            <Panel title="Onde ganhar esmeraldas" icon={Gem} actions={<small className="muted">itens que os aldeões compram, do mais barato</small>}>
              <EmeraldSources villagers={villagers} go={go} />
            </Panel>
          </>
        );
      }}
    </Async>
  );
}
