// Game-domain labels and heuristics shared by the map views and the pages (villagers, mobs, biomes).
import { BIOME_LABEL } from './collections.js';

// ---------- villagers ----------

export const PROFESSION = {
  farmer: 'Fazendeiro', fisherman: 'Pescador', shepherd: 'Pastor', fletcher: 'Flecheiro', librarian: 'Bibliotecário', cartographer: 'Cartógrafo',
  cleric: 'Clérigo', armorer: 'Armeiro', weaponsmith: 'Armeiro de armas', toolsmith: 'Ferramenteiro', butcher: 'Açougueiro',
  leatherworker: 'Coureiro', stone_mason: 'Pedreiro', mason: 'Pedreiro', nitwit: 'Bobo', unskilled: 'Desempregado', none: 'Desempregado',
};
export const UNEMPLOYED = new Set(['unskilled', 'none']);
export const profKey = v => String(v.profession ?? 'none').toLowerCase();
export const professionLabel = p => PROFESSION[String(p).toLowerCase()] || p;
export const TRADE_TIER = ['Novato', 'Aprendiz', 'Artesão', 'Especialista', 'Mestre'];
export const emeraldsIn = t => [t.buyA, t.buyB].reduce((s, it) => s + (it?.item === 'minecraft:emerald' ? it.count : 0), 0);

/** Clusters of at least `min` villagers inside a 3×3-chunk window (trading halls, breeders, iron farms). */
export function villagerCrowds(villagers, min = 6) {
  const byChunk = new Map();
  for (const v of villagers) {
    if (!v.position) continue;
    const k = `${v.dimension}:${Math.floor(v.position[0] / 16)}:${Math.floor(v.position[2] / 16)}`;
    byChunk.set(k, [...(byChunk.get(k) || []), v]);
  }
  const used = new Set(), out = [];
  const ranked = [...byChunk.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [k] of ranked) {
    if (used.has(k)) continue;
    const [dim, cx, cz] = k.split(':');
    const members = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const kk = `${dim}:${+cx + dx}:${+cz + dz}`;
      if (used.has(kk)) continue;
      members.push(...(byChunk.get(kk) || []));
    }
    if (members.length < min) continue;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) used.add(`${dim}:${+cx + dx}:${+cz + dz}`);
    const profs = {};
    for (const v of members) profs[profKey(v)] = (profs[profKey(v)] || 0) + 1;
    const avg = i => members.reduce((s, v) => s + v.position[i], 0) / members.length;
    out.push({ dimension: dim, count: members.length, center: [avg(0), avg(1), avg(2)], profs: Object.entries(profs).sort((a, b) => b[1] - a[1]) });
  }
  return out;
}

/** Village registry dimension ("Overworld", "TheEnd") → map dimension id. */
export const villageDim = v => (v.dimension || 'overworld').toLowerCase().replace('theend', 'the_end');

/** Highest level each enchantment reaches in survival (flags maxed-out books). */
export const ENCHANT_MAX = {
  protection: 4, fire_protection: 4, feather_falling: 4, blast_protection: 4, projectile_protection: 4, thorns: 3, respiration: 3,
  depth_strider: 3, aqua_affinity: 1, sharpness: 5, smite: 5, bane_of_arthropods: 5, knockback: 2, fire_aspect: 2, looting: 3,
  efficiency: 5, silk_touch: 1, unbreaking: 3, fortune: 3, power: 5, punch: 2, flame: 1, infinity: 1, luck_of_the_sea: 3, lure: 3,
  frost_walker: 2, mending: 1, binding_curse: 1, vanishing_curse: 1, impaling: 5, riptide: 3, loyalty: 3, channeling: 1, multishot: 1,
  piercing: 4, quick_charge: 3, soul_speed: 3, swift_sneak: 3, wind_burst: 3, density: 5, breach: 4,
};

// ---------- mobs ----------

