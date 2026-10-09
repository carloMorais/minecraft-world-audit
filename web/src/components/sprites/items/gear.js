// Item sprites: armour, mounts and vehicles, containers you carry (buckets, bundles), frames
// and spawn eggs. See draw.js for the format.
import { DYES, RAMPS, WOODS, dyeOf, woodOf } from '../color.js';

// Material ramp letters: o outline · d dark · s shade · a base · l light · w glint.
const MAT = { o: '@0', d: '@1', s: '@2', a: '@3', l: '@4', w: '@5' };
// Second ramp for details (spawn egg spots, boat chests…).
const SEC = { O: '%0', D: '%1', S: '%2', A: '%3', L: '%4', W: '%5' };
const IRON = { i: '#353535', I: '#5f5f5f', j: '#828282', J: '#c6c6c6', k: '#e2e2e2' };
const WOOD = { h: '#9f844d', H: '#684e1e', g: '#49361b', G: '#28190a' };

/** Lays the non-'.' cells of `top` over `base`. */
const over = (base, top) => base.map((row, y) => [...row].map((ch, x) => (top[y]?.[x] && top[y][x] !== '.' ? top[y][x] : ch)).join(''));

/** Chainmail: the same piece, with the ring holes punched through its body. */
const rings = rows => rows.map((row, y) => [...row].map((ch, x) => {
  if (!'lasw'.includes(ch)) return ch;
  const near = (dx, dy) => (rows[y + dy]?.[x + dx] ?? '.');
  const edge = [near(-1, 0), near(1, 0), near(0, -1), near(0, 1)].some(c => c === 'o' || c === '.');
  return !edge && y % 2 === 1 && x % 2 === 0 ? 'd' : ch;
}).join(''));

const helmet = [
  '................',
  '................',
  '................',
  '....oooooooo....',
  '...owwllllaao...',
  '..owllaaaaaaso..',
  '..olaaaaaaaaso..',
  '..olaaaaaaasdo..',
  '..olaoooooosdo..',
  '..olo......odo..',
  '..oao......odo..',
  '..oso......odo..',
  '..ooo......ooo..',
  '................',
  '................',
  '................',
];
const chestplate = [
  '................',
  '..ooo......ooo..',
  '.owlao....oasdo.',
  '.olaaoooooosado.',
  '.olaaaaaaaaasdo.',
  '.olaaaaaaaaasdo.',
  '.ooolaaaaaasooo.',
  '...olaaaaaasdo..',
  '...olaaaaaasdo..',
  '...olaaaaaasdo..',
  '...olaaaaassdo..',
  '...oooooooooo...',
  '................',
  '................',
  '................',
  '................',
].map(r => r.slice(0, 16).padEnd(16, '.'));
const leggings = [
  '................',
  '................',
  '...oooooooooo...',
  '...owllllaasdo..',
  '...odddddddddo..',
  '...olaaaoaasdo..',
  '...olao..oasdo..',
  '...olao..oasdo..',
  '...olao..oasdo..',
  '...olao..osddo..',
  '...olao..osddo..',
  '...oaso..osddo..',
  '...oooo..ooooo..',
  '................',
  '................',
  '................',
];
const boots = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '..oooo....oooo..',
  '..owlo....oaso..',
  '..olao....oaso..',
  '..olao....osdo..',
  '.oolao....osdoo.',
  '.olaaao..oassdo.',
  '.osaaso..osssdo.',
  '.oooooo..oooooo.',
  '................',
  '................',
  '................',
];
// Turtle shell: the helmet silhouette with scute seams.
const turtleHelmet = [
  '................',
  '................',
  '................',
  '....oooooooo....',
  '...owwldllaao...',
  '..owlldlllaaso..',
  '..oldddaadddso..',
  '..olaaadaaasdo..',
  '..olaoooooosdo..',
  '..olo......odo..',
  '..oao......odo..',
  '..oso......odo..',
  '..ooo......ooo..',
  '................',
  '................',
  '................',
];

