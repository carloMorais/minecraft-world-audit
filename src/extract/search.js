// Cross-cutting item search: every place an item can live (players, ender chests, containers,
// item frames, mob equipment, chest minecarts, dropped items) including nested shulker contents.
import { flattenItems } from './items.js';

function* itemSources(players, blockEntities, entities) {
  for (const p of players) {
    const who = p.role === 'local (host)' ? 'host' : p.key;
    yield { where: `player ${who} inventory`, dimension: p.dimension, position: p.position, items: [...p.inventory, ...p.armor, ...p.offhand] };
    yield { where: `player ${who} ender chest`, items: p.enderChest };
  }
  for (const b of blockEntities) {
    const items = [...(b.items || []), ...[b.item, b.record, b.book].filter(Boolean)];
    if (items.length) yield { where: `${b.id}${b.customName ? ` "${b.customName}"` : ''}`, dimension: b.dimension, position: b.position, items };
  }
  for (const e of entities) {
    const items = [...(e.inventory || []), ...(e.equipment || []), ...(e.item ? [e.item] : [])];
    if (items.length) yield { where: `${e.type}${e.customName ? ` "${e.customName}"` : ''}`, dimension: e.dimension, position: e.position, items };
  }
}

function findItems(pattern, players, blockEntities, entities) {
  const hits = [];
  const totals = {};
  for (const src of itemSources(players, blockEntities, entities)) {
    for (const it of flattenItems(src.items)) {
      if (!pattern.test(it.item) && !(it.customName && pattern.test(it.customName))) continue;
      totals[it.item] = (totals[it.item] || 0) + it.count;
      hits.push({ item: it.item, count: it.count, customName: it.customName, enchantments: it.enchantments,
        where: src.where + (it.path.length ? ` > ${it.path.join(' > ')}` : ''), dimension: src.dimension, position: src.position });
    }
  }
  return { totals, hits };
}

/** Totals of every item stored anywhere in the world. */
function worldItemTotals(players, blockEntities, entities) {
  const totals = {};
  for (const src of itemSources(players, blockEntities, entities)) {
    for (const it of flattenItems(src.items)) totals[it.item] = (totals[it.item] || 0) + it.count;
  }
  return Object.fromEntries(Object.entries(totals).sort((a, b) => b[1] - a[1]));
}

export { findItems, worldItemTotals };
