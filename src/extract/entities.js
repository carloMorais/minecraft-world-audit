// Entities ("actors"): modern per-actor records (actorprefix<id>) located via digp digests,
// plus legacy per-chunk Entity (tag 50) records from older worlds.
import { readNbt, readNbtAll } from '../format/nbt.js';
import { DIMENSIONS, VILLAGER_PROFESSIONS } from '../constants.js';
import { decodeItems, decodeItem } from './items.js';

function profession(e) {
  const defs = e.definitions || [];
  for (const d of defs) {
    const m = d.match(/^\+minecraft:(farmer|fisherman|shepherd|fletcher|librarian|cartographer|cleric|armorer|weaponsmith|toolsmith|butcher|leatherworker|stone_mason|mason|nitwit|unskilled)$/);
    if (m) return m[1];
  }
  if (e.PreferredProfession) return e.PreferredProfession;
  if (e.Variant !== undefined && /villager/.test(e.identifier)) return VILLAGER_PROFESSIONS[e.Variant];
  return undefined;
}

function trades(e) {
  const recipes = e.Offers?.Recipes;
  if (!Array.isArray(recipes)) return undefined;
  return recipes.map(r => ({
    buyA: decodeItem(r.buyA), buyB: decodeItem(r.buyB), sell: decodeItem(r.sell),
    uses: r.uses, maxUses: r.maxUses, tier: r.tier,
  }));
}

function decodeEntity(e, loc) {
  const health = (e.Attributes || []).find(a => a.Name === 'minecraft:health');
  const out = {
    type: e.identifier,
    uniqueId: e.UniqueID?.toString(),
    // Records no chunk digest points to are orphans: the game never loads them again.
    dimension: loc ? (DIMENSIONS[loc.dim] ?? loc.dim) : 'unknown',
    ...(loc ? {} : { orphan: true }),
    position: e.Pos ? e.Pos.map(v => +v.toFixed(1)) : undefined,
  };
  if (e.CustomName) out.customName = e.CustomName;
  if (health) out.health = { current: +health.Current.toFixed(1), max: health.Max };
  if (e.IsTamed) out.tamed = true;
  if (e.OwnerNew !== undefined && e.OwnerNew !== -1n && e.OwnerNew !== -1) out.ownerId = e.OwnerNew.toString();
  if (e.IsBaby) out.baby = true;
  if (e.Persistent) out.persistent = true;
  if (e.Saddled) out.saddled = true;
  if (e.Sitting) out.sitting = true;
  if (e.Variant) out.variant = e.Variant;
  if (e.MarkVariant) out.markVariant = e.MarkVariant;
  if (e.Color) out.color = e.Color;
  if (e.Tags?.length) out.tags = e.Tags;
  const prof = profession(e);
  if (prof) out.profession = prof;
  if (e.TradeTier !== undefined && /villager|trader/.test(e.identifier || '')) out.tradeTier = e.TradeTier;
  const t = trades(e);
  if (t) out.trades = t;
  const equipment = [...decodeItems(e.Armor), ...decodeItems(e.Mainhand), ...decodeItems(e.Offhand)];
  if (equipment.length) out.equipment = equipment;
  const inv = decodeItems(e.ChestItems || e.Items || e.Inventory);
  if (inv.length) out.inventory = inv;
  if (e.Item) out.item = decodeItem(e.Item);             // dropped item entity
  if (e.identifier === 'minecraft:xp_orb' && e['experience value'] !== undefined) out.xp = e['experience value'];
  if (e.SpawnedByNight) out.spawnedByNight = true;
  out.raw = e;
  return out;
}

function extractEntities(world) {
  const locs = world.actorLocations;
  const out = [];
  for (const [k, v] of world.prefixed('actorprefix')) {
    const id = k.subarray(11).toString('hex');
    try { out.push(decodeEntity(readNbt(v), locs.get(id))); } catch { /* skip corrupt */ }
  }
  for (const [ck, v] of world.chunkRecords(50)) {
    try { for (const e of readNbtAll(v)) out.push(decodeEntity(e, ck)); } catch { /* skip */ }
  }
  return out;
}

// Entities that carry an owner id without being pets.
const PROJECTILE = /arrow|trident|snowball|egg|ender_pearl|potion|fireball|wind_charge|fishing_hook|fireworks|shulker_bullet|llama_spit|xp_bottle|thrown|item$|xp_orb|breeze_wind/;

function summarizeEntities(entities, players = []) {
  const ownerNames = {};
  for (const p of players) if (p.uniqueId) ownerNames[p.uniqueId] = p.role === 'local (host)' ? 'host' : p.key;
  const byType = {}, byDim = {};
  const named = [], tamed = [], villagers = [];
  let droppedItems = 0;
  for (const e of entities) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    byDim[e.dimension] = (byDim[e.dimension] || 0) + 1;
    if (e.customName) named.push({ type: e.type, name: e.customName, dimension: e.dimension, position: e.position });
    if (e.tamed || (e.ownerId && !PROJECTILE.test(e.type))) tamed.push({ type: e.type, name: e.customName, owner: ownerNames[e.ownerId] || e.ownerId, dimension: e.dimension, position: e.position });
    if (/villager/.test(e.type)) villagers.push({ type: e.type, profession: e.profession, tier: e.tradeTier, name: e.customName, position: e.position, trades: e.trades?.length || 0 });
    if (e.type === 'minecraft:item') droppedItems++;
  }
  return {
    total: entities.length,
    byDimension: byDim,
    byType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1] - a[1])),
    droppedItemEntities: droppedItems,
    named,
    tamedOrOwned: tamed,
    villagers,
  };
}

export { extractEntities, summarizeEntities };
