// Top-down surface map: for each column, the highest visible block, coloured and hill-shaded.
// The Data3D heightmap is not used: it ignores non-light-blocking blocks (stairs, slabs, glass…).
import { decodeSubChunk } from '../format/subchunk.js';
import { encodePng } from '../format/png.js';

// Blocks skipped when looking for the surface (invisible or too thin to matter from above).
const SKIP = /^minecraft:(air|cave_air|void_air|structure_void|light_block|barrier|glass_pane|tripwire|string)$|^minecraft:light_block/;

const EXACT = {
  grass_block: [109, 153, 48], short_grass: [104, 150, 46], tall_grass: [104, 150, 46], fern: [92, 140, 50],
  dirt: [134, 96, 67], coarse_dirt: [119, 85, 59], podzol: [91, 63, 24], rooted_dirt: [144, 103, 76], mud: [60, 57, 60],
  dirt_with_roots: [144, 103, 76], farmland: [110, 75, 45], grass_path: [148, 122, 65], dirt_path: [148, 122, 65],
  mycelium: [111, 99, 105], moss_block: [89, 109, 45], moss_carpet: [89, 109, 45],
  water: [52, 92, 196], flowing_water: [52, 92, 196], lava: [212, 90, 18], flowing_lava: [212, 90, 18],
  sand: [219, 207, 163], sandstone: [216, 203, 155], red_sand: [190, 102, 33], red_sandstone: [186, 99, 29],
  gravel: [136, 126, 126], clay: [160, 166, 179], stone: [125, 125, 125], cobblestone: [122, 122, 122],
  mossy_cobblestone: [110, 118, 94], deepslate: [80, 80, 82], tuff: [108, 109, 102], calcite: [223, 224, 220],
  andesite: [136, 136, 136], diorite: [188, 188, 188], granite: [149, 103, 85], dripstone_block: [134, 107, 92],
  bedrock: [85, 85, 85], obsidian: [20, 18, 30], snow: [249, 254, 254], snow_layer: [249, 254, 254],
  powder_snow: [248, 253, 253], ice: [145, 183, 253], packed_ice: [141, 180, 250], blue_ice: [116, 167, 253],
  netherrack: [97, 38, 38], crimson_nylium: [130, 31, 31], warped_nylium: [43, 114, 101], soul_sand: [81, 62, 50],
  soul_soil: [75, 57, 46], basalt: [80, 81, 86], blackstone: [42, 36, 41], magma: [142, 63, 31],
  glowstone: [171, 131, 84], nether_wart_block: [114, 2, 2], warped_wart_block: [22, 119, 121],
  shroomlight: [240, 146, 70], end_stone: [219, 222, 158], purpur_block: [169, 125, 169], chorus_plant: [93, 57, 93],
  chorus_flower: [151, 120, 151], pumpkin: [198, 118, 24], melon_block: [111, 145, 30], hay_block: [166, 136, 38],
  cactus: [85, 127, 43], sugar_cane: [148, 192, 101], reeds: [148, 192, 101], bamboo: [93, 144, 19],
  lily_pad: [32, 128, 48], waterlily: [32, 128, 48], seagrass: [40, 100, 60], kelp: [60, 110, 40],
  terracotta: [152, 94, 67], hardened_clay: [152, 94, 67], prismarine: [99, 156, 151], sea_lantern: [172, 199, 190],
  cherry_leaves: [229, 172, 194], azalea_leaves: [90, 117, 44], flowering_azalea_leaves: [99, 111, 60],
  mangrove_roots: [74, 59, 38], muddy_mangrove_roots: [70, 58, 45], pale_moss_block: [106, 112, 103],
  iron_block: [220, 220, 220], gold_block: [246, 208, 61], diamond_block: [98, 237, 228], emerald_block: [42, 203, 87],
  netherite_block: [66, 61, 63], redstone_block: [175, 24, 5], lapis_block: [30, 67, 140], coal_block: [16, 15, 15],
  bookshelf: [117, 94, 59], crafting_table: [119, 89, 55], torch: [255, 210, 90], rail: [125, 110, 90],
};

