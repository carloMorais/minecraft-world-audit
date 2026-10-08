// Decodes Bedrock item stack NBT into a readable structure (recursing into shulker boxes / bundles).
import { ENCHANTMENTS } from '../constants.js';

function stripNs(name) { return name ? name.replace(/^minecraft:/, '') : name; }

function decodeEnchants(list) {
  if (!Array.isArray(list)) return undefined;
  return list.map(e => ({ id: e.id, name: ENCHANTMENTS[e.id] || `unknown_${e.id}`, level: e.lvl }));
}

/** Returns null for empty slots. */
function decodeItem(it) {
  if (!it || !it.Name || it.Count === 0) return null;
  const tag = it.tag || {};
  const out = { item: it.Name, count: it.Count };
  if (it.Slot !== undefined) out.slot = it.Slot;
  if (it.Damage) out.aux = it.Damage;                       // data value (potion type, legacy colour…)
  if (tag.Damage !== undefined && tag.Damage !== 0) out.durabilityUsed = tag.Damage;
  if (tag.display?.Name) out.customName = tag.display.Name;
  if (tag.display?.Lore) out.lore = tag.display.Lore;
  const ench = decodeEnchants(tag.ench);
  if (ench?.length) out.enchantments = ench;
  if (tag.RepairCost) out.repairCost = tag.RepairCost;
  if (tag.Unbreakable) out.unbreakable = true;
  if (tag.Trim) out.trim = tag.Trim;
  if (tag.customColor !== undefined) out.color = tag.customColor;
  if (tag.title || tag.pages) {
    out.book = { title: tag.title, author: tag.author, pages: (tag.pages || []).map(p => p.text) };
  }
  if (tag.fireworks) out.fireworks = tag.fireworks;
  if (tag.map_uuid !== undefined) out.mapId = tag.map_uuid;
  if (it.Block?.states && Object.keys(it.Block.states).length) out.blockStates = it.Block.states;
  if (tag.Items || it.Items) {
    const inner = (tag.Items || it.Items).map(decodeItem).filter(Boolean);
    if (inner.length) out.contents = inner;
  }
  if (tag.storage_item_component_content) {
    const inner = tag.storage_item_component_content.map(decodeItem).filter(Boolean);
    if (inner.length) out.contents = inner;
  }
  return out;
}

function decodeItems(list) {
  if (!Array.isArray(list)) return [];
  return list.map(decodeItem).filter(Boolean);
}

/** Flattens items (including nested container contents) for totals / searches. */
function* flattenItems(items, path = []) {
  for (const it of items || []) {
    yield { ...it, path };
    if (it.contents) yield* flattenItems(it.contents, [...path, it.customName || stripNs(it.item)]);
  }
}

function totalByItem(items) {
  const t = {};
  for (const it of flattenItems(items)) t[it.item] = (t[it.item] || 0) + it.count;
  return t;
}

function formatItem(it) {
  let s = `${it.count}x ${stripNs(it.item)}`;
  if (it.customName) s += ` "${it.customName}"`;
  if (it.enchantments) s += ` [${it.enchantments.map(e => `${e.name} ${e.level}`).join(', ')}]`;
  if (it.durabilityUsed) s += ` (dano ${it.durabilityUsed})`;
  if (it.book?.title) s += ` livro "${it.book.title}" por ${it.book.author}`;
  if (it.contents) s += ` {${it.contents.length} itens dentro}`;
  return s;
}

export { decodeItem, decodeItems, flattenItems, totalByItem, formatItem, stripNs };
