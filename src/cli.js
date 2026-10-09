import { parseArgs } from 'util';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';
import { World, parseChunkKey } from './world.js';
import { openSource } from './source.js';
import { readNbtAll, jsonReplacer } from './format/nbt.js';
import { extractLevel } from './extract/level.js';
import { extractPlayers } from './extract/players.js';
import { extractEntities, summarizeEntities } from './extract/entities.js';
import { extractBlockEntities, summarizeBlockEntities } from './extract/blockentities.js';
import { chunkCoverage, blockCensus, findBlocks, biomeCensus, readChunk } from './extract/terrain.js';
import { extractMisc, keyStats } from './extract/misc.js';
import { findItems, worldItemTotals } from './extract/search.js';
import { formatItem, stripNs } from './extract/items.js';
import { renderSurfacePng } from './extract/surface.js';
import {
  chunkActivity, findBases, lagReport, oreDistribution, storageReport, gearReport, wealthReport, portalLinks,
} from './extract/analysis.js';

const HELP = `mcx — extrator de informações de mundos Minecraft Bedrock (.mcworld ou pasta do mundo)

Uso: mcx <comando> <mundo> [argumentos] [opções]

Comandos:
  summary                 Visão geral do mundo (padrão)
  level                   Dados do level.dat: seed, dias jogados, tempo de jogo, regras, conquistas, packs
  players                 Jogadores: posição, vida, XP, efeitos, spawn, morte, permissões
  inventory               Inventário, armadura, mão secundária e ender chest de cada jogador
  entities                Entidades/mobs vivos (contagem por tipo, nomeados, domesticados, aldeões)
  containers              Baús, barris, shulkers, fornalhas… com conteúdo
  signs                   Texto de todas as placas
  blocks                  Censo de blocos por dimensão (+ blocos provavelmente colocados por jogadores)
  find-block <regex>      Coordenadas de blocos (ex.: "diamond_ore|beacon")
  find-item <regex>       Onde um item está guardado (jogadores, baús, entidades, shulkers aninhados)
  items                   Total de cada item armazenado no mundo
  biomes                  Censo de biomas por dimensão
  chunks                  Área explorada (chunks gerados) por dimensão
  chunk <x> <z>           Paleta/blocos de uma coluna de chunk (coordenadas de chunk)
  map <arquivo.png>       Renderiza o mapa aéreo da dimensão (--dim) em PNG (1 pixel = 1 bloco)
  maps | villages | portals | scoreboard | structures | misc
  bases                   Bases detectadas (heurística: blocos de construção, containers, placas, pets)
  lag                     Chunks mais pesados (entidades, itens no chão, funis) e prováveis farms
  ores                    Minérios por altura (Y) em cada dimensão
  storage                 Organização: containers cheios/vazios, itens espalhados, pilhas para juntar
  gear                    Ferramentas/armaduras gastas, equipamento sem Remendo/Inquebrável, livros
  wealth                  Patrimônio estimado (em diamantes) por jogador e por base
  portal-links            Ligações entre portais do Overworld e do Nether
  keys                    Índice de todas as chaves do banco LevelDB por categoria
  raw <chave>             NBT bruto de uma chave (texto, ou hex:0011aa…)
  export <pasta>          Exporta TUDO em arquivos JSON

Opções:
  --json                  Saída em JSON
  --out <arquivo>         Grava a saída em arquivo
  --raw                   Inclui o NBT bruto completo nos objetos JSON
  --dim <overworld|nether|the_end>
  --box x1,y1,z1,x2,y2,z2 Restringe busca/censo de blocos a uma região
  --states                Diferencia blocos por estado (ex.: orientação)
  --limit <n>             Máximo de resultados listados (padrão 200)
  --type <regex>          Filtra entidades/containers por tipo
`;

const DIM_IDS = { overworld: 0, nether: 1, the_end: 2, end: 2 };

function parseArgsWrapper(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      json: { type: 'boolean' },
      out: { type: 'string' },
      raw: { type: 'boolean' },
      dim: { type: 'string' },
      box: { type: 'string' },
      states: { type: 'boolean' },
      limit: { type: 'string' },
      type: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      'no-blocks': { type: 'boolean' }
    },
    allowPositionals: true,
    strict: false
  });
  const opts = { ...values, _: positionals };
  if (opts.help) opts.h = true; // backward compatibility for options checking opts.h
  return opts;
}