const COLOR_WORDS = {
  white: [233, 236, 236], orange: [240, 118, 19], magenta: [189, 68, 179], light_blue: [58, 175, 217],
  yellow: [248, 197, 39], lime: [112, 185, 25], pink: [237, 141, 172], gray: [62, 68, 71], light_gray: [142, 142, 134],
  silver: [142, 142, 134], cyan: [21, 137, 145], purple: [121, 42, 172], blue: [53, 57, 157], brown: [114, 71, 40],
  green: [84, 109, 27], red: [160, 39, 34], black: [20, 21, 25],
};

const WOOD = {
  oak: [162, 130, 78], spruce: [114, 84, 48], birch: [196, 179, 123], jungle: [160, 115, 80], acacia: [168, 90, 50],
  dark_oak: [66, 43, 20], mangrove: [117, 54, 48], cherry: [226, 178, 172], bamboo: [193, 173, 80],
  crimson: [101, 48, 70], warped: [43, 104, 99], pale_oak: [228, 217, 215],
};
const LEAVES = {
  oak: [59, 122, 24], spruce: [56, 92, 56], birch: [100, 140, 60], jungle: [48, 140, 20], acacia: [70, 120, 20],
  dark_oak: [40, 100, 15], mangrove: [60, 120, 40], pale_oak: [140, 150, 140],
};

const cache = new Map();

/** Returns an [r,g,b] for a block name. */
function blockColor(full) {
  let c = cache.get(full);
  if (c) return c;
  const name = full.replace(/^[a-z0-9_]+:/, '');
  c = EXACT[name];
  if (!c) {
    const colorWord = Object.keys(COLOR_WORDS).sort((a, b) => b.length - a.length).find(w => name.startsWith(`${w}_`));
    const woodWord = Object.keys(WOOD).sort((a, b) => b.length - a.length).find(w => name.startsWith(`${w}_`) || name.includes(`_${w}_`));
    if (/leaves/.test(name)) c = LEAVES[woodWord] || [56, 118, 29];
    else if (colorWord && /wool|carpet|concrete|terracotta|stained_glass|bed|candle|shulker|banner/.test(name)) c = COLOR_WORDS[colorWord];
    else if (woodWord && /log|wood|stem|hyphae/.test(name)) c = WOOD[woodWord].map(v => Math.round(v * 0.7));
    else if (woodWord) c = WOOD[woodWord];
    else if (/deepslate/.test(name)) c = EXACT.deepslate;
    else if (/blackstone/.test(name)) c = EXACT.blackstone;
    else if (/nether_brick/.test(name)) c = [44, 22, 26];
    else if (/sandstone/.test(name)) c = name.includes('red') ? EXACT.red_sandstone : EXACT.sandstone;
    else if (/stone|brick|cobble|andesite|diorite|granite|tuff/.test(name)) c = EXACT.stone;
    else if (/copper/.test(name)) c = /oxidized/.test(name) ? [82, 162, 132] : /weathered/.test(name) ? [108, 153, 110] : /exposed/.test(name) ? [161, 125, 103] : [192, 107, 79];
    else if (/ore$/.test(name)) c = EXACT.stone;
    else if (/flower|tulip|poppy|dandelion|orchid|allium|bluet|daisy|cornflower|lily|rose|peony|lilac|sunflower|petals/.test(name)) c = [120, 160, 60];
    else if (/sapling|vine|bush|grass|fern|crop|wheat|carrot|potato|beetroot|berry|dripleaf|azalea/.test(name)) c = [90, 140, 45];
    else if (/glass/.test(name)) c = [200, 220, 230];
    else if (/ice/.test(name)) c = EXACT.ice;
    else if (/snow/.test(name)) c = EXACT.snow;
    else if (/coral/.test(name)) c = [200, 80, 120];
    else if (/mushroom/.test(name)) c = [150, 110, 90];
    else {
      let h = 0;
      for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      c = [110 + (h & 63), 110 + ((h >> 6) & 63), 110 + ((h >> 12) & 63)];
    }
  }
  cache.set(full, c);
  return c;
}

const DIM_START_Y = { 0: 319, 1: 118, 2: 255 }; // nether: start below the bedrock roof

/**
 * Scans every chunk of a dimension. Returns {minX, minZ, width, height, chunks, rgba: Uint8Array}.
 * Colours: block colour + water depth tint + hill shading from height differences.
 */
