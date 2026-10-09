// Lookup tables for numeric IDs used by Bedrock Edition save data.

const DIMENSIONS = { 0: 'overworld', 1: 'nether', 2: 'the_end' };

// Sub-chunk Y range per dimension (Caves & Cliffs height limits).
const DIMENSION_Y = { 0: { min: -4, max: 19 }, 1: { min: 0, max: 7 }, 2: { min: 0, max: 15 } };

const GAME_TYPES = { 0: 'survival', 1: 'creative', 2: 'adventure', 5: 'default', 6: 'spectator' };
const DIFFICULTIES = { 0: 'peaceful', 1: 'easy', 2: 'normal', 3: 'hard' };
const GENERATORS = { 0: 'old', 1: 'infinite', 2: 'flat', 5: 'void' };
const PERMISSION_LEVELS = { 0: 'visitor', 1: 'member', 2: 'operator', 3: 'custom' };
const BROADCAST = { 0: 'no_multiplayer', 1: 'invite_only', 2: 'friends_only', 3: 'friends_of_friends', 4: 'public' };

const ENCHANTMENTS = [
  'protection', 'fire_protection', 'feather_falling', 'blast_protection', 'projectile_protection',
  'thorns', 'respiration', 'depth_strider', 'aqua_affinity', 'sharpness', 'smite', 'bane_of_arthropods',
  'knockback', 'fire_aspect', 'looting', 'efficiency', 'silk_touch', 'unbreaking', 'fortune', 'power',
  'punch', 'flame', 'infinity', 'luck_of_the_sea', 'lure', 'frost_walker', 'mending', 'binding_curse',
  'vanishing_curse', 'impaling', 'riptide', 'loyalty', 'channeling', 'multishot', 'piercing',
  'quick_charge', 'soul_speed', 'swift_sneak', 'wind_burst', 'density', 'breach',
];

const EFFECTS = [
  null, 'speed', 'slowness', 'haste', 'mining_fatigue', 'strength', 'instant_health', 'instant_damage',
  'jump_boost', 'nausea', 'regeneration', 'resistance', 'fire_resistance', 'water_breathing',
  'invisibility', 'blindness', 'night_vision', 'hunger', 'weakness', 'poison', 'wither', 'health_boost',
  'absorption', 'saturation', 'levitation', 'fatal_poison', 'conduit_power', 'slow_falling', 'bad_omen',
  'village_hero', 'darkness', 'trial_omen', 'wind_charged', 'weaving', 'oozing', 'infested', 'raid_omen',
];

const BIOMES = {
  0: 'ocean', 1: 'plains', 2: 'desert', 3: 'extreme_hills', 4: 'forest', 5: 'taiga', 6: 'swampland',
  7: 'river', 8: 'hell', 9: 'the_end', 10: 'legacy_frozen_ocean', 11: 'frozen_river', 12: 'ice_plains',
  13: 'ice_mountains', 14: 'mushroom_island', 15: 'mushroom_island_shore', 16: 'beach', 17: 'desert_hills',
  18: 'forest_hills', 19: 'taiga_hills', 20: 'extreme_hills_edge', 21: 'jungle', 22: 'jungle_hills',
  23: 'jungle_edge', 24: 'deep_ocean', 25: 'stone_beach', 26: 'cold_beach', 27: 'birch_forest',
  28: 'birch_forest_hills', 29: 'roofed_forest', 30: 'cold_taiga', 31: 'cold_taiga_hills', 32: 'mega_taiga',
  33: 'mega_taiga_hills', 34: 'extreme_hills_plus_trees', 35: 'savanna', 36: 'savanna_plateau', 37: 'mesa',
  38: 'mesa_plateau_stone', 39: 'mesa_plateau', 40: 'warm_ocean', 41: 'deep_warm_ocean',
  42: 'lukewarm_ocean', 43: 'deep_lukewarm_ocean', 44: 'cold_ocean', 45: 'deep_cold_ocean',
  46: 'frozen_ocean', 47: 'deep_frozen_ocean', 48: 'bamboo_jungle', 49: 'bamboo_jungle_hills',
  129: 'sunflower_plains', 130: 'desert_mutated', 131: 'extreme_hills_mutated', 132: 'flower_forest',
  133: 'taiga_mutated', 134: 'swampland_mutated', 140: 'ice_plains_spikes', 149: 'jungle_mutated',
  151: 'jungle_edge_mutated', 155: 'birch_forest_mutated', 156: 'birch_forest_hills_mutated',
  157: 'roofed_forest_mutated', 158: 'cold_taiga_mutated', 160: 'redwood_taiga_mutated',
  161: 'redwood_taiga_hills_mutated', 162: 'extreme_hills_plus_trees_mutated', 163: 'savanna_mutated',
  164: 'savanna_plateau_mutated', 165: 'mesa_bryce', 166: 'mesa_plateau_stone_mutated',
  167: 'mesa_plateau_mutated', 178: 'soulsand_valley', 179: 'crimson_forest', 180: 'warped_forest',
  181: 'basalt_deltas', 182: 'jagged_peaks', 183: 'frozen_peaks', 184: 'snowy_slopes', 185: 'grove',
  186: 'meadow', 187: 'lush_caves', 188: 'dripstone_caves', 189: 'stony_peaks', 190: 'deep_dark',
  191: 'mangrove_swamp', 192: 'cherry_grove', 193: 'pale_garden',
};

