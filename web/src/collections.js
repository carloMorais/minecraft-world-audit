// Collection checklists for the Coleções page. Item ids are current Bedrock ids; older worlds may
// keep some items under legacy ids with a data value (e.g. "minecraft:skull" + aux, "minecraft:bed"
// + colour), which a per-id total cannot tell apart, so those are not listed.

const COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const ids = list => list.map(n => `minecraft:${n}`);

export const ITEM_COLLECTIONS = [
  {
    key: 'discs', label: 'Discos de música', hint: 'Todos os discos do jogo',
    ids: ids(['13', 'cat', 'blocks', 'chirp', 'far', 'mall', 'mellohi', 'stal', 'strad', 'ward', '11', 'wait', 'otherside', '5', 'pigstep', 'relic', 'creator', 'creator_music_box', 'precipice', 'tears', 'lava_chicken'].map(n => `music_disc_${n}`)),
  },
  {
    key: 'templates', label: 'Moldes de ferraria', hint: 'Acabamentos de armadura e melhoria de netherite',
    ids: ids(['netherite_upgrade', 'sentry_armor_trim', 'dune_armor_trim', 'coast_armor_trim', 'wild_armor_trim', 'ward_armor_trim', 'eye_armor_trim', 'vex_armor_trim', 'tide_armor_trim', 'snout_armor_trim', 'rib_armor_trim', 'spire_armor_trim', 'wayfinder_armor_trim', 'shaper_armor_trim', 'raiser_armor_trim', 'host_armor_trim', 'silence_armor_trim', 'flow_armor_trim', 'bolt_armor_trim'].map(n => `${n}_smithing_template`)),
  },
  {
    key: 'sherds', label: 'Fragmentos de cerâmica', hint: 'Encontrados em ruínas e câmaras de desafio',
    ids: ids(['angler', 'archer', 'arms_up', 'blade', 'brewer', 'burn', 'danger', 'explorer', 'flow', 'friend', 'guster', 'heart', 'heartbreak', 'howl', 'miner', 'mourner', 'plenty', 'prize', 'scrape', 'sheaf', 'shelter', 'skull', 'snort'].map(n => `${n}_pottery_sherd`)),
  },
  {
    key: 'patterns', label: 'Padrões de estandarte',
    ids: ids(['creeper', 'skull', 'flower', 'mojang', 'field_masoned', 'bordure_indented', 'piglin', 'globe', 'flow', 'guster'].map(n => `${n}_banner_pattern`)),
  },
  {
    key: 'heads', label: 'Cabeças de mobs', hint: 'Mundos antigos guardam cabeças como "skull" e não entram aqui',
    ids: ids(['skeleton_skull', 'wither_skeleton_skull', 'zombie_head', 'creeper_head', 'piglin_head', 'dragon_head', 'player_head']),
  },
  {
    key: 'rare', label: 'Itens raros',
    ids: ids(['elytra', 'totem_of_undying', 'trident', 'heart_of_the_sea', 'nautilus_shell', 'nether_star', 'beacon', 'conduit', 'dragon_egg', 'dragon_breath', 'heavy_core', 'mace', 'enchanted_golden_apple', 'echo_shard', 'recovery_compass', 'sniffer_egg', 'ominous_trial_key', 'breeze_rod', 'shulker_shell', 'netherite_ingot']),
  },
  { key: 'horse', label: 'Armaduras para cavalo', ids: ids(['leather_horse_armor', 'iron_horse_armor', 'golden_horse_armor', 'diamond_horse_armor']) },
  { key: 'dyes', label: 'Corantes', hint: 'As 16 cores', ids: ids(COLORS.map(c => `${c}_dye`)), color: true },
  { key: 'wool', label: 'Lã de todas as cores', ids: ids(COLORS.map(c => `${c}_wool`)), color: true },
  { key: 'shulkers', label: 'Caixas de shulker coloridas', ids: ids(['undyed_shulker_box', ...COLORS.map(c => `${c}_shulker_box`)]), color: true },
];

/** Mobs that can be tamed or bound to a player. */
export const TAMEABLE = ['wolf', 'cat', 'parrot', 'horse', 'donkey', 'mule', 'llama', 'camel', 'skeleton_horse', 'fox', 'ocelot', 'allay'].map(n => `minecraft:${n}`);

