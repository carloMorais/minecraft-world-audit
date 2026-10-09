// pt-BR display names for vanilla ids. Exact entries first, then rules for the big families
// (tools, armour, colours, woods, ores, stairs/slabs/walls). Anything unknown falls back to English.

const EXACT = {
  // materials and drops
  diamond: 'Diamante', emerald: 'Esmeralda', coal: 'Carvão', charcoal: 'Carvão vegetal', iron_ingot: 'Barra de ferro', gold_ingot: 'Barra de ouro',
  copper_ingot: 'Barra de cobre', netherite_ingot: 'Barra de netherite', netherite_scrap: 'Fragmento de netherite', iron_nugget: 'Pepita de ferro',
  gold_nugget: 'Pepita de ouro', raw_iron: 'Ferro bruto', raw_gold: 'Ouro bruto', raw_copper: 'Cobre bruto', lapis_lazuli: 'Lápis-lazúli',
  redstone: 'Redstone', quartz: 'Quartzo do Nether', amethyst_shard: 'Fragmento de ametista', glowstone_dust: 'Pó de pedra luminosa',
  stick: 'Graveto', string: 'Linha', feather: 'Pena', leather: 'Couro', rabbit_hide: 'Couro de coelho', bone: 'Osso', bone_meal: 'Farinha de osso',
  gunpowder: 'Pólvora', flint: 'Sílex', slime_ball: 'Bola de slime', ender_pearl: 'Pérola do Ender', ender_eye: 'Olho do Ender',
  blaze_rod: 'Vara de blaze', blaze_powder: 'Pó de blaze', ghast_tear: 'Lágrima de ghast', magma_cream: 'Creme de magma',
  spider_eye: 'Olho de aranha', fermented_spider_eye: 'Olho de aranha fermentado', rotten_flesh: 'Carne podre', paper: 'Papel',
  book: 'Livro', writable_book: 'Livro e pena', written_book: 'Livro escrito', enchanted_book: 'Livro encantado', name_tag: 'Etiqueta',
  lead: 'Laço', saddle: 'Sela', nether_star: 'Estrela do Nether', totem_of_undying: 'Totem da imortalidade', elytra: 'Élitro',
  shulker_shell: 'Casca de shulker', phantom_membrane: 'Membrana de phantom', heart_of_the_sea: 'Coração do mar', nautilus_shell: 'Concha de náutilo',
  prismarine_shard: 'Fragmento de prismarinho', prismarine_crystals: 'Cristais de prismarinho', echo_shard: 'Fragmento de eco',
  experience_bottle: 'Frasco de experiência', glass_bottle: 'Frasco de vidro', potion: 'Poção', splash_potion: 'Poção arremessável',
  lingering_potion: 'Poção persistente', honey_bottle: 'Frasco de mel', honeycomb: 'Favo de mel', ink_sac: 'Bolsa de tinta',
  glow_ink_sac: 'Bolsa de tinta brilhante', clay_ball: 'Bola de argila', brick: 'Tijolo', nether_brick: 'Tijolo do Nether', sugar: 'Açúcar',
  wheat: 'Trigo', wheat_seeds: 'Sementes de trigo', pumpkin_seeds: 'Sementes de abóbora', melon_seeds: 'Sementes de melancia',
  beetroot_seeds: 'Sementes de beterraba', nether_wart: 'Fungo do Nether', sugar_cane: 'Cana-de-açúcar', cocoa_beans: 'Sementes de cacau',
  egg: 'Ovo', arrow: 'Flecha', snowball: 'Bola de neve', firework_rocket: 'Foguete de artifício', fire_charge: 'Carga de fogo',
  map: 'Mapa vazio', empty_map: 'Mapa vazio', filled_map: 'Mapa', compass: 'Bússola', recovery_compass: 'Bússola de recuperação', clock: 'Relógio',
  spyglass: 'Luneta', trial_key: 'Chave de desafio', ominous_trial_key: 'Chave de desafio sinistra', breeze_rod: 'Vara de breeze',
  wind_charge: 'Carga de vento', heavy_core: 'Núcleo pesado', armadillo_scute: 'Escama de tatu', turtle_scute: 'Escama de tartaruga',
  goat_horn: 'Chifre de cabra', disc_fragment_5: 'Fragmento de disco',
  // tools and gear without a material
  bow: 'Arco', crossbow: 'Besta', trident: 'Tridente', mace: 'Maça', shield: 'Escudo', fishing_rod: 'Vara de pesca', shears: 'Tesoura',
  flint_and_steel: 'Isqueiro', carrot_on_a_stick: 'Cenoura no graveto', warped_fungus_on_a_stick: 'Fungo distorcido no graveto', brush: 'Pincel',
  bucket: 'Balde', water_bucket: 'Balde de água', lava_bucket: 'Balde de lava', milk_bucket: 'Balde de leite', powder_snow_bucket: 'Balde de neve fofa',
  turtle_helmet: 'Casco de tartaruga', wolf_armor: 'Armadura de lobo', bundle: 'Trouxa', minecart: 'Carrinho', chest_minecart: 'Carrinho com baú',
  hopper_minecart: 'Carrinho com funil', tnt_minecart: 'Carrinho com TNT',
  // food
  apple: 'Maçã', golden_apple: 'Maçã dourada', enchanted_golden_apple: 'Maçã dourada encantada', bread: 'Pão', cookie: 'Biscoito', cake: 'Bolo',
  pumpkin_pie: 'Torta de abóbora', carrot: 'Cenoura', golden_carrot: 'Cenoura dourada', potato: 'Batata', baked_potato: 'Batata assada',
  poisonous_potato: 'Batata venenosa', beetroot: 'Beterraba', beetroot_soup: 'Sopa de beterraba', melon_slice: 'Fatia de melancia',
  glistering_melon_slice: 'Fatia de melancia reluzente', sweet_berries: 'Bagas doces', glow_berries: 'Bagas brilhantes', chorus_fruit: 'Fruta do coro',
  beef: 'Carne crua', cooked_beef: 'Bife', porkchop: 'Costeleta de porco crua', cooked_porkchop: 'Costeleta de porco cozida', chicken: 'Frango cru',
  cooked_chicken: 'Frango assado', mutton: 'Carneiro cru', cooked_mutton: 'Carneiro assado', rabbit: 'Coelho cru', cooked_rabbit: 'Coelho assado',
  cod: 'Bacalhau cru', cooked_cod: 'Bacalhau cozido', salmon: 'Salmão cru', cooked_salmon: 'Salmão cozido', tropical_fish: 'Peixe tropical',
  pufferfish: 'Baiacu', mushroom_stew: 'Ensopado de cogumelos', rabbit_stew: 'Ensopado de coelho', suspicious_stew: 'Ensopado suspeito',
  dried_kelp: 'Alga seca', honey_block: 'Bloco de mel',
  // blocks
  stone: 'Pedra', cobblestone: 'Pedregulho', mossy_cobblestone: 'Pedregulho com musgo', smooth_stone: 'Pedra lisa', stone_bricks: 'Tijolos de pedra',
  mossy_stone_bricks: 'Tijolos de pedra com musgo', cracked_stone_bricks: 'Tijolos de pedra rachados', chiseled_stone_bricks: 'Tijolos de pedra talhados',
  granite: 'Granito', diorite: 'Diorito', andesite: 'Andesito', polished_granite: 'Granito polido', polished_diorite: 'Diorito polido',
  polished_andesite: 'Andesito polido', deepslate: 'Ardósia', cobbled_deepslate: 'Pedregulho de ardósia', polished_deepslate: 'Ardósia polida',
  deepslate_bricks: 'Tijolos de ardósia', deepslate_tiles: 'Ladrilhos de ardósia', tuff: 'Tufo', calcite: 'Calcita', dripstone_block: 'Bloco de espeleotema',
  pointed_dripstone: 'Espeleotema pontiagudo', bedrock: 'Rocha-mãe', dirt: 'Terra', coarse_dirt: 'Terra infértil', rooted_dirt: 'Terra com raízes',
  grass_block: 'Bloco de grama', grass: 'Bloco de grama', short_grass: 'Grama', tall_grass: 'Grama alta', fern: 'Samambaia', podzol: 'Podzol',
  mycelium: 'Micélio', mud: 'Lama', packed_mud: 'Lama compactada', mud_bricks: 'Tijolos de lama', clay: 'Argila', gravel: 'Cascalho', sand: 'Areia',
  red_sand: 'Areia vermelha', sandstone: 'Arenito', red_sandstone: 'Arenito vermelho', smooth_sandstone: 'Arenito liso', cut_sandstone: 'Arenito cortado',
  glass: 'Vidro', glass_pane: 'Painel de vidro', tinted_glass: 'Vidro fumê', ice: 'Gelo', packed_ice: 'Gelo compactado', blue_ice: 'Gelo azul',
  snow: 'Bloco de neve', snow_layer: 'Neve', obsidian: 'Obsidiana', crying_obsidian: 'Obsidiana chorona', netherrack: 'Netherrack',
  nether_bricks: 'Tijolos do Nether', red_nether_bricks: 'Tijolos vermelhos do Nether', soul_sand: 'Areia das almas', soul_soil: 'Solo das almas',
  basalt: 'Basalto', polished_basalt: 'Basalto polido', smooth_basalt: 'Basalto liso', blackstone: 'Pedra-negra', polished_blackstone: 'Pedra-negra polida',
  polished_blackstone_bricks: 'Tijolos de pedra-negra polida', glowstone: 'Pedra luminosa', magma: 'Bloco de magma', magma_block: 'Bloco de magma',
  end_stone: 'Pedra do End', end_bricks: 'Tijolos de pedra do End', end_stone_bricks: 'Tijolos de pedra do End', purpur_block: 'Bloco de púrpura',
  prismarine: 'Prismarinho', prismarine_bricks: 'Tijolos de prismarinho', dark_prismarine: 'Prismarinho escuro', sea_lantern: 'Lanterna do mar',
  sponge: 'Esponja', wet_sponge: 'Esponja molhada', bricks: 'Tijolos', brick_block: 'Tijolos', bookshelf: 'Estante', chiseled_bookshelf: 'Estante entalhada',
  hay_block: 'Fardo de feno', bone_block: 'Bloco de osso', slime: 'Bloco de slime', slime_block: 'Bloco de slime', moss_block: 'Bloco de musgo',
  moss_carpet: 'Tapete de musgo', amethyst_block: 'Bloco de ametista', budding_amethyst: 'Ametista germinante', amethyst_cluster: 'Aglomerado de ametista',
  sculk: 'Sculk', sculk_vein: 'Veia de sculk', sculk_sensor: 'Sensor de sculk', sculk_catalyst: 'Catalisador de sculk', sculk_shrieker: 'Guinchador de sculk',
  water: 'Água', flowing_water: 'Água', lava: 'Lava', flowing_lava: 'Lava', air: 'Ar', cave_air: 'Ar', kelp: 'Alga', seagrass: 'Ervas marinhas',
  vine: 'Trepadeira', lily_pad: 'Vitória-régia', waterlily: 'Vitória-régia', cactus: 'Cacto', pumpkin: 'Abóbora', carved_pumpkin: 'Abóbora esculpida',
  lit_pumpkin: 'Lanterna de abóbora', jack_o_lantern: 'Lanterna de abóbora', melon_block: 'Melancia', melon: 'Melancia', bamboo: 'Bambu',
  brown_mushroom: 'Cogumelo marrom', red_mushroom: 'Cogumelo vermelho', poppy: 'Papoula', dandelion: 'Dente-de-leão', azure_bluet: 'Houstônia azul',
  cornflower: 'Centáurea', lily_of_the_valley: 'Lírio-do-vale', oxeye_daisy: 'Margarida', sunflower: 'Girassol', torch: 'Tocha', soul_torch: 'Tocha das almas',
  lantern: 'Lanterna', soul_lantern: 'Lanterna das almas', campfire: 'Fogueira', soul_campfire: 'Fogueira das almas', ladder: 'Escada de mão',
  scaffolding: 'Andaime', rail: 'Trilho', golden_rail: 'Trilho energizado', detector_rail: 'Trilho detector', activator_rail: 'Trilho ativador',
  chest: 'Baú', trapped_chest: 'Baú com armadilha', ender_chest: 'Baú do Ender', barrel: 'Barril', shulker_box: 'Caixa de shulker',
  undyed_shulker_box: 'Caixa de shulker', crafting_table: 'Bancada de trabalho', furnace: 'Fornalha', blast_furnace: 'Alto-forno', smoker: 'Defumador',
  anvil: 'Bigorna', chipped_anvil: 'Bigorna lascada', damaged_anvil: 'Bigorna danificada', enchanting_table: 'Mesa de encantamento',
  brewing_stand: 'Suporte de poções', cauldron: 'Caldeirão', beacon: 'Sinalizador', conduit: 'Conduíte', lodestone: 'Magnetita', respawn_anchor: 'Âncora de renascimento',
  hopper: 'Funil', dropper: 'Liberador', dispenser: 'Ejetor', observer: 'Observador', piston: 'Pistão', sticky_piston: 'Pistão grudento',
  lever: 'Alavanca', repeater: 'Repetidor de redstone', comparator: 'Comparador de redstone', redstone_torch: 'Tocha de redstone',
  redstone_block: 'Bloco de redstone', redstone_lamp: 'Lâmpada de redstone', target: 'Alvo', daylight_detector: 'Sensor de luz solar', tnt: 'TNT',
  note_block: 'Bloco musical', noteblock: 'Bloco musical', jukebox: 'Toca-discos', bell: 'Sino', lectern: 'Atril', loom: 'Tear', grindstone: 'Rebolo',
  stonecutter: 'Cortador de pedras', stonecutter_block: 'Cortador de pedras', cartography_table: 'Mesa de cartografia', fletching_table: 'Mesa de arco e flecha',
  smithing_table: 'Mesa de ferraria', composter: 'Composteira', beehive: 'Colmeia', bee_nest: 'Ninho de abelhas', flower_pot: 'Vaso de flores',
  decorated_pot: 'Vaso decorado', item_frame: 'Moldura', frame: 'Moldura', glow_frame: 'Moldura brilhante', glow_item_frame: 'Moldura brilhante',
  painting: 'Pintura', armor_stand: 'Suporte de armadura', end_portal_frame: 'Moldura do portal do End', mob_spawner: 'Gerador de mobs', spawner: 'Gerador de mobs',
  trial_spawner: 'Gerador de desafios', vault: 'Cofre', crafter: 'Fabricador', iron_bars: 'Barras de ferro', iron_door: 'Porta de ferro',
  iron_trapdoor: 'Alçapão de ferro', chain: 'Corrente', cobweb: 'Teia', web: 'Teia', ancient_debris: 'Detritos ancestrais', gilded_blackstone: 'Pedra-negra dourada',
  nether_gold_ore: 'Minério de ouro do Nether', quartz_ore: 'Minério de quartzo do Nether', nether_quartz_ore: 'Minério de quartzo do Nether',
  quartz_block: 'Bloco de quartzo', diamond_block: 'Bloco de diamante', emerald_block: 'Bloco de esmeralda', gold_block: 'Bloco de ouro',
  iron_block: 'Bloco de ferro', netherite_block: 'Bloco de netherite', lapis_block: 'Bloco de lápis-lazúli', coal_block: 'Bloco de carvão',
  copper_block: 'Bloco de cobre', raw_iron_block: 'Bloco de ferro bruto', raw_gold_block: 'Bloco de ouro bruto', raw_copper_block: 'Bloco de cobre bruto',
  terracotta: 'Terracota', hardened_clay: 'Terracota', wool: 'Lã', carpet: 'Tapete', concrete: 'Concreto', candle: 'Vela', bed: 'Cama', banner: 'Estandarte',
  white_tulip: 'Tulipa branca', red_tulip: 'Tulipa vermelha', pink_tulip: 'Tulipa rosa', orange_tulip: 'Tulipa laranja', allium: 'Alho-poró', blue_orchid: 'Orquídea azul',
  // mobs and other entities
  zombie: 'Zumbi', zombie_villager: 'Aldeão zumbi', zombie_villager_v2: 'Aldeão zumbi', husk: 'Zumbi-múmia', drowned: 'Afogado', skeleton: 'Esqueleto',
  stray: 'Esqueleto errante', wither_skeleton: 'Esqueleto wither', creeper: 'Creeper', spider: 'Aranha', cave_spider: 'Aranha das cavernas', enderman: 'Enderman',
  endermite: 'Endermite', silverfish: 'Traça', witch: 'Bruxa', magma_cube: 'Cubo de magma', ghast: 'Ghast', blaze: 'Blaze',
  phantom: 'Phantom', pillager: 'Saqueador', vindicator: 'Vingador', evoker: 'Invocador', vex: 'Vex', ravager: 'Devastador', guardian: 'Guardião',
  elder_guardian: 'Guardião ancião', shulker: 'Shulker', piglin: 'Piglin', piglin_brute: 'Piglin bruto', zombie_pigman: 'Piglin zumbificado',
  zombified_piglin: 'Piglin zumbificado', hoglin: 'Hoglin', zoglin: 'Zoglin', warden: 'Warden', breeze: 'Breeze', bogged: 'Esqueleto do pântano',
  creaking: 'Rangedor', wither: 'Wither', ender_dragon: 'Ender Dragon', villager: 'Aldeão', villager_v2: 'Aldeão', wandering_trader: 'Vendedor ambulante',
  iron_golem: 'Golem de ferro', snow_golem: 'Golem de neve', cow: 'Vaca', mooshroom: 'Vacogumelo', pig: 'Porco', sheep: 'Ovelha',
  horse: 'Cavalo', donkey: 'Burro', mule: 'Mula', skeleton_horse: 'Cavalo esqueleto', zombie_horse: 'Cavalo zumbi', llama: 'Lhama',
  trader_llama: 'Lhama do vendedor', camel: 'Camelo', wolf: 'Lobo', cat: 'Gato', ocelot: 'Jaguatirica', fox: 'Raposa', parrot: 'Papagaio', 
  bee: 'Abelha', goat: 'Cabra', panda: 'Panda', polar_bear: 'Urso-polar', turtle: 'Tartaruga', dolphin: 'Golfinho', squid: 'Lula', glow_squid: 'Lula brilhante',
  axolotl: 'Axolote', frog: 'Sapo', tadpole: 'Girino', allay: 'Allay', sniffer: 'Farejador', armadillo: 'Tatu', bat: 'Morcego', strider: 'Lavagante',
  xp_orb: 'Orbe de experiência', falling_block: 'Bloco caindo', boat: 'Barco',
  chest_boat: 'Barco com baú', npc: 'NPC', agent: 'Agente', fireworks_rocket: 'Foguete', thrown_trident: 'Tridente arremessado', fishing_hook: 'Anzol',
  leash_knot: 'Nó de laço', lightning_bolt: 'Raio', ender_crystal: 'Cristal do End', tripod_camera: 'Câmera',
};