const horseArmor = [
  '................',
  '..........oo....',
  '.........owo....',
  '........owlo....',
  '.......owlaoo...',
  '......owlaaaso..',
  '.....owlaaaaaso.',
  '....owlaoaaaasdo',
  '...owlaaaaaaasdo',
  '..owlaaaddaaasdo',
  '.owlaaaadaaassdo',
  '.olaaaaoooassddo',
  '.oaaaao..oassdo.',
  '.osaso...osddo..',
  '..ooo....oooo...',
  '................',
];

const wolfArmor = [
  '................',
  '................',
  '................',
  '.....oooooo.....',
  '...oolaolaoo....',
  '..olaaolaaoao...',
  '.olaaaolaasoao..',
  '.oaaasoaasdoaso.',
  'oaaasdoasddoasdo',
  'osssddosdddosddo',
  'oooooooooooooooo',
  '..oKKo....oKKo..',
  '...oo......oo...',
  '................',
  '................',
  '................',
];

const elytraLeft = [
  '........',
  '...ooooo',
  '..owwlll',
  '.owllaaa',
  '.olaaaas',
  'owlaaasd',
  'olaadsdo',
  'olaasddo',
  'oladsdo.',
  'olasddo.',
  'oadsdo..',
  'oasddo..',
  'oasdo...',
  'osdo....',
  'odo.....',
  'oo......',
];
const elytra = elytraLeft.map(r => r + [...r].reverse().join(''));

const saddle = [
  '................',
  '................',
  '................',
  '.oo..........oo.',
  '.olo........olo.',
  '.olaoooooooolao.',
  '.olaaaaaaaaaaso.',
  '.odsaaaaaaaaasdo',
  '..odssaaaaasddo.',
  '...oodsssssdoo..',
  '......oddo......',
  '......oddo......',
  '.....ojjjjo.....',
  '.....j....j.....',
  '.....jJJJJj.....',
  '................',
];

// Bucket: iron body; f/F/g are the contents (tint B), the dark inside when empty.
// Happy ghast harness: dyed padding (tint), leather straps (L) and goggles (b glass).
const harness = [
  '................',
  '................',
  '...GGGG..GGGG...',
  '..GbcbG..GbcbG..',
  '..GbbBGLLGbbBG..',
  '...GGGG..GGGG...',
  '....L......L....',
  '...oLooooooLo...',
  '..olLllllllLao..',
  '.olaLaaaaaaLaso.',
  '.oaaLLLLLLLLsdo.',
  '.osaLaaaaaaLsdo.',
  '..osLssssssLdo..',
  '...oLooooooLo...',
  '....T......T....',
  '................',
];

// Nautilus armour: a ridged shell cap in the material's colours, with leather straps.
const nautilusArmor = [
  '................',
  '................',
  '......ooooo.....',
  '....oowlllaoo...',
  '...owllaaaaasso.',
  '..owlaaddddaasdo',
  '..olaadaaaadasdo',
  '.owlaadaddadasdo',
  '.olaaadaaadaasdo',
  '.olaaaaddddaasdo',
  '.oaaaaaaaaaassdo',
  '.osaaaaaaaassddo',
  '..ossssssssddo..',
  '...oooooooooo...',
  '....LL....LL....',
  '....GG....GG....',
];

const bucket = [
  '................',
  '................',
  '................',
  '...iiiiiiiiii...',
  '..ijFFffffffJi..',
  '..ijgfffffffji..',
  '..iJjjjjjjjjIi..',
  '...iJkJJJJJIi...',
  '...iJJJJJJJIi...',
  '...ijJJJJJjIi...',
  '...ijJJJJJjIi...',
  '....ijJJJjIi....',
  '....ijjjjjIi....',
  '....iiiiiiii....',
  '................',
  '................',
];
// Fish buckets: water inside and the fish (x X tint A) in front.
const fishBucket = over(bucket, [
  '................',
  '................',
  '................',
  '................',
  '.....XXXX.......',
  '....XxxxxX..XX..',
  '...XxExxxxXXxX..',
  '...XxxxxxxxXxX..',
  '....XxxxxX..XX..',
  '.....XXXX.......',
  '................',
  '................',
  '................',
  '................',
  '................',
]);

