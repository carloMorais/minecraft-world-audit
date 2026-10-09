// Item sprites: blocks whose inventory icon is a flat picture rather than a cube (doors, signs,
// torches, lanterns, candles, beds, banners, rails, heads…). See draw.js for the format.
import { DYES, RAMPS, dyeOf, woodOf, WOODS, WOOD_KEYS, rgb, mix, hex } from '../color.js';

// Shared palettes ------------------------------------------------------------------------------
// Tinted by the rule's primary colour: outline, dark, shade, base, light, highlight.
const TINT = { o: '@0', 1: '@1', 2: '@2', 3: '@3', 4: '@4', 5: '@5' };
const STICK = { h: '#9f844d', H: '#684e1e', j: '#493615' };
const STONE = { o: '#2b2b2b', 1: '#4a4a4a', 2: '#626262', 3: '#7f7f7f', 4: '#9a9a9a', 5: '#b5b5b5' };
const SMOOTH_STONE = { o: '#303030', 1: '#5a5a5a', 2: '#787878', 3: '#9a9a9a', 4: '#b0b0b0', 5: '#c8c8c8' };

const COPPER_STAGE = { exposed: '#a1785f', weathered: '#6d9a6c', oxidized: '#4fa184' };
const copperTint = stage => COPPER_STAGE[stage] || RAMPS.copper;
const planks = name => WOODS[woodOf(name)]?.planks || WOODS.oak.planks;

/** Expand an 8×8 head face to 12×12 (pixel widths 1,2,1,2,2,1,2,1) inside a 1px outline. */
function head(face, pal) {
  const span = [1, 2, 1, 2, 2, 1, 2, 1];
  const grow = row => [...row].flatMap((ch, i) => Array(span[i]).fill(ch)).join('');
  const body = face.flatMap((row, i) => Array(span[i]).fill(`.o${grow(row)}o.`));
  const edge = '.oooooooooooooo.';
  return { pal: { o: '#101010', ...pal }, rows: ['................', edge, ...body, edge, '................'] };
}

/** Amethyst crystals: each spike is [left column, top row] of a 4-wide spike standing on row 14. */
function crystals(spikes) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const shades = ['54', '43', '43', '32', '32', '21'];
  for (const [x, top] of spikes) {
    g[top][x + 1] = g[top][x + 2] = 'o';
    for (let y = top + 1; y < 14; y++) {
      const s = shades[Math.min(shades.length - 1, Math.floor((y - top - 1) * shades.length / (14 - top - 1)))];
      g[y][x] = 'o'; g[y][x + 1] = s[0]; g[y][x + 2] = s[1]; g[y][x + 3] = 'o';
    }
  }
  const xs = spikes.flatMap(([x]) => [x, x + 3]);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++) g[14][x] = 'o';
  return {
    pal: { o: '#2e1550', 1: '#5c3596', 2: '#7f52c0', 3: '#a978dc', 4: '#cfa4f2', 5: '#f6dcff' },
    rows: g.map(r => r.join('')),
  };
}

/** Rails: two rails over wooden ties; `mid` draws the middle strip (powered/activator/detector). */
function rail(pal, mid = () => null) {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    const tie = y % 4 === 1 ? 't' : y % 4 === 2 ? 'T' : null;
    let row = '';
    for (let x = 0; x < 16; x++) {
      let ch = tie && x >= 2 && x <= 13 ? tie : '.';
      if (x === 3 || x === 11) ch = 'r';
      if (x === 4 || x === 12) ch = 'R';
      if (x >= 6 && x <= 9) ch = mid(x, y, ch) || ch;
      row += ch;
    }
    rows.push(row);
  }
  return { pal: { t: '#8a6a3a', T: '#5a4220', r: '#b0b0b0', R: '#6a6a6a', ...pal }, rows };
}

/** Glass pane: a frame with two diagonal glints, fill translucent. */
function pane(color) {
  const c = color && rgb(color);
  const pal = c
    ? { e: `${hex(mix(c, [255, 255, 255], 0.35))}ee`, E: `${hex(mix(c, [0, 0, 0], 0.15))}ee`, f: `${hex(c)}80`, s: `${hex(mix(c, [255, 255, 255], 0.7))}dd` }
    : { e: '#e4f4f8ee', E: '#a9c9d4ee', f: '#cfe8f02e', s: '#ffffffcc' };
  const glint = new Set(['3,2', '2,3', '4,2', '2,4', '5,2', '12,10', '11,11', '10,12', '12,11', '11,12']);
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) {
      if (y === 0 || x === 0) row += 'e';
      else if (y === 15 || x === 15) row += 'E';
      else row += glint.has(`${x},${y}`) ? 's' : 'f';
    }
    rows.push(row);
  }
  return { pal, rows };
}