export const HOSTILE = /zombie|skeleton|creeper|spider|witch|pillager|vindicator|evoker|ravager|phantom|drowned|husk|stray|blaze|ghast|magma|slime|piglin_brute|hoglin|zoglin|wither|guardian|shulker|enderman|endermite|silverfish|vex|warden|breeze|bogged|creaking/;
export const NOISE = /^minecraft:(item|xp_orb|arrow|falling_block|fireworks_rocket|thrown_trident|snowball|egg|ender_pearl|splash_potion|wind_charge_projectile|fishing_hook|painting|leash_knot|lightning_bolt|tnt)$/;
export const isPet = e => e.tamed || (e.ownerId && !NOISE.test(e.type));

export const MOB_CATS = [
  { value: 'mobs', label: 'Mobs', test: e => !NOISE.test(e.type) },
  { value: 'pets', label: 'Pets', test: isPet },
  { value: 'named', label: 'Com nome', test: e => !!e.customName },
  { value: 'villagers', label: 'Aldeões', test: e => /villager|wandering_trader/.test(e.type) },
  { value: 'hostile', label: 'Hostis', test: e => HOSTILE.test(e.type) },
  { value: 'other', label: 'Itens, flechas…', test: e => NOISE.test(e.type) },
  { value: 'all', label: 'Tudo', test: () => true },
];

/** Marker colour of an entity on the map. */
export function mobColor(e) {
  if (isPet(e)) return '#f08a24';
  if (/villager|wandering_trader/.test(e.type)) return '#f2c14e';
  if (HOSTILE.test(e.type)) return '#ef5b5b';
  if (NOISE.test(e.type)) return '#8b98a7';
  return '#b48cf0';
}

// ---------- biomes ----------

const BIOME_COLOR = [
  [/crimson/, '#b3262c'], [/warped/, '#1f9e8c'], [/soulsand/, '#6b5446'], [/basalt/, '#5b5d63'], [/^hell$|nether_wastes/, '#7f2a24'],
  [/deep_dark/, '#0f2b33'], [/deep.*ocean/, '#1d4fa8'], [/ocean/, '#2f6fd6'], [/frozen_river/, '#9fc4ef'], [/river/, '#3f8ff0'],
  [/stone_beach/, '#8d8f93'], [/cold_beach/, '#e8eef2'], [/beach/, '#e6d79a'], [/desert/, '#e8cf7a'],
  [/mesa|badlands/, '#c8653a'], [/savanna/, '#b7a44a'], [/bamboo/, '#6fbf2a'], [/jungle_edge/, '#4fae2a'], [/jungle/, '#2f8a14'],
  [/mangrove/, '#5a7a3a'], [/swamp/, '#4c6b3a'], [/roofed|dark_forest/, '#2c5a1c'], [/birch/, '#7ab84f'], [/cherry/, '#f0a8c8'],
  [/pale_garden/, '#a7b0a3'], [/flower/, '#d97bd0'], [/forest/, '#4d8f2c'], [/cold_taiga/, '#7fa38e'], [/taiga/, '#3e6b4a'],
  [/grove|snowy_slopes/, '#d9ecf2'], [/ice_plains_spikes/, '#a9dcf2'], [/ice|frozen|snowy|cold/, '#cfe7f5'],
  [/jagged|frozen_peaks/, '#e2e8ee'], [/peaks|mountain|extreme_hills|stony/, '#8d8f93'],
  [/meadow/, '#8fcf5a'], [/sunflower/, '#c8d84a'], [/plains/, '#8bc34a'], [/lush/, '#5fd068'], [/dripstone/, '#9b7a5e'], [/mushroom/, '#a87fa8'],
  [/the_end|end/, '#c9a5ff'],
];
export const biomeColor = n => BIOME_COLOR.find(([re]) => re.test(n))?.[1] || '#8b98a7';
export const biomeLabel = n => BIOME_LABEL[n] || (n === 'hell' ? 'Nether Wastes' : n).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