const bundle = [
  '................',
  '................',
  '......oooo......',
  '.....oTttTo.....',
  '......oTTo......',
  '...oooooooooo...',
  '..owllllllaaso..',
  '..oddddddddddo..',
  '.olaaaaaaaaassdo',
  '.olaaaaaaaaassdo',
  '.oaaaaaaaaassddo',
  '.osaaaaaasssddo.',
  '..ossssssssddo..',
  '...oooooooooo...',
  '................',
  '................',
].map(r => r.slice(0, 16).padEnd(16, '.'));

const minecart = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.iiiiiiiiiiiiii.',
  '.ikkkkkkkkkkJi..',
  '.iJIIIIIIIIIIji.',
  '.ikJJJJJJJJJjIi.',
  '.iJJJJJJJJJJjIi.',
  '.ijjjjjjjjjjIIi.',
  '.iiiiiiiiiiiiii.',
  '..iIIi....iIIi..',
  '..ijIi....ijIi..',
  '...ii......ii...',
  '................',
].map(r => r.slice(0, 16).padEnd(16, '.'));
// Cargo drawn over the cart's opening.
const CARGO = {
  chest: [
    '................',
    '...oooooooooo...',
    '...olllllllso...',
    '...oaaaaaaaso...',
    '...ooooOOoooo...',
    '...osaaOOaado...',
    '...osaaaaaado...',
  ],
  hopper: [
    '................',
    '..iiiiiiiiiiii..',
    '..ikJJJJJJJJIi..',
    '..iIiiiiiiiiIi..',
    '...iJJJJJJJIi...',
    '....iJJJJJIi....',
    '.....iiIIii.....',
  ],
  tnt: [
    '................',
    '...oooooooooo...',
    '...orrrrrrrro...',
    '...oRRRRRRRRo...',
    '...oWWWWWWWWo...',
    '...oWzWzzWzWo...',
    '...orrrrrrrro...',
  ],
  furnace: [
    '................',
    '...iiiiiiiiii...',
    '...ijJJJJJJIi...',
    '...iJiiiiiiJi...',
    '...iJiyyyyiJi...',
    '...iJiYYYYiJi...',
    '...ijjjjjjjIi...',
  ],
  command_block: [
    '................',
    '...oooooooooo...',
    '...occcccccco...',
    '...ocCCCCCCco...',
    '...ocCbbbbCco...',
    '...ocCbbbbCco...',
    '...occcccccco...',
  ],
};
const CARGO_PAL = {
  ...WOOD, O: '#3a3a3a',
  r: '#db2f1e', R: '#a51d10', W: '#e8e8e8', z: '#3a3a3a',
  y: '#ffb43c', Y: '#e05a10',
  c: '#b0805a', C: '#d9a77a', b: '#5a4030',
};
const cargoSprite = name => over(minecart, CARGO[name].map(r => r.padEnd(16, '.')));