/** Generic round sprite from a distance function: (x, y, d) => letter or '.'. */
function round(pal, pick) {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) row += pick(x, y, Math.hypot(x - 7.5, y - 7.5));
    rows.push(row);
  }
  return { pal, rows };
}

const EGG = [
  '................',
  '......oooo......',
  '.....oKkkko.....',
  '....oKgkkkko....',
  '....oKkkpkko....',
  '...oKkkkkkkko...',
  '...okkpkkkkko...',
  '..oKkkkkkkpkko..',
  '..okkkkkkkkkko..',
  '..okpkkkkkkkko..',
  '..okkkkkpkkkno..',
  '..okkkkkkkknno..',
  '...okkpkkknno...',
  '....oknnnnno....',
  '.....oooooo.....',
  '................',
];

const TORCH = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......gg.......',
  '......gWYg......',
  '......gYFg......',
  '.......jH.......',
  '.......hH.......',
  '.......hH.......',
  '.......hH.......',
  '.......hH.......',
  '.......hH.......',
  '.......hH.......',
  '.......hH.......',
];
const torch = flame => ({ pal: { ...STICK, ...flame }, rows: TORCH });

const CAMPFIRE = [
  '................',
  '................',
  '.......Y........',
  '......YF..Y.....',
  '.....YWF.YF.....',
  '....FYWYFYWF....',
  '....FYWWYWYF....',
  '...FFYWWWWYFF...',
  '...FYYWWWWYYF...',
  '....FFYYYYFF....',
  '..oooooooooooo..',
  '..oeBbBbBbBbBo..',
  '.oooooooooooooo.',
  '.oBbBbBbBbBbBeo.',
  '.oooooooooooooo.',
  '................',
];
const LOGS = { o: '#2a1c0c', B: '#4f3a1e', b: '#6b5530', e: '#b8945f' };

const FACES = {
  skeleton_skull: [['llLlllll', 'llllllLl', 'llllllll', 'lDDllDDl', 'llllllll', 'lllDDlll', 'lDtDtDDl', 'llllllll'],
    { o: '#3a3a3a', l: '#c9c9c9', L: '#a8a8a8', D: '#2e2e2e', t: '#e6e6e6' }],
  wither_skeleton_skull: [['llLlllll', 'llllllLl', 'llllllll', 'lDDllDDl', 'llllllll', 'lllDDlll', 'lDtDtDDl', 'llllllll'],
    { o: '#000000', l: '#383838', L: '#2a2a2a', D: '#0a0a0a', t: '#585858' }],
  zombie_head: [['hhhhhhhh', 'GhgGghGg', 'gggggggg', 'gEEggEEg', 'gggggggg', 'gggGGggg', 'ggmmmmgg', 'gggggggg'],
    { o: '#1d3316', h: '#2f5427', g: '#5d8a46', G: '#4a7338', E: '#16240f', m: '#2a4020' }],
  creeper_head: [['cCcLcCkc', 'CcckcccL', 'cXXccXXC', 'CXXckXXc', 'cccXXccc', 'ccXXXXcC', 'cCXXXXcc', 'ckXccXck'],
    { o: '#1e4a18', c: '#5ec44a', C: '#4aa83a', k: '#3a8a2c', L: '#86dc6e', X: '#0d0d0d' }],
  player_head: [['hhhhhhhh', 'hhHhhhHh', 'hssssssh', 'sssssSss', 'swbssbws', 'sssnnsss', 'ssmmmmss', 'ssssssss'],
    { o: '#2a1a10', h: '#2b1e0d', H: '#3d2b14', s: '#b4846d', S: '#a07258', w: '#ffffff', b: '#523d89', n: '#8a5a44', m: '#6a4030' }],
  piglin_head: [['PpPpPPpP', 'pppppppp', 'pppppppp', 'peEppEep', 'ppNNNNpp', 'ppdNNdpp', 'ptppppTp', 'pppppppp'],
    { o: '#5a2a28', p: '#e8a19a', P: '#c97f78', N: '#f2bdb0', d: '#7a3a3a', e: '#ffffff', E: '#2a1a10', t: '#f0f0e0', T: '#f0f0e0' }],
  dragon_head: [['KKkKKkKK', 'kgKkKgKk', 'kKKkkKKk', 'kpPkkPpk', 'kKKkkKKk', 'kKkkkkKk', 'knkKKknk', 'kkKkkKkk'],
    { o: '#000000', k: '#1c1c1c', K: '#2c2c30', g: '#45454c', p: '#cc55ff', P: '#f0b8ff', n: '#050505' }],
};

