#!/usr/bin/env node
// Contact sheet of the item art in web/src/components/sprites, rendered to PNG with headless
// Chrome, for reviewing sprites by eye.
//
//   node scripts/sprite-sheet.js [--match <regex>] [--ids <file.json>] [--only-ids] [--sprites]
//                                [--kind block|sprite] [--page <n> --per <k>] [--out <file.png>] [--size <px>] [--cols <n>]
//
// --match filters ids (or sprite names with --sprites) by regex; --ids adds a JSON array (or
// object keyed by id, like `mcx items --json`) to the built-in vanilla list, --only-ids uses
// just that file; --sprites shows every sprite template once instead of item ids.
import { writeFileSync, readFileSync, existsSync, mkdtempSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { itemArtUrl, itemArt, setPngEncoder, SPRITES } from '../web/src/components/sprites/index.js';
import { spriteSvg } from '../web/src/components/sprites/draw.js';
import { encodePng } from '../src/format/png.js';
import { VANILLA } from './vanilla-items.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = k => args.includes(k);
const match = opt('--match') ? new RegExp(opt('--match')) : null;
const size = +opt('--size', 48);
const cols = +opt('--cols', 12);
const out = resolve(opt('--out', join(tmpdir(), 'mcx-sprite-sheet.png')));

setPngEncoder(encodePng);
let cells;
if (flag('--sprites')) {
  cells = Object.keys(SPRITES).filter(n => !match || match.test(n)).map(n => ({ label: n, url: `data:image/svg+xml,${encodeURIComponent(spriteSvg(SPRITES[n], 'iron', 'red'))}` }));
} else {
  let ids = flag('--only-ids') ? [] : VANILLA.map(n => `minecraft:${n}`);
  if (opt('--ids')) {
    const data = JSON.parse(readFileSync(opt('--ids'), 'utf8'));
    ids.push(...(Array.isArray(data) ? data : Object.keys(data)));
  }
  ids = [...new Set(ids.map(i => (i.includes(':') ? i : `minecraft:${i}`)))].filter(i => !match || match.test(i.replace(/^minecraft:/, '')));
  if (opt('--kind')) ids = ids.filter(id => itemArt(id).kind === opt('--kind'));
  cells = ids.map(id => {
    const art = itemArt(id);
    return { label: id.replace(/^minecraft:/, ''), sub: art.kind === 'sprite' ? art.sprite : `▣ ${art.kind}`, url: itemArtUrl(id).url, block: art.kind === 'block' };
  });
}

if (opt('--per')) cells = cells.slice(+opt('--page', 0) * +opt('--per'), (+opt('--page', 0) + 1) * +opt('--per'));

const cellW = Math.max(size + 40, 104);
const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 10px; background: #1d2026; font: 10px/1.2 system-ui, sans-serif; color: #c9d1d9; }
.grid { display: grid; grid-template-columns: repeat(${cols}, ${cellW}px); gap: 6px; }
.c { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.row { display: flex; align-items: center; gap: 6px; }
.slot { background: #8b8b8b; box-shadow: inset 2px 2px #373737, inset -2px -2px #fff; padding: 4px; line-height: 0; }
.dark { background: #2b2f36; box-shadow: none; }
img.b { image-rendering: auto; }
img { image-rendering: pixelated; filter: drop-shadow(1px 1px 0 rgba(0,0,0,.45)); }
.l { text-align: center; word-break: break-all; max-width: ${cellW}px; }
.s { color: #7d8590; }
</style><div class="grid">${cells.map(c => `<div class="c"><div class="row"><span class="slot"><img src="${c.url}" width="${size}" height="${size}"${c.block ? ' class="b"' : ''}></span><span class="slot dark"><img src="${c.url}" width="24" height="24"${c.block ? ' class="b"' : ''}></span></div><div class="l">${c.label}${c.sub ? `<br><span class="s">${c.sub}</span>` : ''}</div></div>`).join('')}</div>`;

const dir = mkdtempSync(join(tmpdir(), 'mcx-sheet-'));
const page = join(dir, 'sheet.html');
writeFileSync(page, html);
const rows = Math.ceil(cells.length / cols);
const width = cols * (cellW + 6) + 20, height = rows * (size + 8 + 34 + 6) + 30;
const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => p && existsSync(p));
if (!chrome) { console.log(`Chrome não encontrado; abra ${page}`); process.exit(0); }
spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${join(dir, 'profile')}`,
  `--window-size=${width},${height}`, `--screenshot=${out}`, pathToFileURL(page).href], { stdio: 'ignore' });
console.log(`${cells.length} itens → ${out}`);