// Boat hull in the wood's planks colour (tint A); oar in its bark/stick colour.
const boat = [
  '................',
  '................',
  '................',
  '...........GG...',
  '..........GhG...',
  '.........GhG....',
  'oo......GhG...oo',
  'olo....GhG...olo',
  'oloooooGgoooooso',
  'olddddddddddddso',
  '.olaaaaaaaaaaso.',
  '.owlaaaaaaaassdo',
  '..olaaaaaaassdo.',
  '...oooooooooooo.',
  '................',
  '................',
].map(r => r.slice(0, 16).padEnd(16, '.'));
const chestBoat = over(boat, [
  '................',
  '................',
  '................',
  '................',
  '....OOOOOOO.....',
  '....OLLLLLAO....',
  '....OAAAAAAO....',
  '....OOOkkOOO....',
  '....OSAkkAAO....',
]);
const raft = [
  '................',
  '................',
  '................',
  '...........GG...',
  '..........GhG...',
  '.........GhG....',
  '........GhG.....',
  '.......GhG......',
  'oooooooGgooooooo',
  'owlaaowlaaowlaao',
  'olaaaolaaaolaaso',
  'osaasosaasosasdo',
  'odssdodssdodsddo',
  'oooooooooooooooo',
  '................',
  '................',
];
const chestRaft = over(raft, [
  '................',
  '................',
  '................',
  '....OOOOOOO.....',
  '....OLLLLLAO....',
  '....OAAAAAAO....',
  '....OOOkkOOO....',
  '....OSAkkAAO....',
]);

const armorStand = [
  '................',
  '.......GG.......',
  '.GGGGGGhHGGGGGG.',
  '.GhhhhhhhhhhhHG.',
  '.GGGGGGhHGGGGGG.',
  '......GhHG......',
  '......GhHG......',
  '......GhHG......',
  '...GGGGhHGGGG...',
  '...GhhhhhhhHG...',
  '...GGGGhHGGGG...',
  '......GhHG......',
  '......GhHG......',
  '..iiiiiiiiiiii..',
  '..ikJJJJJJJJIi..',
  '..iiiiiiiiiiii..',
];

// Frame (tint A) around a leather backing.
const itemFrame = [
  '................',
  '.oooooooooooooo.',
  '.owwlllllllllso.',
  '.owlooooooooaso.',
  '.olokKKKKKKkoso.',
  '.olokKKKKKKkoso.',
  '.olokKKKKKKkoso.',
  '.olokKKKKKKkoso.',
  '.olokKKKKKKkoso.',
  '.olokKKKKKKkoso.',
  '.olokKKKKKKkoso.',
  '.olokkkkkkkkoso.',
  '.olaoooooooosdo.',
  '.oassssssssssdo.',
  '.oooooooooooooo.',
  '................',
];
const FRAME_PAL = { ...MAT, k: '#5c3a1e', K: '#7a4f2a' };

const painting = [
  '................',
  '................',
  '.GGGGGGGGGGGGGG.',
  '.GhhhhhhhhhhhHG.',
  '.GhbbbbbbbbbBHG.',
  '.GhbbbbbbyybBHG.',
  '.GhbbbbbbyYbBHG.',
  '.GhbbcccbbbbBHG.',
  '.GhbbbbbbbbbmHG.',
  '.GhbbbbbmmbmMHG.',
  '.GhmmbbmMMmMMHG.',
  '.GhMMmmMMMMMMHG.',
  '.GhNNNNNNNNNNHG.',
  '.GHHHHHHHHHHHHG.',
  '.GGGGGGGGGGGGGG.',
  '................',
];
const PAINTING_PAL = {
  ...WOOD, b: '#5fa8e8', B: '#4f8fd0', y: '#fff36b', Y: '#f2c14e', c: '#ffffff',
  m: '#62a83c', M: '#447c2a', N: '#5a3c22',
};

const spawnEgg = [
  '................',
  '......oooo......',
  '.....owlaao.....',
  '....owlaAaao....',
  '....olaAAaao....',
  '...olaaaaaAao...',
  '...olaaaaAAso...',
  '..olaAAaaaaaso..',
  '..olAAaaaaasdo..',
  '..oaaaaaaAAsdo..',
  '..oaaaaaaAAsdo..',
  '..oaAaaaaassdo..',
  '...oaAAassddo...',
  '....oaasssdo....',
  '.....oooooo.....',
  '................',
];