export const sprites = {
  // Doors: windows over planks (oak & co), vertical boards (spruce), lattice (birch, jungle,
  // nether woods), and metal (iron, copper).
  door: {
    pal: { ...TINT, k: '#262626' },
    rows: [
      '...oooooooooo...',
      '...o44444443o...',
      '...o41134113o...',
      '...o41134113o...',
      '...o41134113o...',
      '...o42234223o...',
      '...o44444443o...',
      '...o43333332o...',
      '...o433333k2o...',
      '...o43333332o...',
      '...o22222222o...',
      '...o43333332o...',
      '...o43333332o...',
      '...o22222222o...',
      '...o43333332o...',
      '...oooooooooo...',
    ],
  },
  door_boards: {
    pal: { ...TINT, k: '#262626' },
    rows: [
      '...oooooooooo...',
      '...o44444443o...',
      '...o43143143o...',
      '...o43143143o...',
      '...o44444443o...',
      '...o22222222o...',
      '...o43143143o...',
      '...o43143143o...',
      '...o431431k3o...',
      '...o43143143o...',
      '...o44444443o...',
      '...o22222222o...',
      '...o43143143o...',
      '...o43143143o...',
      '...o32132132o...',
      '...oooooooooo...',
    ],
  },
  door_lattice: {
    pal: { ...TINT, k: '#262626' },
    rows: [
      '...oooooooooo...',
      '...o44444443o...',
      '...o41414143o...',
      '...o43434343o...',
      '...o41414143o...',
      '...o43434343o...',
      '...o41414143o...',
      '...o44444443o...',
      '...o433333k2o...',
      '...o43333332o...',
      '...o22222222o...',
      '...o43333332o...',
      '...o43333332o...',
      '...o22222222o...',
      '...o43333332o...',
      '...oooooooooo...',
    ],
  },
  door_metal: {
    pal: { ...TINT, k: '#1a1a1a' },
    rows: [
      '...oooooooooo...',
      '...o55555554o...',
      '...o51154114o...',
      '...o51154114o...',
      '...o51154114o...',
      '...o53354334o...',
      '...o44444443o...',
      '...o4oooooo3o...',
      '...o4o4333k3o...',
      '...o4o3332o3o...',
      '...o4o3332o3o...',
      '...o4o3332o3o...',
      '...o4o2221o3o...',
      '...o4oooooo3o...',
      '...o33333332o...',
      '...oooooooooo...',
    ],
  },

  sign: {
    pal: { ...TINT, h: '@2', H: '@1' },
    rows: [
      '................',
      '.oooooooooooooo.',
      '.o544444444443o.',
      '.o433332333332o.',
      '.o423333333232o.',
      '.o433333233332o.',
      '.o433233333332o.',
      '.o433333332332o.',
      '.o322222222221o.',
      '.oooooooooooooo.',
      '......ohHo......',
      '......ohHo......',
      '......ohHo......',
      '......ohHo......',
      '......ohHo......',
      '......oooo......',
    ],
  },
  hanging_sign: {
    pal: { ...TINT, c: '#6a7080', C: '#3a3e48' },
    rows: [
      '................',
      '...C........C...',
      '...c........c...',
      '...C........C...',
      '...c........c...',
      '.oooooooooooooo.',
      '.o544444444443o.',
      '.o433332333332o.',
      '.o423333333232o.',
      '.o433333233332o.',
      '.o433233333332o.',
      '.o433333332332o.',
      '.o322222222221o.',
      '.oooooooooooooo.',
      '................',
      '................',
    ],
  },

  torch: torch({ g: '#ffd24a55', W: '#ffffd8', Y: '#ffd84a', F: '#e88a1e' }),
  soul_torch: torch({ g: '#7ff3ff55', W: '#eaffff', Y: '#6fe6f2', F: '#2aa5b8' }),
  redstone_torch: torch({ g: '#ff3a3a55', W: '#ffb0a0', Y: '#ff2a1a', F: '#a80a0a' }),
  copper_torch: torch({ g: '#8affb055', W: '#eaffd8', Y: '#9ee86a', F: '#3aa84a' }),

  // Lantern: frame tinted by the primary colour, flame by the secondary.
  lantern: {
    pal: { ...TINT, W: '%5', y: '%4', Y: '%3', F: '%2' },
    rows: [
      '................',
      '................',
      '......oooo......',
      '......o..o......',
      '.....o1221o.....',
      '....o123321o....',
      '....o2yWWy2o....',
      '....o2WWWY2o....',
      '....o2WWWY2o....',
      '....o2YWYF2o....',
      '....o2YYFF2o....',
      '....o2FYFF2o....',
      '....o123321o....',
      '....oooooooo....',
      '................',
      '................',
    ],
  },

  candle: {
    pal: { ...TINT, k: '#2a1c10', f: '#ffd84a' },
    rows: [
      '................',
      '................',
      '................',
      '.......f........',
      '.......k........',
      '.....oooooo.....',
      '.....o5443o.....',
      '.....o4432o.....',
      '.....o4332o.....',
      '.....o4332o.....',
      '.....o4332o.....',
      '.....o4332o.....',
      '.....o4332o.....',
      '.....o3221o.....',
      '.....oooooo.....',
      '................',
    ],
  },

  bed: {
    pal: { ...TINT, w: '#ffffff', W: '#e6e6e6', g: '#c8c8c8', G: '#9a9a9a', h: '#9f844d', H: '#684e1e', x: '#2b1d0e' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.oooooooooooooo.',
      '.owwwW44444443o.',
      '.owWWg43333332o.',
      '.oWWWg33333332o.',
      '.ogggG22222221o.',
      '.xxxxxxxxxxxxxx.',
      '.xhhhhhhhhhhhhx.',
      '.xHHHHHHHHHHHHx.',
      '.xHx........xHx.',
      '.xxx........xxx.',
      '................',
      '................',
    ],
  },

  banner: {
    pal: { ...TINT, h: '#9f844d', H: '#684e1e', x: '#2b1d0e' },
    rows: [
      '................',
      '.xxxxxxxxxxxxxx.',
      '.xhhhhhhhhhhhhx.',
      '.xHHHHHHHHHHHHx.',
      '.xxooooooooooxx.',
      '...o54444443o...',
      '...o43333332o...',
      '...o43333332o...',
      '...o43322332o...',
      '...o43333332o...',
      '...o43333332o...',
      '...o43322332o...',
      '...o32222221o...',
      '...oooo..oooo...',
      '.......xx.......',
      '.......xx.......',
    ],
  },

  rail: rail({}),
  powered_rail: rail({ r: '#fcee4b', R: '#b26411', t: '#6b5530', T: '#4a3518', c: '#5a0e0e', C: '#3a0606' },
    x => (x === 7 ? 'c' : x === 8 ? 'C' : null)),
  detector_rail: rail({ p: '#8a8a8a', P: '#5a5a5a', d: '#a01010' },
    (x, y) => (y >= 5 && y <= 10 ? ((y === 7 || y === 8) && (x === 7 || x === 8) ? 'd' : y === 10 || x === 9 ? 'P' : 'p') : null)),
  activator_rail: rail({ t: '#6b5530', T: '#4a3518', c: '#a01010', C: '#5a0e0e' },
    x => (x === 7 ? 'c' : x === 8 ? 'C' : null)),

  ladder: {
    pal: { s: '#9f844d', S: '#5a4219', r: '#b8945f', R: '#6b5530' },
    rows: [
      '..sS........sS..',
      '..sSrrrrrrrrsS..',
      '..sSRRRRRRRRsS..',
      '..sS........sS..',
      '..sS........sS..',
      '..sSrrrrrrrrsS..',
      '..sSRRRRRRRRsS..',
      '..sS........sS..',
      '..sS........sS..',
      '..sSrrrrrrrrsS..',
      '..sSRRRRRRRRsS..',
      '..sS........sS..',
      '..sS........sS..',
      '..sSrrrrrrrrsS..',
      '..sSRRRRRRRRsS..',
      '..sS........sS..',
    ],
  },

  lever: {
    pal: { ...STONE, ...STICK },
    rows: [
      '................',
      '................',
      '................',
      '..........jj....',
      '..........hH....',
      '.........hH.....',
      '.........hH.....',
      '........hH......',
      '........hH......',
      '.......hH.......',
      '....oooooooo....',
      '....o544334o....',
      '....o433223o....',
      '....o322112o....',
      '....oooooooo....',
      '................',
    ],
  },

  tripwire_hook: {
    pal: { o: '#2a2a2a', i: '#c6c6c6', I: '#7a7a7a', ...STICK, x: '#2b1d0e' },
    rows: [
      '................',
      '......oooo......',
      '.....oiiiIo.....',
      '....oio..oIo....',
      '....oio..oIo....',
      '.....oiIIIo.....',
      '......oiIo......',
      '......xhHx......',
      '......xhHx......',
      '......xhHx......',
      '......xhHx......',
      '......xhHx......',
      '......xhHx......',
      '......xhHx......',
      '......xxxx......',
      '................',
    ],
  },

  chain: {
    pal: { l: '@4', L: '@3', d: '@1', h: '@5' },
    rows: [
      '......hLLd......',
      '......l..d......',
      '......l..d......',
      '......dLLd......',
      '.......ld.......',
      '.......ld.......',
      '......hLLd......',
      '......l..d......',
      '......l..d......',
      '......dLLd......',
      '.......ld.......',
      '.......ld.......',
      '......hLLd......',
      '......l..d......',
      '......l..d......',
      '......dLLd......',
    ],
  },

  bars: {
    pal: { l: '@4', L: '@3', D: '@1', h: '@5' },
    rows: [
      '.lD..lD..lD..lD.',
      '.hLLLLLLLLLLLLL.',
      '.DDDDDDDDDDDDDD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.lD..lD..lD..lD.',
      '.hLLLLLLLLLLLLL.',
      '.DDDDDDDDDDDDDD.',
      '.lD..lD..lD..lD.',
    ],
  },

  glass_pane: pane(null),
  ...Object.fromEntries(Object.entries(DYES).map(([d, c]) => [`stained_glass_pane_${d}`, pane(c)])),

  flower_pot: {
    pal: { o: '#3e1f12', 4: '#c7754d', 3: '#a65a3a', 2: '#8a4a30', 1: '#6e3a25', k: '#2e1a0e' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...oooooooooo...',
      '...o4kkkkkk3o...',
      '...o44333332o...',
      '...oooooooooo...',
      '....o433332o....',
      '....o433332o....',
      '....o322221o....',
      '....oooooooo....',
      '................',
    ],
  },

  decorated_pot: {
    pal: { o: '#3a1a10', 5: '#c98060', 4: '#ad6343', 3: '#965236', 2: '#7d432b', 1: '#5f3220', p: '#4a2214' },
    rows: [
      '................',
      '.....oooooo.....',
      '.....o5443o.....',
      '......o32o......',
      '....oo4332oo....',
      '...o54444333o...',
      '..o5444443332o..',
      '..o4433333322o..',
      '..o43pp33pp32o..',
      '..o4333333322o..',
      '..o3333333221o..',
      '..o3222222211o..',
      '...o32222211o...',
      '....oo2211oo....',
      '......oooo......',
      '................',
    ],
  },

  cauldron: {
    pal: { o: '#151517', 5: '#7c7c82', 4: '#5e5e64', 3: '#48484d', 2: '#38383c', 1: '#2a2a2d', k: '#0c0c0e' },
    rows: [
      '................',
      '................',
      '.oooooooooooooo.',
      '.o5kkkkkkkkkk2o.',
      '.o544444444432o.',
      '..o4333333332o..',
      '..o4333333332o..',
      '..o4o3333333o2o.',
      '..o4333333332o..',
      '..o3333333322o..',
      '..o3222222221o..',
      '..o2222222211o..',
      '..oooooooooooo..',
      '..o2o......o2o..',
      '..ooo......ooo..',
      '................',
    ],
  },

  hopper: {
    pal: { o: '#18181a', 5: '#7a7a7e', 4: '#5c5c60', 3: '#46464a', 2: '#363639', k: '#0e0e10' },
    rows: [
      '................',
      '.oooooooooooooo.',
      '.o544444444443o.',
      '.o4kkkkkkkkkk2o.',
      '.o433333333332o.',
      '.oooooooooooooo.',
      '..o4333333332o..',
      '...o43333332o...',
      '....o433332o....',
      '.....o4332o.....',
      '.....oooooo.....',
      '......o42o......',
      '......o32o......',
      '......oooo......',
      '................',
      '................',
    ],
  },

  brewing_stand: {
    pal: { y: '#fff3a8', Y: '#e0a020', r: '#f0c040', R: '#a86a10', n: '#d6eef5', b: '#bcdce8', g: '#8ec0d4', ...STONE },
    rows: [
      '................',
      '.......yY.......',
      '.......rR.......',
      '.......rR.......',
      '..rrrrrrRRRRRR..',
      '...n...rR...n...',
      '..bgb..rR..bgb..',
      '..bgb..rR..bgb..',
      '..bbb..rR..bbb..',
      '.......rR.......',
      '.......rR.......',
      '.......rR.......',
      '..oooooooooooo..',
      '..o5444334332o..',
      '..oooooooooooo..',
      '................',
    ],
  },

  campfire: { pal: { ...LOGS, W: '#fff6b0', Y: '#ffd02a', F: '#e8701a' }, rows: CAMPFIRE },
  soul_campfire: { pal: { ...LOGS, W: '#eaffff', Y: '#5fe3f0', F: '#1f8fa8' }, rows: CAMPFIRE },

  bell: {
    pal: { ...TINT, k: '#2a2a2a' },
    rows: [
      '................',
      '......oooo......',
      '......o54o......',
      '.....o5443o.....',
      '.....o5432o.....',
      '....o544332o....',
      '....o544332o....',
      '....o443321o....',
      '....o443321o....',
      '...o54433221o...',
      '...o44333221o...',
      '..o5444333221o..',
      '..oooooooooooo..',
      '.......kk.......',
      '................',
      '................',
    ],
  },

  repeater: {
    pal: { ...SMOOTH_STONE, ...STICK, r: '#ff3a2a', R: '#a00c0c', g: '#ff3a3a50' },
    rows: [
      '................',
      '................',
      '................',
      '..ggg....ggg....',
      '..grRg...grRg...',
      '..gRrg...gRrg...',
      '...hH.....hH....',
      '...hH.....hH....',
      '...hH.....hH....',
      '.oooooooooooooo.',
      '.o544444444443o.',
      '.o433333333332o.',
      '.o322222222221o.',
      '.oooooooooooooo.',
      '................',
      '................',
    ],
  },
  comparator: {
    pal: { ...SMOOTH_STONE, ...STICK, r: '#ff3a2a', R: '#a00c0c', d: '#6a1a1a', D: '#3a0a0a', g: '#ff3a3a50' },
    rows: [
      '................',
      '................',
      '................',
      '.gggg......gggg.',
      '.grRg......grRg.',
      '.gRrg......gRrg.',
      '..hH...dD...hH..',
      '..hH...hH...hH..',
      '..hH...hH...hH..',
      '.oooooooooooooo.',
      '.o544444444443o.',
      '.o433333333332o.',
      '.o322222222221o.',
      '.oooooooooooooo.',
      '................',
      '................',
    ],
  },

  lightning_rod: {
    pal: TINT,
    rows: [
      '................',
      '...........ooo..',
      '..........o543o.',
      '..........o432o.',
      '..........o321o.',
      '.........o42ooo.',
      '........o42o....',
      '.......o42o.....',
      '......o42o......',
      '.....o42o.......',
      '....o42o........',
      '...o42o.........',
      '..o42o..........',
      '.o42o...........',
      '.o21o...........',
      '.ooo............',
    ],
  },

  pointed_dripstone: {
    pal: { o: '#3d2b22', 5: '#c9a693', 4: '#b38f7a', 3: '#9a7766', 2: '#7c5e4d', 1: '#5e4538' },
    rows: [
      '................',
      '.......oo.......',
      '......o43o......',
      '......o43o......',
      '.....o5432o.....',
      '.....o4432o.....',
      '.....o4332o.....',
      '....o544321o....',
      '....o443321o....',
      '....o433221o....',
      '...o54433221o...',
      '...o44332221o...',
      '...o43322211o...',
      '..o5443322211o..',
      '..oooooooooooo..',
      '................',
    ],
  },

  end_rod: {
    pal: { q: '#8c7f99', w: '#ffffff', W: '#ddd4e6', o: '#5c4a66', 5: '#efe4f5', 4: '#cdbad6', 3: '#a993b3' },
    rows: [
      '................',
      '.......qq.......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '......qwWq......',
      '....oooooooo....',
      '....o554443o....',
      '....o433333o....',
      '....oooooooo....',
      '................',
    ],
  },

  ...Object.fromEntries(Object.entries(FACES).map(([k, [face, pal]]) => [k, head(face, pal)])),

  dragon_egg: { pal: { o: '#000000', k: '#16101e', K: '#2c2140', g: '#45335f', p: '#8a45bb', n: '#0a0710' }, rows: EGG },
  turtle_egg: { pal: { o: '#5a5540', k: '#e7e1c3', K: '#f6f2de', g: '#ffffff', p: '#5ba84a', n: '#c7c09e' }, rows: EGG },
  sniffer_egg: { pal: { o: '#3a1410', k: '#a8473a', K: '#c25a46', g: '#de8468', p: '#2fb59a', n: '#7a3027' }, rows: EGG },

  frog_spawn: round({ w: '#cfe0dcb0', W: '#f2fffccc', d: '#1a1a1a' }, (x, y) => {
    for (const [cx, cy] of [[4.5, 4.5], [10.5, 5], [6, 10.5], [11.5, 11]]) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 0.8) return 'd';
      if (d < 2.6) return x < cx && y < cy && d > 1.4 ? 'W' : 'w';
    }
    return '.';
  }),

  small_amethyst_bud: crystals([[4, 9], [8, 10]]),
  medium_amethyst_bud: crystals([[2, 8], [6, 6], [10, 8]]),
  large_amethyst_bud: crystals([[1, 6], [6, 3], [11, 5]]),
  amethyst_cluster: crystals([[1, 6], [6, 1], [11, 4], [4, 9], [9, 8]]),

  sculk_vein: {
    pal: { d: '#062027', c: '#0d4650', C: '#1a7078', l: '#36c6c4' },
    rows: [
      '................',
      '.....c......c...',
      '....cd.....cd...',
      '...cdl....cdd...',
      '..cd.dc..cd.....',
      '..d...dccd......',
      '.......dCd......',
      '......cCCdc.....',
      '.....cdClddc....',
      '....cd...d.dc...',
      '...cd....dc..d..',
      '..cd......d.....',
      '..d.......dc....',
      '...........d....',
      '................',
      '................',
    ],
  },

  conduit: {
    pal: { o: '#2e1f10', 5: '#d8b98a', 4: '#b8955f', 3: '#9a7646', 2: '#7a5a34', 1: '#5a4024', k: '#1a120a',
      E: '#1f5aa8', e: '#4a9ae6', p: '#0a1a30' },
    rows: [
      '................',
      '................',
      '.....oooooo.....',
      '...oo544443oo...',
      '..o5443333332o..',
      '..o43kkkkkk32o..',
      '.o54kkEEEEkk32o.',
      '.o43kEeeeeEk21o.',
      '.o43kEeppeEk21o.',
      '.o43kEeeeeEk21o.',
      '.o32kkEEEEkk21o.',
      '..o32kkkkkk21o..',
      '..o3222222221o..',
      '...oo222211oo...',
      '.....oooooo.....',
      '................',
    ],
  },

  barrier: round({ r: '#e82020', R: '#a00c0c' }, (x, y, d) => {
    if (d >= 5.2 && d <= 7.2) return d > 6.4 ? 'R' : 'r';
    if (d < 5.2 && Math.abs(x - y) <= 1) return Math.abs(x - y) === 1 ? 'R' : 'r';
    return '.';
  }),
};