// entity ids that clash with item ids (minecraft:chicken is both a mob and raw chicken)
const MOBS = {
  chicken: 'Galinha', rabbit: 'Coelho', salmon: 'Salmão', cod: 'Bacalhau', slime: 'Slime', pufferfish: 'Baiacu', tropical_fish: 'Peixe tropical',
  item: 'Item no chão', egg: 'Ovo arremessado', arrow: 'Flecha', snowball: 'Bola de neve', ender_pearl: 'Pérola do Ender arremessada', tnt: 'TNT acesa',
  minecart: 'Carrinho', chest_minecart: 'Carrinho com baú', hopper_minecart: 'Carrinho com funil', tnt_minecart: 'Carrinho com TNT', boat: 'Barco',
  chest_boat: 'Barco com baú', painting: 'Pintura', armor_stand: 'Suporte de armadura', splash_potion: 'Poção arremessada', wind_charge_projectile: 'Carga de vento',
};

/** pt-BR name for an entity id without namespace, or null. */
export const ptMobName = name => MOBS[name] || ptName(name);

const COLORS = {
  white: ['branco', 'branca'], orange: ['laranja', 'laranja'], magenta: ['magenta', 'magenta'], light_blue: ['azul-claro', 'azul-clara'],
  yellow: ['amarelo', 'amarela'], lime: ['verde-limão', 'verde-limão'], pink: ['rosa', 'rosa'], gray: ['cinza', 'cinza'],
  light_gray: ['cinza-claro', 'cinza-clara'], silver: ['cinza-claro', 'cinza-clara'], cyan: ['ciano', 'ciano'], purple: ['roxo', 'roxa'],
  blue: ['azul', 'azul'], brown: ['marrom', 'marrom'], green: ['verde', 'verde'], red: ['vermelho', 'vermelha'], black: ['preto', 'preta'],
};
// [noun, feminine?]
const COLORED = {
  wool: ['Lã', 1], carpet: ['Tapete', 0], concrete: ['Concreto', 0], concrete_powder: ['Concreto em pó', 0], terracotta: ['Terracota', 1],
  glazed_terracotta: ['Terracota esmaltada', 1], stained_glass: ['Vidro tingido', 0], stained_glass_pane: ['Painel de vidro tingido', 0],
  bed: ['Cama', 1], banner: ['Estandarte', 0], candle: ['Vela', 1], shulker_box: ['Caixa de shulker', 1], dye: ['Corante', 0], harness: ['Arreio', 0],
};