// Vanilla spawn egg base and spot colours.
const EGG = {
  allay: ['#00daff', '#00adff'], armadillo: ['#ad716d', '#824848'], axolotl: ['#fbc1e3', '#a62d74'], bat: ['#4c3e30', '#0f0f0f'],
  bee: ['#edc343', '#43241b'], blaze: ['#f6b201', '#fff87e'], bogged: ['#8a9c72', '#30331f'], breeze: ['#af94df', '#9166df'],
  camel: ['#fcc369', '#cb9337'], cat: ['#efc88e', '#957256'], cave_spider: ['#0c424e', '#a80e0e'], chicken: ['#a1a1a1', '#ff0000'],
  cod: ['#c1a76a', '#e5c48b'], cow: ['#443626', '#a1a1a1'], creaking: ['#5f5f5f', '#fc7812'], creeper: ['#0da70b', '#000000'],
  dolphin: ['#223b4d', '#f9f9f9'], donkey: ['#534539', '#867566'], drowned: ['#8ff1d7', '#799c65'], elder_guardian: ['#ceccba', '#747693'],
  ender_dragon: ['#1c1c1c', '#e079fa'], enderman: ['#161616', '#000000'], endermite: ['#161616', '#6e6e6e'], evoker: ['#959b9b', '#1e1c1a'],
  fox: ['#d5b69f', '#cc6920'], frog: ['#d07444', '#ffc77c'], ghast: ['#f9f9f9', '#bcbcbc'], glow_squid: ['#095656', '#85f1bc'],
  goat: ['#a5947c', '#55493e'], guardian: ['#5a8272', '#f17d30'], hoglin: ['#c66e55', '#5f6464'], horse: ['#c09e7d', '#eee500'],
  husk: ['#797061', '#e6cc94'], iron_golem: ['#dbcdc1', '#74a332'], llama: ['#c09e7d', '#995f40'], magma_cube: ['#340000', '#fcfc00'],
  mooshroom: ['#a00f10', '#b7b7b7'], mule: ['#1b0200', '#51331d'], ocelot: ['#efde7d', '#564434'], panda: ['#e7e7e7', '#1b1b22'],
  parrot: ['#0da70b', '#ff0000'], phantom: ['#43518a', '#88ff00'], pig: ['#f0a5a2', '#db635f'], piglin: ['#995f40', '#f9f3a4'],
  piglin_brute: ['#592a10', '#f9f3a4'], pillager: ['#532f36', '#959b9b'], polar_bear: ['#f2f2f2', '#959590'], pufferfish: ['#f6b201', '#37c3f2'],
  rabbit: ['#995f40', '#734831'], ravager: ['#757470', '#5b5049'], salmon: ['#a00f10', '#0e8474'], sheep: ['#e7e7e7', '#ffb5b5'],
  shulker: ['#946994', '#4d3852'], silverfish: ['#6e6e6e', '#303030'], skeleton: ['#c1c1c1', '#494949'], skeleton_horse: ['#68684f', '#e5e5d8'],
  slime: ['#51a03e', '#7ebf6e'], sniffer: ['#871e09', '#26b096'], snow_golem: ['#d9f2f2', '#81a4a4'], spider: ['#342d27', '#a80e0e'],
  squid: ['#223b4d', '#708899'], stray: ['#617677', '#dde4e5'], strider: ['#9c3436', '#4d494d'], tadpole: ['#6d533d', '#160a00'],
  trader_llama: ['#eaa430', '#456296'], tropical_fish: ['#ef6915', '#fff9ef'], turtle: ['#e7e7e7', '#00afaf'], vex: ['#7a90a4', '#e8edf1'],
  villager: ['#563c33', '#bd8b72'], vindicator: ['#959b9b', '#275e61'], wandering_trader: ['#456296', '#eaa430'], warden: ['#0f4649', '#39d6e0'],
  witch: ['#340000', '#51a03e'], wither: ['#141414', '#4d72a0'], wither_skeleton: ['#141414', '#474d4d'], wolf: ['#d7d3d3', '#ceaf96'],
  zoglin: ['#c66e55', '#e6e6e6'], zombie: ['#00afaf', '#799c65'], zombie_horse: ['#315234', '#97c284'], zombie_villager: ['#563c33', '#799c65'],
  zombified_piglin: ['#ea9393', '#4c7129'], copper_golem: ['#c76b46', '#5fa38a'], happy_ghast: ['#f9f9f9', '#5fa8e8'], nautilus: ['#d8c9a8', '#7a4f2a'],
  npc: ['#b5b5b5', '#563c33'], agent: ['#3c3c3c', '#7fd4ff'],
};
// Bedrock entity ids that differ from the Java spawn egg names.
const EGG_ALIAS = { zombie_pigman: 'zombified_piglin', villager_v2: 'villager', zombie_villager_v2: 'zombie_villager', evocation_illager: 'evoker' };

