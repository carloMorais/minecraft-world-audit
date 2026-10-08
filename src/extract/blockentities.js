// Block entities (tag 49): chests, barrels, shulkers, furnaces, signs, lecterns, spawners, beds…
import { readNbtAll } from '../format/nbt.js';
import { DIMENSIONS } from '../constants.js';
import { decodeItems, decodeItem } from './items.js';

function signText(side) {
  if (!side) return undefined;
  if (typeof side === 'string') return side;
  return side.Text || undefined;
}

function decodeBlockEntity(be, dim) {
  const out = { id: be.id, dimension: DIMENSIONS[dim] ?? dim, position: [be.x, be.y, be.z] };
  if (be.CustomName) out.customName = be.CustomName;
  const items = decodeItems(be.Items);
  if (items.length) out.items = items;
  if (be.Item) out.item = decodeItem(be.Item);                         // item frame, flower pot, jukebox…
  if (be.RecordItem) out.record = decodeItem(be.RecordItem);           // jukebox disc
  if (be.book) out.book = decodeItem(be.book);                         // lectern
  if (be.id === 'Sign' || be.id === 'HangingSign') {
    out.text = { front: signText(be.FrontText) ?? be.Text, back: signText(be.BackText) };
    if (be.IsWaxed) out.waxed = true;
  }
  if (be.id === 'MobSpawner') out.spawns = be.EntityIdentifier;
  if (be.id === 'Beacon') out.beacon = { primary: be.primary, secondary: be.secondary };
  if (be.id === 'Furnace' || be.id === 'BlastFurnace' || be.id === 'Smoker') {
    out.furnace = { burnTime: be.BurnTime, cookTime: be.CookTime, storedXp: be.StoredXPInt };
  }
  if (be.id === 'Banner') out.banner = { base: be.Base, patterns: be.Patterns, type: be.Type };
  if (be.id === 'Bed') out.color = be.color;
  if (be.id === 'Beehive') out.bees = (be.Occupants || []).length;
  if (be.id === 'CommandBlock') out.command = be.Command;
  if (be.id === 'StructureBlock') out.structureName = be.structureName;
  if (be.Lock) out.locked = be.Lock;
  if (be.LootTable) out.lootTable = be.LootTable;                    // never-opened generated chest
  if (be.pairx !== undefined) out.pairedWith = [be.pairx, be.y, be.pairz];
  out.raw = be;
  return out;
}

function extractBlockEntities(world) {
  const out = [];
  for (const [ck, v] of world.chunkRecords(49)) {
    try { for (const be of readNbtAll(v)) out.push(decodeBlockEntity(be, ck.dim)); } catch { /* skip */ }
  }
  return out;
}

function summarizeBlockEntities(list) {
  const byType = {};
  for (const b of list) byType[b.id] = (byType[b.id] || 0) + 1;
  const containers = list.filter(b => b.items?.length);
  const signs = list.filter(b => b.text && (b.text.front || b.text.back));
  return {
    total: list.length,
    byType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1] - a[1])),
    containersWithItems: containers.length,
    unopenedLootContainers: list.filter(b => b.lootTable).length,
    signs: signs.map(s => ({ position: s.position, dimension: s.dimension, ...s.text })),
  };
}

export { extractBlockEntities, summarizeBlockEntities };