const WOODS = {
  oak: 'carvalho', spruce: 'pinheiro', birch: 'bétula', jungle: 'selva', acacia: 'acácia', dark_oak: 'carvalho escuro', mangrove: 'mangue',
  cherry: 'cerejeira', bamboo: 'bambu', crimson: 'carmesim', warped: 'distorcido', pale_oak: 'carvalho pálido',
};
const WOODEN = {
  planks: 'Tábuas de', log: 'Tronco de', wood: 'Madeira de', stem: 'Caule de', hyphae: 'Hifas de', leaves: 'Folhas de', sapling: 'Muda de',
  stairs: 'Escadas de', slab: 'Laje de', fence: 'Cerca de', fence_gate: 'Portão de', door: 'Porta de', trapdoor: 'Alçapão de', button: 'Botão de',
  pressure_plate: 'Placa de pressão de', sign: 'Placa de', standing_sign: 'Placa de', wall_sign: 'Placa de', hanging_sign: 'Placa suspensa de',
  boat: 'Barco de', chest_boat: 'Barco com baú de', fungus: 'Fungo', roots: 'Raízes', nylium: 'Nylium',
};

const STRIPPED = { log: 'Tronco descascado de', wood: 'Madeira descascada de', stem: 'Caule descascado de', hyphae: 'Hifas descascadas de' };

