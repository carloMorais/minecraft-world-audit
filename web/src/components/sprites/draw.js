// 16×16 pixel sprites → SVG.
//
// A sprite is `{ rows, pal }`: 16 strings of 16 characters, '.' is transparent and every other
// character is looked up in `pal`. Palette values are CSS hex colours ('#rrggbb' or '#rrggbbaa')
// or tint references: '@0'…'@5' take that tone of the primary tint ramp and '%0'…'%5' of the
// secondary one (see RAMPS in color.js), so one template serves every material.
import { ramp } from './color.js';

export function resolvePalette(pal, tintA, tintB) {
  const a = ramp(tintA), b = ramp(tintB || tintA);
  const out = {};
  for (const [k, v] of Object.entries(pal)) {
    out[k] = v[0] === '@' ? a[+v[1]] : v[0] === '%' ? b[+v[1]] : v;
  }
  return out;
}

function fill(color) {
  if (color.length === 9) return `fill="${color.slice(0, 7)}" fill-opacity="${(parseInt(color.slice(7), 16) / 255).toFixed(2)}"`;
  return `fill="${color}"`;
}

/** SVG markup (no data: prefix) for a sprite with the given tints. */
export function spriteSvg(sprite, tintA, tintB) {
  const pal = resolvePalette(sprite.pal, tintA, tintB);
  let rects = '';
  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < 16;) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || ch === undefined) { x++; continue; }
      let w = 1;
      while (row[x + w] === ch) w++;
      const color = pal[ch];
      if (color) rects += `<rect x="${x}" y="${y}" width="${w}" height="1" ${fill(color)}/>`;
      x += w;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`;
}

/** Throws when a sprite has the wrong size or uses a letter missing from its palette. */
export function checkSprite(name, sprite) {
  if (!sprite || !Array.isArray(sprite.rows) || sprite.rows.length !== 16) throw new Error(`${name}: expected 16 rows`);
  sprite.rows.forEach((row, y) => {
    if (row.length !== 16) throw new Error(`${name}: row ${y} has ${row.length} columns`);
    for (const ch of row) if (ch !== '.' && !(ch in sprite.pal)) throw new Error(`${name}: letter '${ch}' not in palette`);
  });
}
