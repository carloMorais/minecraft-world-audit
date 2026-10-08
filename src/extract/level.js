// World-level info from level.dat + top-level files (packs, icon, name).
import { GAME_TYPES, DIFFICULTIES, GENERATORS, PERMISSION_LEVELS, BROADCAST } from '../constants.js';

const GAME_RULE_KEYS = [
  'commandblockoutput', 'commandblocksenabled', 'dodaylightcycle', 'doentitydrops', 'dofiretick',
  'doimmediaterespawn', 'doinsomnia', 'dolimitedcrafting', 'domobloot', 'domobspawning', 'dotiledrops',
  'doweathercycle', 'drowningdamage', 'falldamage', 'firedamage', 'freezedamage', 'functioncommandlimit',
  'keepinventory', 'maxcommandchainlength', 'mobgriefing', 'naturalregeneration', 'playerssleepingpercentage',
  'projectilescanbreakblocks', 'pvp', 'randomtickspeed', 'recipesunlock', 'respawnblocksexplode',
  'sendcommandfeedback', 'showbordereffect', 'showcoordinates', 'showdaysplayed', 'showdeathmessages',
  'showrecipemessages', 'showtags', 'spawnradius', 'tntexplodes', 'tntexplosiondropdecay',
];

const num = v => (typeof v === 'bigint' ? Number(v) : v);

function readPackManifests(world, folder) {
  const out = {};
  for (const f of world.files) {
    const m = f.match(new RegExp(`^${folder}/([^/]+)/manifest\\.json$`));
    if (!m) continue;
    const j = world.readJson(f);
    if (j?.header?.uuid) out[j.header.uuid] = { name: j.header.name, description: j.header.description, folder: m[1] };
  }
  return out;
}

function packs(world, kind) {
  const list = world.readJson(`world_${kind}_packs.json`) || [];
  const manifests = readPackManifests(world, `${kind}_packs`);
  return list.map(p => ({
    id: p.pack_id,
    version: Array.isArray(p.version) ? p.version.join('.') : p.version,
    name: manifests[p.pack_id]?.name || null,
    description: manifests[p.pack_id]?.description || null,
    embedded: Boolean(manifests[p.pack_id]),
  }));
}

function extractLevel(world) {
  const { storageVersion, data: d } = world.level;
  const time = num(d.Time) || 0;
  const tick = num(d.currentTick) || 0;
  const cheats = Boolean(d.cheatsEnabled || d.commandsEnabled);
  const creativeEver = Boolean(d.hasBeenLoadedInCreative);
  const gameRules = {};
  for (const k of GAME_RULE_KEYS) if (k in d) gameRules[k] = d[k];

  return {
    name: d.LevelName,
    levelnameTxt: world.readText('levelname.txt')?.trim() || null,
    seed: d.RandomSeed?.toString(),
    storageVersion,
    lastOpenedWithVersion: Array.isArray(d.lastOpenedWithVersion) ? d.lastOpenedWithVersion.join('.') : null,
    minimumCompatibleClientVersion: Array.isArray(d.MinimumCompatibleClientVersion) ? d.MinimumCompatibleClientVersion.join('.') : null,
    baseGameVersion: d.baseGameVersion,
    networkVersion: d.NetworkVersion,
    platform: d.Platform,
    lastPlayed: d.LastPlayed ? new Date(num(d.LastPlayed) * 1000).toISOString() : null,
    timesOpened: d.worldStartCount !== undefined ? (0xffffffff - Number(BigInt.asUintN(32, BigInt(d.worldStartCount)))) : null,
    gameMode: GAME_TYPES[d.GameType] ?? d.GameType,
    forceGameMode: Boolean(d.ForceGameType),
    difficulty: DIFFICULTIES[d.Difficulty] ?? d.Difficulty,
    hardcore: Boolean(d.IsHardcore),
    generator: GENERATORS[d.Generator] ?? d.Generator,
    flatWorldLayers: d.Generator === 2 ? d.FlatWorldLayers : undefined,
    spawn: { x: d.SpawnX, y: d.SpawnY, z: d.SpawnZ },
    time: {
      worldTimeTicks: time,
      daysPlayed: Math.floor(time / 24000),
      timeOfDayTicks: time % 24000,
      currentTick: tick,
      // currentTick advances only while the world is loaded (20 ticks/s) => approximate real play time.
      approxPlayTimeHours: +(tick / 20 / 3600).toFixed(2),
    },
    weather: {
      raining: (d.rainLevel || 0) > 0, rainTime: d.rainTime,
      thundering: (d.lightningLevel || 0) > 0, lightningTime: d.lightningTime,
    },
    achievements: {
      // Bedrock keeps achievements on the Xbox account, not in the world. The world only records
      // whether they are still allowed.
      storedInWorld: false,
      disabled: cheats || creativeEver,
      reason: [cheats && 'cheats/commands enabled', creativeEver && 'world was loaded in creative'].filter(Boolean),
    },
    cheatsEnabled: cheats,
    commandsEnabled: Boolean(d.commandsEnabled),
    hasBeenLoadedInCreative: creativeEver,
    playerHasDied: d.PlayerHasDied,
    bonusChest: { enabled: Boolean(d.bonusChestEnabled), spawned: Boolean(d.bonusChestSpawned) },
    startWithMap: Boolean(d.startWithMapEnabled),
    multiplayer: {
      multiplayerGame: Boolean(d.MultiplayerGame),
      xblBroadcast: BROADCAST[d.XBLBroadcastIntent] ?? d.XBLBroadcastIntent,
      platformBroadcast: BROADCAST[d.PlatformBroadcastIntent] ?? d.PlatformBroadcastIntent,
      lanBroadcast: Boolean(d.LANBroadcast),
    },
    defaultPlayerPermission: PERMISSION_LEVELS[d.playerPermissionsLevel] ?? d.playerPermissionsLevel,
    gameRules,
    experiments: d.experiments || {},
    defaultAbilities: d.abilities || {},
    template: {
      isFromWorldTemplate: Boolean(d.isFromWorldTemplate), isFromLockedTemplate: Boolean(d.isFromLockedTemplate),
      educationFeatures: Boolean(d.educationFeaturesEnabled),
    },
    behaviorPacks: packs(world, 'behavior'),
    resourcePacks: packs(world, 'resource'),
    hasIcon: world.files.includes('world_icon.jpeg'),
    raw: d,
  };
}

export { extractLevel };