const MATERIAL = {
  wooden: 'de madeira', stone: 'de pedra', iron: 'de ferro', golden: 'de ouro', diamond: 'de diamante', netherite: 'de netherite',
  leather: 'de couro', chainmail: 'de malha', copper: 'de cobre',
};
const GEAR = {
  sword: 'Espada', pickaxe: 'Picareta', axe: 'Machado', shovel: 'Pá', hoe: 'Enxada',
  helmet: 'Capacete', chestplate: 'Peitoral', leggings: 'Calças', boots: 'Botas', horse_armor: 'Armadura para cavalo',
};
const ORES = { coal: 'carvão', iron: 'ferro', gold: 'ouro', diamond: 'diamante', emerald: 'esmeralda', lapis: 'lápis-lazúli', redstone: 'redstone', copper: 'cobre' };
const SHAPES = { stairs: 'Escadas de', slab: 'Laje de', double_slab: 'Laje dupla de', wall: 'Muro de' };

const lower = s => s[0].toLowerCase() + s.slice(1);

/** pt-BR name for a vanilla id without namespace ("diamond_sword"), or null when unknown. */
export function ptName(name) {
  if (!name) return null;
  if (EXACT[name]) return EXACT[name];

  let m = name.match(/^(\w+?)_(sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots|horse_armor)$/);
  if (m && MATERIAL[m[1]]) return `${GEAR[m[2]]} ${MATERIAL[m[1]]}`;

  m = name.match(/^(deepslate_)?(\w+)_ore$/);
  if (m && ORES[m[2]]) return `Minério de ${ORES[m[2]]}${m[1] ? ' de ardósia' : ''}`;

  for (const [c, [mc, fc]] of Object.entries(COLORS)) {
    if (!name.startsWith(`${c}_`)) continue;
    const rest = name.slice(c.length + 1);
    if (COLORED[rest]) {
      const [noun, fem] = COLORED[rest];
      return `${noun} ${fem ? fc : mc}`;
    }
  }

  m = name.match(/^stripped_(\w+?)_(log|wood|stem|hyphae)$/);
  if (m && WOODS[m[1]]) return `${STRIPPED[m[2]]} ${WOODS[m[1]]}`;
  m = name.match(/^(\w+?)_(planks|log|wood|stem|hyphae|leaves|sapling|stairs|slab|fence_gate|fence|door|trapdoor|button|pressure_plate|hanging_sign|standing_sign|wall_sign|sign|chest_boat|boat)$/);
  if (m && WOODS[m[1]]) return `${WOODEN[m[2]]} ${WOODS[m[1]]}`;

  m = name.match(/^(\w+?)_(double_slab|stairs|slab|wall)$/);
  if (m) {
    const base = ptName(m[1]) || ptName(`${m[1]}s`);
    if (base) return `${SHAPES[m[2]]} ${lower(base)}`;
  }

  m = name.match(/^music_disc_(\w+)$/);
  if (m) return `Disco de música (${m[1]})`;
  m = name.match(/^(\w+)_spawn_egg$/);
  if (m) return `Ovo gerador de ${lower(ptName(m[1]) || m[1].replace(/_/g, ' '))}`;
  m = name.match(/^(\w+)_smithing_template$/);
  if (m) return 'Molde de ferraria';
  m = name.match(/^(\w+)_pottery_sherd$/);
  if (m) return 'Fragmento de cerâmica';
  m = name.match(/^(\w+)_banner_pattern$/);
  if (m) return 'Padrão de estandarte';
  return null;
}