function renderSurface(world, dim = 0, opts = {}) {
  const byChunk = new Map(); // "x,z" -> {sub: {y: decoded}}
  for (const [ck, v] of world.chunkRecords(47, dim)) {
    const key = `${ck.x},${ck.z}`;
    let e = byChunk.get(key);
    if (!e) byChunk.set(key, e = { x: ck.x, z: ck.z, subs: [] });
    e.subs.push([ck.subY, v]);
  }
  if (!byChunk.size) return null;
  let minCX = Infinity, maxCX = -Infinity, minCZ = Infinity, maxCZ = -Infinity;
  for (const c of byChunk.values()) {
    minCX = Math.min(minCX, c.x); maxCX = Math.max(maxCX, c.x);
    minCZ = Math.min(minCZ, c.z); maxCZ = Math.max(maxCZ, c.z);
  }
  const width = (maxCX - minCX + 1) * 16, height = (maxCZ - minCZ + 1) * 16;
  const startY = opts.startY ?? DIM_START_Y[dim] ?? 319;
  const heights = new Int16Array(width * height).fill(-32768);
  const rgb = new Uint8Array(width * height * 3);
  const waterDepth = new Uint8Array(width * height);

  for (const c of byChunk.values()) {
    const subs = c.subs.sort((a, b) => b[0] - a[0]).map(([y, v]) => {
      try { return decodeSubChunk(v, y); } catch { return null; }
    }).filter(Boolean);
    const ox = (c.x - minCX) * 16, oz = (c.z - minCZ) * 16;
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const p = (oz + z) * width + ox + x;
        let water = 0;
        let found = false;
        // Nether: skip the solid roof — begin looking once we've seen air below startY.
        let seenAir = dim !== 1;
        for (const sc of subs) {
          if (found) break;
          const layer = sc.layers[0];
          if (!layer) continue;
          for (let y = 15; y >= 0; y--) {
            const wy = sc.y * 16 + y;
            if (wy > startY) continue;
            const i = (x << 8) | (z << 4) | y;
            const entry = layer.palette[layer.indices ? layer.indices[i] : 0];
            const name = entry?.name || 'minecraft:air';
            if (SKIP.test(name)) { seenAir = true; continue; }
            if (!seenAir) continue;
            if (name === 'minecraft:water' || name === 'minecraft:flowing_water') {
              if (water === 0) heights[p] = wy;
              water++;
              if (water < 24) continue;
            }
            const col = water ? blockColor('minecraft:water') : blockColor(name);
            rgb[p * 3] = col[0]; rgb[p * 3 + 1] = col[1]; rgb[p * 3 + 2] = col[2];
            if (!water) heights[p] = wy;
            waterDepth[p] = Math.min(water, 255);
            found = true;
            break;
          }
        }
        if (!found && water) {
          const col = blockColor('minecraft:water');
          rgb[p * 3] = col[0]; rgb[p * 3 + 1] = col[1]; rgb[p * 3 + 2] = col[2];
          waterDepth[p] = Math.min(water, 255);
        }
      }
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const p = z * width + x;
      if (heights[p] === -32768) continue;
      let r = rgb[p * 3], g = rgb[p * 3 + 1], b = rgb[p * 3 + 2];
      if (waterDepth[p]) {
        const f = Math.max(0.45, 1 - waterDepth[p] * 0.035); // deeper water = darker
        r *= f; g *= f; b *= f;
      } else {
        const north = z > 0 && heights[p - width] !== -32768 ? heights[p - width] : heights[p];
        const west = x > 0 && heights[p - 1] !== -32768 ? heights[p - 1] : heights[p];
        const d = (heights[p] - north) + (heights[p] - west) * 0.5;
        const f = Math.max(0.6, Math.min(1.3, 1 + d * 0.08));
        r *= f; g *= f; b *= f;
      }
      rgba[p * 4] = Math.min(255, r); rgba[p * 4 + 1] = Math.min(255, g); rgba[p * 4 + 2] = Math.min(255, b);
      rgba[p * 4 + 3] = 255;
    }
  }
  return {
    minX: minCX * 16, minZ: minCZ * 16, width, height, chunks: byChunk.size,
    rgba,
  };
}

/** Same as renderSurface but encoded as a PNG Buffer (Node / CLI use). */
function renderSurfacePng(world, dim = 0, opts = {}) {
  const r = renderSurface(world, dim, opts);
  return r && { ...r, png: encodePng(r.width, r.height, r.rgba) };
}

export { renderSurface, renderSurfacePng, blockColor };