const COPPERED = '(?:waxed_)?(?:(exposed|weathered|oxidized)_)?';
const DOOR_STYLE = { spruce: 'door_boards', birch: 'door_lattice', jungle: 'door_lattice', acacia: 'door_lattice', crimson: 'door_lattice', warped: 'door_lattice' };
const LANTERN_FRAME = '#4b4f5a';
const WOOD = `(?:${WOOD_KEYS.join('|')}|darkoak)`;

export const rules = [
  [new RegExp(`^${COPPERED}copper_door$`), 'door_metal', (n, m) => copperTint(m[1])],
  [/^iron_door$/, 'door_metal', 'iron'],
  ...Object.entries(DOOR_STYLE).map(([w, s]) => [new RegExp(`^${w}_door$`), s, WOODS[w].planks]),
  [new RegExp(`^${WOOD}_door$`), 'door', n => planks(n)],
  [new RegExp(`^${WOOD}_hanging_sign$`), 'hanging_sign', n => planks(n)],
  [new RegExp(`^${WOOD}_(?:standing_|wall_)?sign$`), 'sign', n => planks(n.replace(/^darkoak/, 'dark_oak'))],

  [/^torch$/, 'torch'], [/^soul_torch$/, 'soul_torch'], [/^(?:unlit_)?redstone_torch$/, 'redstone_torch'], [/^copper_torch$/, 'copper_torch'],
  [/^lantern$/, 'lantern', { a: LANTERN_FRAME, b: '#f5b13a' }],
  [/^soul_lantern$/, 'lantern', { a: LANTERN_FRAME, b: '#4fd6e0' }],
  [new RegExp(`^${COPPERED}copper_lantern$`), 'lantern', (n, m) => ({ a: copperTint(m[1]), b: '#86e05a' })],

  [/^(?:(\w+)_)?candle$/, 'candle', (n, m) => DYES[m[1]] || '#e8d9a8'],
  [/^straw_bed$/, 'bed', '#cdb058'],
  [/^(?:(\w+)_)?bed$/, 'bed', n => DYES[dyeOf(n)] || DYES.red],
  [/^(?:(\w+)_)?banner$/, 'banner', n => DYES[dyeOf(n)] || DYES.white],

  [/^rail$/, 'rail'], [/^powered_rail$/, 'powered_rail'], [/^detector_rail$/, 'detector_rail'], [/^activator_rail$/, 'activator_rail'],
  [/^ladder$/, 'ladder'], [/^lever$/, 'lever'], [/^tripwire_hook$/, 'tripwire_hook'],
  [/^chain$/, 'chain', '#4f5566'],
  [new RegExp(`^${COPPERED}copper_chain$`), 'chain', (n, m) => copperTint(m[1])],
  [/^iron_bars$/, 'bars', '#73777f'],
  [new RegExp(`^${COPPERED}copper_bars$`), 'bars', (n, m) => copperTint(m[1])],
  [/^glass_pane$/, 'glass_pane'],
  ...Object.keys(DYES).map(d => [new RegExp(`^${d}_stained_glass_pane$`), `stained_glass_pane_${d}`]),

  [/^flower_pot$/, 'flower_pot'], [/^decorated_pot$/, 'decorated_pot'], [/^cauldron$/, 'cauldron'], [/^hopper$/, 'hopper'],
  [/^brewing_stand$/, 'brewing_stand'], [/^campfire$/, 'campfire'], [/^soul_campfire$/, 'soul_campfire'], [/^bell$/, 'bell', 'gold'],
  [/^repeater$/, 'repeater'], [/^comparator$/, 'comparator'],
  [new RegExp(`^${COPPERED}lightning_rod$`), 'lightning_rod', (n, m) => copperTint(m[1])],
  [/^pointed_dripstone$/, 'pointed_dripstone'], [/^end_rod$/, 'end_rod'],
  ...Object.keys(FACES).map(k => [new RegExp(`^${k}$`), k]),
  [/^dragon_egg$/, 'dragon_egg'], [/^turtle_egg$/, 'turtle_egg'], [/^sniffer_egg$/, 'sniffer_egg'], [/^frog_?spawn$/, 'frog_spawn'],
  [/^small_amethyst_bud$/, 'small_amethyst_bud'], [/^medium_amethyst_bud$/, 'medium_amethyst_bud'],
  [/^large_amethyst_bud$/, 'large_amethyst_bud'], [/^amethyst_cluster$/, 'amethyst_cluster'],
  [/^sculk_vein$/, 'sculk_vein'], [/^conduit$/, 'conduit'], [/^barrier$/, 'barrier'],
];