function hashHue(s, shift = 0) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${(h + shift) % 360} 45% ${shift ? 30 : 58}%)`;
}

const ARMOR_RAMP = {
  leather: RAMPS.leather, chainmail: RAMPS.chainmail, iron: RAMPS.iron, golden: RAMPS.gold, gold: RAMPS.gold,
  diamond: RAMPS.diamond, netherite: RAMPS.netherite, copper: RAMPS.copper,
};
// Vanilla leather armour's default dye is a warm brown, lighter than raw leather.
const LEATHER_ARMOR = ['#3a1f0d', '#6a3a1a', '#8a5129', '#a0653a', '#b97c4c', '#d39a6a'];

export const sprites = {
  helmet: { pal: MAT, rows: helmet },
  chestplate: { pal: MAT, rows: chestplate },
  leggings: { pal: MAT, rows: leggings },
  boots: { pal: MAT, rows: boots },
  chainmail_helmet: { pal: MAT, rows: rings(helmet) },
  chainmail_chestplate: { pal: MAT, rows: rings(chestplate) },
  chainmail_leggings: { pal: MAT, rows: rings(leggings) },
  chainmail_boots: { pal: MAT, rows: rings(boots) },
  turtle_helmet: { pal: MAT, rows: turtleHelmet },
  horse_armor: { pal: MAT, rows: horseArmor },
  wolf_armor: { pal: { ...MAT, K: '#6e4a2a' }, rows: wolfArmor },
  elytra: { pal: MAT, rows: elytra },
  saddle: { pal: { ...MAT, j: '#a8a8a8', J: '#5f5f5f' }, rows: saddle },
  bucket: { pal: { ...IRON, f: '%3', F: '%4', g: '%2' }, rows: bucket },
  fish_bucket: { pal: { ...IRON, f: '#3f76e4', F: '#6b98ef', g: '#2c58b8', x: '@3', X: '@1', E: '#101010' }, rows: fishBucket },
  bundle: { pal: { ...MAT, t: '#e6d7b0', T: '#8f7a52' }, rows: bundle },
  harness: { pal: { ...MAT, G: '#3b2a1a', L: '#7a5232', b: '#7cc4e4', B: '#3f86b8', c: '#e8fbff', T: '#c6c6c6' }, rows: harness },
  nautilus_armor: { pal: { ...MAT, L: '#7a5232', G: '#3b2a1a' }, rows: nautilusArmor },
  minecart: { pal: IRON, rows: minecart },
  ...Object.fromEntries(Object.keys(CARGO).map(k => [`${k}_minecart`, { pal: { ...IRON, ...CARGO_PAL, l: '#b8945f', a: '#896727', s: '#684e1e', d: '#49361b', o: '#28190a' }, rows: cargoSprite(k) }])),
  boat: { pal: { ...MAT, ...WOOD }, rows: boat },
  chest_boat: { pal: { ...MAT, ...WOOD, ...SEC, k: '#c6c6c6' }, rows: chestBoat },
  raft: { pal: { ...MAT, ...WOOD }, rows: raft },
  chest_raft: { pal: { ...MAT, ...WOOD, ...SEC, k: '#c6c6c6' }, rows: chestRaft },
  armor_stand: { pal: { ...WOOD, ...IRON }, rows: armorStand },
  item_frame: { pal: FRAME_PAL, rows: itemFrame },
  painting: { pal: PAINTING_PAL, rows: painting },
  spawn_egg: { pal: { ...MAT, A: '%3' }, rows: spawnEgg },
};

const CHEST_WOOD = RAMPS.wood;

export const rules = [
  ...['helmet', 'chestplate', 'leggings', 'boots'].flatMap(piece => [
    [new RegExp(`^chainmail_${piece}$`), `chainmail_${piece}`, 'chainmail'],
    [new RegExp(`^(leather|iron|golden|diamond|netherite|copper)_${piece}$`), piece, (name, m) => ({ a: m[1] === 'leather' ? LEATHER_ARMOR : ARMOR_RAMP[m[1]] })],
  ]),
  [/^turtle_helmet$/, 'turtle_helmet', 'turtle'],
  [/^(leather|iron|golden|diamond|netherite|copper)_horse_armor$|^horsearmor(leather|iron|gold|diamond)$/, 'horse_armor', (name, m) => ({
    a: (m[1] || m[2]) === 'leather' ? LEATHER_ARMOR : ARMOR_RAMP[m[1] || m[2]],
  })],
  [/^wolf_armor$/, 'wolf_armor', '#ad716d'],
  [/^(?:(leather|iron|golden|diamond|netherite|copper)_)?nautilus_armor$/, 'nautilus_armor', (name, m) => ({ a: ARMOR_RAMP[m[1]] || RAMPS.iron })],
  [/^(?:(\w+)_)?harness$/, 'harness', (name, m) => ({ a: DYES[m[1]] || DYES.white })],
  [/^elytra$/, 'elytra', '#8e8aa8'],
  [/^saddle$/, 'saddle', 'leather'],
  [/^bucket$/, 'bucket', { b: '#3a3a3a' }],
  [/^water_bucket$/, 'bucket', { b: '#3f76e4' }],
  [/^lava_bucket$/, 'bucket', { b: '#e8761d' }],
  [/^milk_bucket$/, 'bucket', { b: '#ececec' }],
  [/^powder_snow_bucket$/, 'bucket', { b: '#dfeef2' }],
  [/^(cod|salmon|tropical_fish|pufferfish|axolotl|tadpole)_bucket$/, 'fish_bucket', (name, m) => ({
    a: { cod: '#c1a76a', salmon: '#a8443c', tropical_fish: '#f08a24', pufferfish: '#e8c45a', axolotl: '#f0a0c8', tadpole: '#6d533d' }[m[1]],
  })],
  [/^(?:\w+_)?bundle$/, 'bundle', name => ({ a: dyeOf(name) ? DYES[dyeOf(name)] : '#a96b3b' })],
  [/^minecart$/, 'minecart'],
  ...Object.keys(CARGO).map(k => [new RegExp(`^${k}_minecart$`), `${k}_minecart`]),
  [/^bamboo_raft$/, 'raft', { a: WOODS.bamboo.planks }],
  [/^bamboo_chest_raft$/, 'chest_raft', { a: WOODS.bamboo.planks, b: CHEST_WOOD }],
  [/^\w+_chest_boat$/, 'chest_boat', name => ({ a: WOODS[woodOf(name)]?.planks || WOODS.oak.planks, b: CHEST_WOOD })],
  [/^\w+_boat$/, 'boat', name => ({ a: WOODS[woodOf(name)]?.planks || WOODS.oak.planks })],
  [/^armor_stand$/, 'armor_stand'],
  [/^item_frame$/, 'item_frame', '#b0875a'],
  [/^glow_item_frame$/, 'item_frame', '#d9c06a'],
  [/^painting$/, 'painting'],
  [/^(\w+)_spawn_egg$/, 'spawn_egg', (name, m) => {
    const mob = EGG_ALIAS[m[1]] || m[1];
    const [a, b] = EGG[mob] || [hashHue(mob), hashHue(mob, 137)];
    return { a, b };
  }],
];