function stripRaw(obj) {
  if (Array.isArray(obj)) return obj.map(stripRaw);
  if (obj && typeof obj === 'object' && !(obj instanceof Map) && !ArrayBuffer.isView(obj)) {
    const o = {};
    for (const [k, v] of Object.entries(obj)) if (k !== 'raw') o[k] = stripRaw(v);
    return o;
  }
  return obj;
}

const toJson = (v, raw) => JSON.stringify(raw ? v : stripRaw(v), jsonReplacer, 2);
const pos = p => (p ? p.map(n => Math.round(n)).join(' ') : '?');
const fmtNum = n => Number(n).toLocaleString('pt-BR');

class Out {
  constructor() { this.lines = []; }
  h(t) { this.lines.push('', `== ${t} ==`); }
  l(...a) { this.lines.push(a.join(' ')); }
  kv(k, v) { if (v !== undefined && v !== null && v !== '') this.lines.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v, jsonReplacer) : v}`); }
  table(obj, limit = Infinity, indent = '  ') {
    const e = Object.entries(obj);
    for (const [k, v] of e.slice(0, limit)) this.lines.push(`${indent}${String(typeof v === 'object' ? v.blocks ?? v.count : v).padStart(12)}  ${k}${v?.percent !== undefined ? ` (${v.percent}%)` : ''}`);
    if (e.length > limit) this.lines.push(`${indent}… +${e.length - limit} outros`);
  }
  toString() { return this.lines.join('\n').replace(/^\n/, ''); }
}

// ---------- text renderers ----------

function textLevel(L, o) {
  o.h(`Mundo "${L.name}"`);
  o.kv('Seed', L.seed);
  o.kv('Modo de jogo', `${L.gameMode}${L.hardcore ? ' (HARDCORE)' : ''}`);
  o.kv('Dificuldade', L.difficulty);
  o.kv('Gerador', L.generator);
  o.kv('Última vez jogado', L.lastPlayed);
  o.kv('Versão (último aberto)', L.lastOpenedWithVersion);
  o.kv('Dias no jogo', `${fmtNum(L.time.daysPlayed)} (tick do mundo ${fmtNum(L.time.worldTimeTicks)})`);
  o.kv('Tempo simulado (≈ tempo de jogo)', `${L.time.approxPlayTimeHours} h`);
  o.kv('Spawn do mundo', `${L.spawn.x} ${L.spawn.y === 32767 ? '(altura automática)' : L.spawn.y} ${L.spawn.z}`);
  o.kv('Clima', `${L.weather.raining ? 'chovendo' : 'sem chuva'}${L.weather.thundering ? ', trovoada' : ''}`);
  o.kv('Cheats/comandos', L.cheatsEnabled ? 'sim' : 'não');
  o.kv('Já foi aberto no criativo', L.hasBeenLoadedInCreative ? 'sim' : 'não');
  o.kv('Conquistas', L.achievements.disabled
    ? `DESATIVADAS (${L.achievements.reason.join('; ')})` : 'permitidas (o progresso fica na conta Xbox, não no arquivo)');
  o.kv('Experimentos', Object.keys(L.experiments).filter(k => L.experiments[k]).join(', ') || 'nenhum');
  o.l('  Regras de jogo:', Object.entries(L.gameRules).map(([k, v]) => `${k}=${v}`).join(' '));
  if (L.behaviorPacks.length) { o.l('  Behavior packs:'); for (const p of L.behaviorPacks) o.l(`    - ${p.name || `${p.id} (não incluso no arquivo)`} v${p.version}`); }
  if (L.resourcePacks.length) { o.l('  Resource packs:'); for (const p of L.resourcePacks) o.l(`    - ${p.name || `${p.id} (não incluso no arquivo)`} v${p.version}`); }
}

function playerLabel(p) {
  if (p.role === 'local (host)') return 'Jogador local (host)';
  return `Jogador ${p.key.replace('player_server_', '')}${p.identity?.msaId ? ` (MSA ${p.identity.msaId})` : ''}`;
}

function textPlayer(p, o) {
  o.l(`  ${playerLabel(p)}`);
  o.kv('Modo de jogo', p.gameMode);
  o.kv('Permissão', p.permission);
  o.kv('Dimensão / posição', `${p.dimension} @ ${pos(p.position)}`);
  if (p.health) o.kv('Vida', `${p.health.current}/${p.health.max}`);
  o.kv('Fome / saturação', `${p.hunger ?? '?'} / ${p.saturation ?? '?'}`);
  o.kv('Nível de XP', `${p.xp.level} (+${Math.round((p.xp.progress || 0) * 100)}%)`);
  if (p.spawnPoint) o.kv('Ponto de renascimento', `${p.spawnPoint.dimension} @ ${p.spawnPoint.x} ${p.spawnPoint.y} ${p.spawnPoint.z}`);
  o.kv('Já morreu', p.hasDiedBefore ? `sim — última morte em ${p.lastDeath?.dimension} @ ${p.lastDeath?.x} ${p.lastDeath?.y} ${p.lastDeath?.z}` : 'não');
  o.kv('Viu os créditos (saiu do End)', p.hasSeenCredits ? 'sim' : 'não');
  if (p.effects.length) o.kv('Efeitos', p.effects.map(e => `${e.name} ${e.amplifier + 1} (${Math.round(e.durationTicks / 20)}s)`).join(', '));
  o.kv('Receitas desbloqueadas', p.unlockedRecipes.length);
  if (p.tags.length) o.kv('Tags', p.tags.join(', '));
}

function textPlayers(players, o) {
  o.h(`Jogadores (${players.length})`);
  for (const p of players) {
    textPlayer(p, o);
  }
}

function textInventory(players, o) {
  for (const p of players) {
    o.h(`${playerLabel(p)} — inventário`);
    const sec = (title, items) => {
      o.l(`  ${title} (${items.length}):`);
      for (const it of items) o.l(`    ${it.slot !== undefined ? `[${it.slot}] ` : ''}${formatItem(it)}`);
      for (const it of items) for (const c of it.contents || []) o.l(`        ↳ ${formatItem(c)}`);
    };
    sec('Armadura', p.armor);
    sec('Mão secundária', p.offhand);
    sec('Inventário', p.inventory);
    sec('Ender chest', p.enderChest);
  }
}

function textEntities(S, o, limit) {
  o.h(`Entidades (${fmtNum(S.total)})`);
  o.l('  Por dimensão:', JSON.stringify(S.byDimension));
  o.l('  Por tipo:'); o.table(S.byType, limit);
  if (S.named.length) { o.l(`  Nomeadas (${S.named.length}):`); for (const n of S.named.slice(0, limit)) o.l(`    "${n.name}" ${stripNs(n.type)} — ${n.dimension} @ ${pos(n.position)}`); }
  if (S.tamedOrOwned.length) { o.l(`  Domesticadas/com dono (${S.tamedOrOwned.length}):`); for (const n of S.tamedOrOwned.slice(0, limit)) o.l(`    ${stripNs(n.type)}${n.name ? ` "${n.name}"` : ''} dono=${n.owner} — ${n.dimension} @ ${pos(n.position)}`); }
  if (S.villagers.length) {
    const prof = {};
    for (const v of S.villagers) prof[v.profession || '?'] = (prof[v.profession || '?'] || 0) + 1;
    o.l(`  Aldeões (${S.villagers.length}) por profissão:`, Object.entries(prof).map(([k, v]) => `${k}=${v}`).join(' '));
  }
}

function textContainers(list, o, limit) {
  o.h(`Containers com itens (${list.length})`);
  for (const b of list.slice(0, limit)) {
    o.l(`  ${b.id}${b.customName ? ` "${b.customName}"` : ''} — ${b.dimension} @ ${b.position.join(' ')}`);
    for (const it of b.items || []) {
      o.l(`    ${formatItem(it)}`);
      for (const c of it.contents || []) o.l(`      ↳ ${formatItem(c)}`);
    }
    for (const it of [b.item, b.record, b.book].filter(Boolean)) o.l(`    ${formatItem(it)}`);
  }
  if (list.length > limit) o.l(`  … +${list.length - limit} (use --limit)`);
}

function textBlocks(C, o, limit) {
  o.h(`Censo de blocos (${fmtNum(C.subchunksScanned)} subchunks em ${(C.elapsedMs / 1000).toFixed(1)}s)`);
  for (const [d, D] of Object.entries(C.dimensions)) {
    o.l(`\n  [${d}] ${fmtNum(D.totalNonAir)} blocos não-ar, ${D.distinctBlockTypes} tipos`);
    o.table(Object.fromEntries(Object.entries(D.blocks).filter(([k]) => !/:air$/.test(k))), limit, '    ');
    o.l(`  [${d}] Provavelmente colocados por jogadores (heurística — vilas/estruturas também geram alguns):`);
    o.table(D.likelyPlayerPlaced, limit, '    ');
  }
}

// ---------- commands ----------

function load(world, what, cache = {}) {
  switch (what) {
    case 'level': return cache.level ||= extractLevel(world);
    case 'players': return cache.players ||= extractPlayers(world);
    case 'entities': return cache.entities ||= extractEntities(world);
    case 'blockEntities': return cache.blockEntities ||= extractBlockEntities(world);
    default: throw new Error(what);
  }
}

function filterOpts(opts) {
  const f = {};
  if (opts.dim) {
    if (!(opts.dim in DIM_IDS)) throw new Error(`--dim inválido: ${opts.dim}`);
    f.dim = DIM_IDS[opts.dim];
  }
  if (opts.box) {
    const [x1, y1, z1, x2, y2, z2] = opts.box.split(',').map(Number);
    f.box = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: Math.min(y1, y2), y2: Math.max(y1, y2), z1: Math.min(z1, z2), z2: Math.max(z1, z2) };
  }
  if (opts.states) f.states = true;
  return f;
}

function keyFromArg(arg) {
  if (arg.startsWith('hex:')) return Buffer.from(arg.slice(4), 'hex');
  return Buffer.from(arg, 'latin1');
}

function run(argv) {
  const opts = parseArgsWrapper(argv);
  if (opts.help || opts.h || opts._.length === 0) { process.stdout.write(HELP); return 0; }
  let [cmd, target, ...rest] = opts._;
  if (!target && fs.existsSync(cmd)) { target = cmd; cmd = 'summary'; }
  if (!target) throw new Error('informe o caminho do mundo (.mcworld ou pasta)');
  const limit = opts.limit ? Number(opts.limit) : 200;
  const typeRe = opts.type ? new RegExp(opts.type, 'i') : null;
  const world = new World(openSource(target));
  const cache = {};
  const o = new Out();
  let data;

  switch (cmd) {
    case 'summary': {
      const L = load(world, 'level', cache);
      const players = load(world, 'players', cache);
      const ents = summarizeEntities(load(world, 'entities', cache), players);
      const bes = summarizeBlockEntities(load(world, 'blockEntities', cache));
      const misc = extractMisc(world, players);
      const cov = chunkCoverage(world);
      data = {
        world: stripRaw(L), coverage: cov, players: players.map(p => ({
          who: playerLabel(p), gameMode: p.gameMode, dimension: p.dimension, position: p.position,
          xpLevel: p.xp.level, health: p.health, items: Object.values(p.itemTotals).reduce((a, b) => a + b, 0),
          enderChestItems: Object.values(p.enderChestTotals).reduce((a, b) => a + b, 0), hasDiedBefore: p.hasDiedBefore,
        })),
        entities: { total: ents.total, byDimension: ents.byDimension, topTypes: Object.fromEntries(Object.entries(ents.byType).slice(0, 15)), named: ents.named.length, tamedOrOwned: ents.tamedOrOwned.length, villagers: ents.villagers.length },
        blockEntities: { total: bes.total, byType: bes.byType, containersWithItems: bes.containersWithItems, unopenedLootContainers: bes.unopenedLootContainers, signs: bes.signs.length },
        dragonFight: misc.dimensions.dragonFight, portals: misc.portals.length, villages: misc.villages.length, maps: misc.maps.length,
        scoreboardObjectives: misc.scoreboard?.objectives.length ?? 0, structureTemplates: misc.structureTemplates.map(s => s.name),
        notStoredInWorld: ['estatísticas vanilla (mobs mortos, blocos minerados/colocados) — o Bedrock não grava isso no mundo',
          'progresso de conquistas — fica na conta Xbox/Microsoft'],
      };
      textLevel(L, o);
      o.h('Exploração (chunks gerados)');
      for (const [d, c] of Object.entries(cov)) o.l(`  ${d}: ${fmtNum(c.chunks)} chunks (${fmtNum(c.areaBlocks2)} blocos²), x ${c.boundsBlocks.x.join('..')} z ${c.boundsBlocks.z.join('..')}`);
      o.h(`Jogadores (${players.length})`);
      for (const p of data.players) o.l(`  ${p.who}: ${p.gameMode ?? ''} ${p.dimension} @ ${pos(p.position)} | XP ${p.xpLevel} | vida ${p.health?.current ?? '?'} | ${p.items} itens + ${p.enderChestItems} no ender chest${p.hasDiedBefore ? ' | já morreu' : ''}`);
      o.h(`Entidades: ${fmtNum(ents.total)}`);
      o.table(data.entities.topTypes, 15);
      o.l(`  nomeadas: ${ents.named.length} | domesticadas: ${ents.tamedOrOwned.length} | aldeões: ${ents.villagers.length}`);
      o.h(`Blocos com dados (block entities): ${fmtNum(bes.total)}`);
      o.table(bes.byType, 15);
      o.l(`  containers com itens: ${bes.containersWithItems} | containers de loot nunca abertos: ${bes.unopenedLootContainers} | placas com texto: ${bes.signs.length}`);
      o.h('Outros');
      const df = misc.dimensions.dragonFight;
      if (df) o.l(`  Ender Dragon: ${df.dragonKilled || df.previouslyKilled ? 'DERROTADO' : 'não derrotado'}`);
      o.l(`  Portais do Nether registrados: ${misc.portals.length} | vilas: ${misc.villages.length} | mapas: ${misc.maps.length} | estruturas salvas: ${misc.structureTemplates.length} | objetivos de scoreboard: ${data.scoreboardObjectives}`);
      o.l('  Não existe no arquivo: ', data.notStoredInWorld.join('; '));
      break;
    }
    case 'level': data = load(world, 'level', cache); textLevel(data, o); break;
    case 'players': data = load(world, 'players', cache); textPlayers(data, o); break;
    case 'inventory': data = load(world, 'players', cache).map(p => ({ who: playerLabel(p), armor: p.armor, offhand: p.offhand, inventory: p.inventory, enderChest: p.enderChest, totals: p.itemTotals })); textInventory(load(world, 'players', cache), o); break;
    case 'entities': {
      let list = load(world, 'entities', cache);
      if (typeRe) list = list.filter(e => typeRe.test(e.type));
      if (opts.dim) list = list.filter(e => e.dimension === opts.dim);
      const S = summarizeEntities(list, load(world, 'players', cache));
      data = typeRe ? { summary: S, entities: list } : S;
      textEntities(S, o, limit);
      if (typeRe) for (const e of list.slice(0, limit)) o.l(`    ${stripNs(e.type)}${e.customName ? ` "${e.customName}"` : ''} — ${e.dimension} @ ${pos(e.position)}${e.health ? ` vida ${e.health.current}/${e.health.max}` : ''}${e.profession ? ` ${e.profession}` : ''}`);
      break;
    }
    case 'containers': {
      let list = load(world, 'blockEntities', cache).filter(b => b.items?.length || b.item || b.record || b.book);
      if (typeRe) list = list.filter(b => typeRe.test(b.id));
      if (opts.dim) list = list.filter(b => b.dimension === opts.dim);
      data = list; textContainers(list, o, limit); break;
    }
    case 'signs': {
      data = summarizeBlockEntities(load(world, 'blockEntities', cache)).signs;
      o.h(`Placas (${data.length})`);
      for (const s of data) o.l(`  ${s.dimension} @ ${s.position.join(' ')}: ${JSON.stringify(s.front ?? '')}${s.back ? ` / verso: ${JSON.stringify(s.back)}` : ''}`);
      break;
    }
    case 'blocks': data = blockCensus(world, filterOpts(opts)); textBlocks(data, o, limit); break;
    case 'find-block': {
      if (!rest[0]) throw new Error('uso: find-block <mundo> <regex>');
      data = findBlocks(world, new RegExp(rest[0], 'i'), { ...filterOpts(opts), limit });
      o.h(`"${rest[0]}": ${fmtNum(data.total)} blocos encontrados (mostrando ${data.shown})`);
      for (const h of data.hits) o.l(`  ${h.dimension} ${h.x} ${h.y} ${h.z}  ${h.block}`);
      break;
    }
    case 'find-item': {
      if (!rest[0]) throw new Error('uso: find-item <mundo> <regex>');
      data = findItems(new RegExp(rest[0], 'i'), load(world, 'players', cache), load(world, 'blockEntities', cache), load(world, 'entities', cache));
      o.h(`Itens "${rest[0]}"`);
      o.l('  Totais:'); o.table(data.totals);
      o.l(`  Locais (${data.hits.length}):`);
      for (const h of data.hits.slice(0, limit)) o.l(`    ${h.count}x ${stripNs(h.item)}${h.customName ? ` "${h.customName}"` : ''} — ${h.where}${h.position ? ` (${h.dimension} @ ${pos(h.position)})` : ''}`);
      break;
    }
    case 'items': data = worldItemTotals(load(world, 'players', cache), load(world, 'blockEntities', cache), load(world, 'entities', cache)); o.h('Itens armazenados no mundo (jogadores + containers + entidades)'); o.table(data, limit); break;
    case 'biomes': data = biomeCensus(world); for (const [d, b] of Object.entries(data)) { o.h(`Biomas — ${d}`); o.table(b, limit); } break;
    case 'chunks': data = chunkCoverage(world); for (const [d, c] of Object.entries(data)) o.l(`${d}: ${fmtNum(c.chunks)} chunks, x ${c.boundsBlocks.x.join('..')} z ${c.boundsBlocks.z.join('..')}`); break;
    case 'chunk': {
      const [cx, cz] = rest.map(Number);
      data = readChunk(world, cx, cz, opts.dim ? DIM_IDS[opts.dim] : 0);
      o.h(`Chunk ${cx},${cz}: ${data.length} subchunks`);
      for (const s of data) o.l(`  y=${s.y * 16}..${s.y * 16 + 15}: ${s.layers.map(l => l.palette.join(', ')).join(' | ')}`);
      break;
    }
    case 'map': {
      const dim = opts.dim ? DIM_IDS[opts.dim] : 0;
      const out = rest[0] || 'mapa-' + (opts.dim || 'overworld') + '.png';
      const r = renderSurfacePng(world, dim);
      if (!r) throw new Error('dimensão sem chunks gerados');
      fs.writeFileSync(out, r.png);
      data = { file: path.resolve(out), width: r.width, height: r.height, originX: r.minX, originZ: r.minZ, chunks: r.chunks };
      o.l('Mapa salvo em ' + data.file + ' (' + r.width + 'x' + r.height + ' px, canto superior esquerdo = x ' + r.minX + ', z ' + r.minZ + ')');
      break;
    }
    case 'maps': case 'villages': case 'portals': case 'scoreboard': case 'structures': case 'misc': {
      const misc = extractMisc(world, load(world, 'players', cache));
      const map = { maps: misc.maps, villages: misc.villages, portals: misc.portals, scoreboard: misc.scoreboard, structures: misc.structureTemplates, misc };
      data = map[cmd];
      if (cmd === 'scoreboard' && data) {
        for (const ob of data.objectives) { o.h(`${ob.displayName} (${ob.name}, ${ob.criteria})`); for (const s of ob.scores) o.l(`  ${String(s.score).padStart(10)}  ${s.holder}`); }
      } else if (cmd === 'villages') {
        for (const v of data) o.l(`Vila ${v.id} (${v.dimension}) ${v.bounds ? `x ${v.bounds.min[0]}..${v.bounds.max[0]} z ${v.bounds.min[2]}..${v.bounds.max[2]}` : ''} moradores=${v.dwellers ?? '?'} POIs=${JSON.stringify(v.pointsOfInterest || {})}`);
      } else if (cmd === 'portals') {
        for (const p of data) o.l(`Portal ${p.dimension} @ ${p.position.join(' ')} (largura ${p.span}, eixo ${p.orientation})`);
      } else if (cmd === 'maps') {
        for (const m of data) o.l(`Mapa ${m.id}: ${m.dimension} centro ${m.center.join(',')} escala ${m.scale} explorado ${m.exploredPercent}%${m.locked ? ' (travado)' : ''}`);
      } else if (cmd === 'structures') {
        for (const s of data) o.l(`${s.name}: tamanho ${s.size?.join('x')} origem ${s.origin?.join(' ')} — ${s.blockTypes} tipos de bloco, ${s.entities} entidades`);
      } else o.l(toJson(data, opts.raw));
      break;
    }
    case 'bases': case 'lag': case 'storage': case 'wealth': {
      const players = load(world, 'players', cache);
      const bes = load(world, 'blockEntities', cache);
      const ents = load(world, 'entities', cache);
      const rows = chunkActivity(world, bes, ents);
      if (cmd === 'lag') {
        data = lagReport(rows);
        o.h('Chunks mais pesados');
        for (const h of data.heavy.slice(0, limit)) o.l(`  ${h.dimension} chunk ${h.x},${h.z} (bloco ${h.center.join(', ')}): pontos ${h.lag} | entidades ${h.entities} | itens no chão ${h.items} | funis ${h.hoppers} | ticks pendentes ${h.pendingTicks}`);
        o.h('Prováveis farms');
        for (const f of data.farms.slice(0, limit)) o.l(`  ${f.count}x ${stripNs(f.type)} — ${f.dimension} perto de ${f.center.join(', ')}`);
        break;
      }
      const bases = findBases({ rows, blockEntities: bes, entities: ents, players, villages: extractMisc(world, players).villages, value: true });
      if (cmd === 'bases') {
        data = bases;
        o.h(`Bases detectadas (${bases.length}) — heurística`);
        for (const b of bases.slice(0, limit)) {
          o.l(`  #${b.id} ${b.name ? `"${b.name}" ` : ''}${b.dimension} centro ${b.center.join(', ')} | ${b.chunks} chunks | ${b.containers} containers, ${fmtNum(b.storedItems)} itens (≈${b.value} diamantes) | ${b.villagers} aldeões, ${b.pets.length} pets${b.village ? ' | dentro de vila' : ''}`);
        }
      } else if (cmd === 'storage') {
        data = storageReport(bes, bases);
        o.h(`${fmtNum(data.containers)} containers: ${fmtNum(data.slotsUsed)}/${fmtNum(data.slotsTotal)} slots usados, ${data.full} cheios, ${data.empty} vazios`);
        o.l(`  Juntando pilhas incompletas dá para liberar ${fmtNum(data.freeableSlots)} slots`);
        o.h('Itens espalhados em mais containers');
        for (const i of data.scattered.slice(0, limit)) o.l(`  ${stripNs(i.item)}: ${fmtNum(i.total)} em ${i.containers} containers (${i.slots} slots, cabe em ${i.minSlots})`);
      } else {
        data = wealthReport(players, bes, ents, bases);
        o.h(`Patrimônio estimado do mundo: ≈${fmtNum(data.world)} diamantes`);
        for (const p of data.players) o.l(`  ${p.key}: ${p.total} (carregando ${p.carried}, ender chest ${p.enderChest})`);
        o.h('Bases');
        for (const b of data.bases) o.l(`  #${b.id} ${b.name ?? ''} ${b.center.join(', ')}: ${b.value}`);
      }
      break;
    }
    case 'ores': {
      data = oreDistribution(world);
      for (const [d, ores] of Object.entries(data)) {
        o.h(`Minérios — ${d}`);
        for (const [k, v] of Object.entries(ores)) o.l(`  ${k.padEnd(15)} ${fmtNum(v.total).padStart(12)}  melhor Y ${v.peakY} (de ${v.minY} a ${v.maxY})`);
      }
      break;
    }
    case 'gear': {
      data = gearReport(load(world, 'players', cache), load(world, 'blockEntities', cache), load(world, 'entities', cache));
      o.h(`Itens quase quebrando (${data.worn.length})`);
      for (const w of data.worn.slice(0, limit)) o.l(`  ${stripNs(w.item)} ${w.left}/${w.max} (${w.percent}%) — ${w.where}${w.position ? ` @ ${pos(w.position)}` : ''}`);
      o.h(`Equipamento sem Remendo/Inquebrável (${data.missing.length})`);
      for (const m of data.missing.slice(0, limit)) o.l(`  ${stripNs(m.item)} falta ${m.lacks.join(', ')} — ${m.where}`);
      o.h('Livros encantados');
      for (const b of data.books) o.l(`  ${b.name} ${b.level}: ${b.count}`);
      break;
    }
    case 'portal-links': {
      const r = portalLinks(extractMisc(world, load(world, 'players', cache)).portals);
      data = r;
      for (const l of r.links) {
        const from = r.portals[l.from], to = l.to != null ? r.portals[l.to] : null;
        o.l(`  ${from.dimension} @ ${from.position.join(' ')} → ${to ? `${to.dimension} @ ${to.position.join(' ')}${l.twoWay ? ' (ida e volta)' : ' (volta cai em outro portal)'}` : `nenhum portal; o jogo cria um perto de ${l.target.join(', ')}`}`);
      }
      break;
    }
    case 'keys': {
      data = keyStats(world);
      o.h(`${fmtNum(data.totalKeys)} chaves, ${fmtNum(data.totalValueBytes)} bytes (tabelas ${data.leveldb.tables}, logs ${data.leveldb.logs})`);
      for (const [k, v] of Object.entries(data.categories)) o.l(`  ${String(v.count).padStart(9)} ${String(v.bytes).padStart(12)} B  ${k}`);
      break;
    }
    case 'raw': {
      if (!rest[0]) throw new Error('uso: raw <mundo> <chave>');
      const key = keyFromArg(rest[0]);
      const v = world.db.get(key);
      if (v === undefined) throw new Error(`chave não encontrada: ${rest[0]}`);
      try { data = { key: rest[0], chunk: parseChunkKey(key), nbt: readNbtAll(v) }; } catch { data = { key: rest[0], chunk: parseChunkKey(key), hex: v.toString('hex') }; }
      opts.json = true; opts.raw = true;
      break;
    }
    case 'export': {
      const dir = rest[0] || `${path.basename(target).replace(/\.\w+$/, '')}-export`;
      fs.mkdirSync(dir, { recursive: true });
      const write = (name, v) => { fs.writeFileSync(path.join(dir, `${name}.json`), toJson(v, opts.raw)); o.l(`  ${name}.json`); };
      const players = load(world, 'players', cache);
      const entities = load(world, 'entities', cache);
      const bes = load(world, 'blockEntities', cache);
      o.h(`Exportando para ${path.resolve(dir)}`);
      write('level', load(world, 'level', cache));
      write('players', players);
      write('entities', entities);
      write('entities-summary', summarizeEntities(entities, players));
      write('block-entities', bes);
      write('block-entities-summary', summarizeBlockEntities(bes));
      write('item-totals', worldItemTotals(players, bes, entities));
      write('misc', extractMisc(world, players));
      write('chunks', chunkCoverage(world));
      write('biomes', biomeCensus(world));
      write('keys', keyStats(world));
      if (opts['no-blocks'] === undefined) write('blocks', blockCensus(world, filterOpts(opts)));
      const icon = world.source.read('world_icon.jpeg');
      if (icon) { fs.writeFileSync(path.join(dir, 'world_icon.jpeg'), icon); o.l('  world_icon.jpeg'); }
      data = { exportedTo: path.resolve(dir) };
      opts.json = false;
      break;
    }
    default:
      throw new Error(`comando desconhecido: ${cmd} (use --help)`);
  }

  const text = opts.json ? toJson(data, opts.raw) : o.toString();
  if (opts.out) fs.writeFileSync(opts.out, `${text}\n`);
  else process.stdout.write(`${text}\n`);
  world.close();
  return 0;
}

export { run };
