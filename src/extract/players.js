import { Buffer } from 'buffer';
// Player records: ~local_player (host) and player_server_<uuid> (other players), linked to their
// identity records player_<msa|selfsigned id>.
import { readNbt } from '../format/nbt.js';
import { DIMENSIONS, GAME_TYPES, PERMISSION_LEVELS, EFFECTS } from '../constants.js';
import { decodeItems, totalByItem } from './items.js';

const num = v => (typeof v === 'bigint' ? Number(v) : v);

function attributes(list) {
  const out = {};
  for (const a of list || []) out[a.Name.replace(/^minecraft:/, '')] = { current: a.Current, max: a.Max, base: a.Base };
  return out;
}

function decodePlayer(p, key) {
  const attrs = attributes(p.Attributes);
  const inventory = decodeItems(p.Inventory);
  const armorSlots = ['head', 'chest', 'legs', 'feet'];
  const armor = (p.Armor || []).map((a, i) => {
    const [it] = decodeItems([a]);
    return it ? { ...it, slot: armorSlots[i] || i } : null;
  }).filter(Boolean);
  const offhand = decodeItems(p.Offhand);
  const enderChest = decodeItems(p.EnderChestInventory);
  const all = [...inventory, ...armor, ...offhand];

  return {
    key,
    uniqueId: p.UniqueID?.toString(),
    storageKey: p.internalComponents?.EntityStorageKeyComponent?.StorageKey
      ? Buffer.from(p.internalComponents.EntityStorageKeyComponent.StorageKey, 'latin1').toString('hex') : undefined,
    gameMode: p.PlayerGameMode !== undefined ? (GAME_TYPES[p.PlayerGameMode] ?? p.PlayerGameMode) : undefined,
    permission: PERMISSION_LEVELS[p.playerPermissionsLevel] ?? p.playerPermissionsLevel,
    dimension: DIMENSIONS[p.DimensionId] ?? p.DimensionId,
    position: p.Pos ? p.Pos.map(v => +v.toFixed(2)) : null,
    rotation: p.Rotation ? p.Rotation.map(v => +v.toFixed(1)) : null,
    // unset spawn: SpawnY -32768 in older saves, INT32_MIN coords with SpawnDimension 3 in newer ones
    spawnPoint: p.SpawnX !== undefined && p.SpawnY !== -32768 && p.SpawnY !== -2147483648 && p.SpawnDimension !== 3
      ? { x: p.SpawnX, y: p.SpawnY, z: p.SpawnZ, dimension: DIMENSIONS[p.SpawnDimension] ?? p.SpawnDimension,
        block: p.SpawnBlockPositionX !== undefined ? [p.SpawnBlockPositionX, p.SpawnBlockPositionY, p.SpawnBlockPositionZ] : undefined }
      : null,
    lastDeath: p.DeathPositionX !== undefined
      ? { x: p.DeathPositionX, y: p.DeathPositionY, z: p.DeathPositionZ, dimension: DIMENSIONS[p.DeathDimension] ?? p.DeathDimension }
      : null,
    hasDiedBefore: Boolean(p.HasDiedBefore),
    dead: Boolean(p.Dead),
    hasSeenCredits: Boolean(p.HasSeenCredits), // true once the player has gone through the End exit portal
    xp: { level: p.PlayerLevel, progress: p.PlayerLevelProgress },
    health: attrs.health ? { current: +attrs.health.current.toFixed(2), max: attrs.health.max } : undefined,
    hunger: attrs['player.hunger'] ? attrs['player.hunger'].current : undefined,
    saturation: attrs['player.saturation'] ? +attrs['player.saturation'].current.toFixed(2) : undefined,
    exhaustion: attrs['player.exhaustion'] ? +attrs['player.exhaustion'].current.toFixed(2) : undefined,
    absorption: attrs.absorption?.current,
    attributes: attrs,
    effects: (p.ActiveEffects || []).map(e => ({
      id: e.Id, name: EFFECTS[e.Id] || `effect_${e.Id}`, amplifier: e.Amplifier, durationTicks: e.Duration,
      ambient: Boolean(e.Ambient), visible: Boolean(e.ShowParticles),
    })),
    selectedHotbarSlot: p.SelectedInventorySlot,
    inventory,
    armor,
    offhand,
    enderChest,
    itemTotals: totalByItem(all),
    enderChestTotals: totalByItem(enderChest),
    abilities: p.abilities,
    tags: p.Tags || [],
    unlockedRecipes: p.recipe_unlocking?.unlocked_recipes || [],
    timeSinceRestTicks: p.TimeSinceRest,
    sleeping: Boolean(p.Sleeping),
    ridingId: p.LinksTag ? p.LinksTag : undefined,
    enchantmentSeed: p.EnchantmentSeed,
    mapIndex: p.MapIndex,
    wardenThreatLevel: p.WardenThreatLevel,
    dynamicProperties: p.DynamicProperties,
    raw: p,
  };
}

function extractPlayers(world) {
  const db = world.db;
  // Identity records: player_<id> -> {MsaId, SelfSignedId, ServerId}
  const identities = {};
  for (const [k, v] of world.prefixed('player_')) {
    const s = k.toString('latin1');
    if (s.startsWith('player_server_')) continue;
    try {
      const n = readNbt(v);
      if (n?.ServerId) {
        const id = identities[n.ServerId] ||= { msaId: n.MsaId, selfSignedId: n.SelfSignedId, platformOnlineId: n.PlatformOnlineId, keys: [] };
        id.keys.push(s);
      }
    } catch { /* ignore */ }
  }
  const players = [];
  const local = db.get('~local_player');
  if (local) players.push({ role: 'local (host)', ...decodePlayer(readNbt(local), '~local_player') });
  for (const [k, v] of world.prefixed('player_server_')) {
    const s = k.toString('latin1');
    const id = identities[s];
    players.push({ role: 'remote', identity: id ? { msaId: id.msaId, selfSignedId: id.selfSignedId, platformOnlineId: id.platformOnlineId } : null, ...decodePlayer(readNbt(v), s) });
  }
  // legacy (pre-1.16) remote player records keyed directly by player_<id> with full entity NBT
  for (const [k, v] of world.prefixed('player_')) {
    const s = k.toString('latin1');
    if (s.startsWith('player_server_')) continue;
    try {
      const n = readNbt(v);
      if (n?.identifier === 'minecraft:player' || n?.Inventory) players.push({ role: 'remote (legacy)', ...decodePlayer(n, s) });
    } catch { /* ignore */ }
  }
  return players;
}

export { extractPlayers, decodePlayer, num };