const VILLAGER_PROFESSIONS = {
  0: 'none', 1: 'farmer', 2: 'fisherman', 3: 'shepherd', 4: 'fletcher', 5: 'librarian', 6: 'cartographer',
  7: 'cleric', 8: 'armorer', 9: 'weaponsmith', 10: 'toolsmith', 11: 'butcher', 12: 'leatherworker',
  13: 'mason', 14: 'nitwit',
};

/**
 * Blocks that vanilla world generation (terrain *and* structures such as villages, trial chambers,
 * bastions, ancient cities, monuments, mineshafts) does not produce, or produces only in tiny amounts.
 * Finding them is a strong hint of player building. Heuristic only: Bedrock does not record who
 * placed a block.
 */
const PLAYER_MADE_HINTS = [
  /_concrete$/, /^minecraft:concrete$/, /_concrete_powder$/, /^minecraft:concrete_powder$/,
  /_stained_glass(_pane)?$/, /^minecraft:(tinted_)?glass(_pane)?$/,
  // (amethyst geodes, raw ore veins, lush-cave moss, reef sea pickles, village/mansion planks are natural)
  /^minecraft:(iron|diamond|emerald|netherite|lapis|redstone|coal|copper|honey|honeycomb|slime|dried_kelp|bamboo)_block$/,
  /^minecraft:beacon$/, /^minecraft:enchanting_table$/, /^minecraft:conduit$/, /^minecraft:respawn_anchor$/,
  /^minecraft:lodestone$/, /^minecraft:(un)?powered_(repeater|comparator)$/, /^minecraft:observer$/,
  /^minecraft:(sticky_)?piston$/, /^minecraft:hopper$/, /^minecraft:dropper$/, /^minecraft:daylight_detector/,
  /^minecraft:redstone_lamp$/, /^minecraft:lit_redstone_lamp$/, /^minecraft:target$/, /^minecraft:note_?block$/,
  /^minecraft:jukebox$/, /_shulker_box$/, /^minecraft:(undyed_)?shulker_box$/, /^minecraft:(lit_)?(blast_furnace|smoker)$/,
  /^minecraft:(chipped_|damaged_)?anvil$/, /^minecraft:scaffolding$/, /^minecraft:(soul_)?campfire$/,
  /_glazed_terracotta$/, /^minecraft:(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_bed$/,
  /^minecraft:(powered|detector|activator)_rail$/, /^minecraft:tnt$/, /^minecraft:crafter$/,
  /^minecraft:(glow_)?frame$/, /^minecraft:armor_stand$/,
  /^minecraft:(?!moss_)\w+_carpet$/, /^minecraft:(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|bamboo|crimson|warped|pale_oak)_(hanging_)?sign$/,
  /^minecraft:(mangrove|cherry|bamboo|crimson|warped|pale_oak|jungle|birch)_planks$/,
  /^minecraft:(polished_)?(andesite|diorite|granite)_(stairs|slab)$/, /^minecraft:quartz_(block|bricks|pillar|stairs|slab)$/,
];

export {
  DIMENSIONS, DIMENSION_Y, GAME_TYPES, DIFFICULTIES, GENERATORS, PERMISSION_LEVELS, BROADCAST,
  ENCHANTMENTS, EFFECTS, BIOMES, VILLAGER_PROFESSIONS, PLAYER_MADE_HINTS,
};
