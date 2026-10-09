// Colour helpers and material ramps shared by item sprites and block cubes.

export function rgb(color) {
  if (Array.isArray(color)) return color.slice(0, 3);
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1, 7), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  const m = color.match(/\d+(\.\d+)?/g)?.map(Number) || [128, 128, 128];
  if (color.startsWith('hsl')) {
    const [h, s, l] = [m[0], m[1] / 100, m[2] / 100];
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
  }
  return m.slice(0, 3);
}
export const mix = (c, t, p) => c.map((v, i) => Math.round(v + (t[i] - v) * p));
export const hex = c => `#${c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export const lum = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
export const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));

// Six tones per material, darkest (outline) to brightest (glint), referenced in sprite palettes
// as '@0'…'@5' (primary tint) and '%0'…'%5' (secondary tint).
export const RAMPS = {
  wood: ['#28190a', '#49361b', '#684e1e', '#896727', '#9f844d', '#b8945f'],
  stone: ['#2a2a2a', '#4a4a4a', '#626262', '#7f7f7f', '#9a9a9a', '#b5b5b5'],
  iron: ['#353535', '#5f5f5f', '#828282', '#c6c6c6', '#d8d8d8', '#ffffff'],
  gold: ['#502a07', '#b26411', '#dc9613', '#e9b115', '#fcee4b', '#ffffb5'],
  diamond: ['#0c3532', '#107066', '#1aaaa7', '#2bc7ac', '#4aedd9', '#d5fff6'],
  netherite: ['#181415', '#2a2526', '#3b3536', '#4c4446', '#605758', '#7e7475'],
  copper: ['#3d1a10', '#7d3a24', '#a4502f', '#c76b46', '#e7865f', '#fcb595'],
  chainmail: ['#232323', '#3f3f3f', '#5b5b5b', '#8a8a8a', '#a9a9a9', '#cfcfcf'],
  leather: ['#2d1709', '#4f2b13', '#6f3d1d', '#8f5329', '#a96b3b', '#c38a55'],
  turtle: ['#16300f', '#2a5a1d', '#3d7a2a', '#4f9a38', '#69b84c', '#9ad874'],
  emerald: ['#002f12', '#007a32', '#00a844', '#17dd62', '#41f384', '#d0ffe2'],
  lapis: ['#08174a', '#143382', '#1e48b0', '#2c62d4', '#5585ec', '#9ab8ff'],
  redstone: ['#350000', '#6b0000', '#a00000', '#d00b0b', '#ff2a2a', '#ff8a8a'],
  quartz: ['#5b4e44', '#a39486', '#c9bcb0', '#e3d9cf', '#f2ebe4', '#ffffff'],
  amethyst: ['#2a1145', '#53288a', '#7a43b8', '#9b62d6', '#c18cf0', '#efd4ff'],
  bone: ['#4f4a3a', '#8c8670', '#b4ad94', '#d6d0b6', '#ebe6d0', '#ffffff'],
  paper: ['#5e5040', '#a8977c', '#cdbf9f', '#e4dac0', '#f2ecd8', '#ffffff'],
};

/** Six-tone ramp from a ramp name or any CSS colour. */
export function ramp(spec) {
  if (!spec) return RAMPS.iron;
  if (Array.isArray(spec) && typeof spec[0] === 'string') return spec;
  if (typeof spec === 'string' && RAMPS[spec]) return RAMPS[spec];
  const base = rgb(spec);
  const l = lum(base);
  const black = [8, 6, 10], white = [255, 255, 255];
  return [
    hex(mix(base, black, l > 0.6 ? 0.78 : 0.72)),
    hex(mix(base, black, 0.48)),
    hex(mix(base, black, 0.24)),
    hex(base),
    hex(mix(base, white, l > 0.75 ? 0.4 : 0.28)),
    hex(mix(base, white, l > 0.75 ? 0.75 : 0.58)),
  ];
}

// Wood types: planks colour and bark colour (the stems of the nether woods for crimson/warped).
export const WOODS = {
  oak: { planks: '#a2824e', bark: '#6b5530' }, spruce: { planks: '#735531', bark: '#3b2912' }, birch: { planks: '#c4b37b', bark: '#d8d7d2' },
  jungle: { planks: '#a07350', bark: '#55441a' }, acacia: { planks: '#a95a32', bark: '#676157' }, dark_oak: { planks: '#43301a', bark: '#3e2e17' },
  mangrove: { planks: '#763631', bark: '#544233' }, cherry: { planks: '#e2b3ac', bark: '#3b1f29' }, pale_oak: { planks: '#e4d9d6', bark: '#5c5450' },
  bamboo: { planks: '#c3ad50', bark: '#7f8f2c' }, crimson: { planks: '#653046', bark: '#5c1a1e' }, warped: { planks: '#2b6863', bark: '#3a3b4e' },
  poplar: { planks: '#c9a66b', bark: '#8a7a68' },
};
export const WOOD_KEYS = Object.keys(WOODS).sort((a, b) => b.length - a.length);
/** Wood type in an id (`dark_oak_door` → dark_oak, `wooden_door` → oak), or undefined. */
export const woodOf = name => (/^wooden_/.test(name) ? 'oak' : WOOD_KEYS.find(w => name.startsWith(`${w}_`) || name.includes(`_${w}_`)));

// Dye colours (also used for wool, beds, banners, candles, bundles…).
export const DYES = {
  white: '#f0f0f0', orange: '#f9801d', magenta: '#c74ebd', light_blue: '#3ab3da', yellow: '#fed83d', lime: '#80c71f',
  pink: '#f38baa', gray: '#474f52', light_gray: '#9d9d97', silver: '#9d9d97', cyan: '#169c9c', purple: '#8932b8',
  blue: '#3c44aa', brown: '#835432', green: '#5e7c16', red: '#b02e26', black: '#1d1d21',
};
export const DYE_KEYS = Object.keys(DYES).sort((a, b) => b.length - a.length);
/** Dye colour word at the start of an id (`light_blue_wool` → light_blue), or undefined. */
export const dyeOf = name => DYE_KEYS.find(w => name.startsWith(`${w}_`) || name === w);