/** Biomes that current versions generate, per dimension (Bedrock ids, as in src/constants.js BIOMES). */
export const CURRENT_BIOMES = {
  overworld: [
    'plains', 'sunflower_plains', 'ice_plains', 'ice_plains_spikes', 'desert', 'swampland', 'mangrove_swamp', 'forest', 'flower_forest',
    'birch_forest', 'birch_forest_mutated', 'roofed_forest', 'pale_garden', 'taiga', 'mega_taiga', 'redwood_taiga_mutated', 'cold_taiga',
    'savanna', 'savanna_plateau', 'savanna_mutated', 'extreme_hills', 'extreme_hills_mutated', 'extreme_hills_plus_trees', 'jungle', 'jungle_edge',
    'bamboo_jungle', 'mesa', 'mesa_bryce', 'mesa_plateau_stone', 'meadow', 'cherry_grove', 'grove', 'snowy_slopes', 'frozen_peaks', 'jagged_peaks',
    'stony_peaks', 'river', 'frozen_river', 'beach', 'cold_beach', 'stone_beach', 'warm_ocean', 'lukewarm_ocean', 'deep_lukewarm_ocean', 'ocean',
    'deep_ocean', 'cold_ocean', 'deep_cold_ocean', 'frozen_ocean', 'deep_frozen_ocean', 'mushroom_island', 'dripstone_caves', 'lush_caves', 'deep_dark',
  ],
  nether: ['hell', 'soulsand_valley', 'crimson_forest', 'warped_forest', 'basalt_deltas'],
  the_end: ['the_end'],
};

export const BIOME_LABEL = {
  plains: 'Planícies', sunflower_plains: 'Planícies de girassóis', ice_plains: 'Planícies nevadas', ice_plains_spikes: 'Picos de gelo',
  desert: 'Deserto', swampland: 'Pântano', mangrove_swamp: 'Manguezal', forest: 'Floresta', flower_forest: 'Floresta florida',
  birch_forest: 'Floresta de bétulas', birch_forest_mutated: 'Bétulas antigas', roofed_forest: 'Floresta escura', pale_garden: 'Jardim pálido',
  taiga: 'Taiga', mega_taiga: 'Taiga de pinheiros antigos', redwood_taiga_mutated: 'Taiga de abetos antigos', cold_taiga: 'Taiga nevada',
  savanna: 'Savana', savanna_plateau: 'Platô de savana', savanna_mutated: 'Savana fustigada', extreme_hills: 'Colinas fustigadas',
  extreme_hills_mutated: 'Colinas de cascalho fustigadas', extreme_hills_plus_trees: 'Floresta fustigada', jungle: 'Selva', jungle_edge: 'Selva esparsa',
  bamboo_jungle: 'Selva de bambu', mesa: 'Badlands', mesa_bryce: 'Badlands erodidas', mesa_plateau_stone: 'Badlands arborizadas', meadow: 'Prado',
  cherry_grove: 'Bosque de cerejeiras', grove: 'Bosque nevado', snowy_slopes: 'Encostas nevadas', frozen_peaks: 'Picos congelados',
  jagged_peaks: 'Picos irregulares', stony_peaks: 'Picos rochosos', river: 'Rio', frozen_river: 'Rio congelado', beach: 'Praia',
  cold_beach: 'Praia nevada', stone_beach: 'Costa rochosa', warm_ocean: 'Oceano quente', lukewarm_ocean: 'Oceano morno',
  deep_lukewarm_ocean: 'Oceano morno profundo', ocean: 'Oceano', deep_ocean: 'Oceano profundo', cold_ocean: 'Oceano frio',
  deep_cold_ocean: 'Oceano frio profundo', frozen_ocean: 'Oceano congelado', deep_frozen_ocean: 'Oceano congelado profundo',
  mushroom_island: 'Campos de cogumelos', dripstone_caves: 'Cavernas de espeleotemas', lush_caves: 'Cavernas exuberantes', deep_dark: 'Escuro profundo',
  hell: 'Ermos do Nether', soulsand_valley: 'Vale das almas', crimson_forest: 'Floresta carmesim', warped_forest: 'Floresta distorcida',
  basalt_deltas: 'Deltas de basalto', the_end: 'The End',
};

/** Swatch colour for dye/wool/shulker entries ("minecraft:light_blue_wool" → css colour). */
export const DYE_COLOR = {
  white: '#f0f0f0', orange: '#f07613', magenta: '#bd44b3', light_blue: '#3aafd9', yellow: '#f8c627', lime: '#70b919', pink: '#ed8dac', gray: '#3e4447',
  light_gray: '#8e8e86', cyan: '#158991', purple: '#792aac', blue: '#35399d', brown: '#724728', green: '#546d1b', red: '#a12722', black: '#141519', undyed: '#946794',
};
export const colorOf = id => DYE_COLOR[Object.keys(DYE_COLOR).sort((a, b) => b.length - a.length).find(c => id.replace('minecraft:', '').startsWith(`${c}_`))];
