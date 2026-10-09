export const fmt = n => (n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('pt-BR'));

export const fmtCompact = n => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1).replace('.', ',')} bi`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} mi`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(1).replace('.', ',')} mil`;
  return fmt(n);
};

/** "minecraft:diamond_sword" -> "Diamond Sword"; keeps the namespace for add-ons ("spark_pets: Shiba Inu"). */
export function prettyName(id) {
  if (!id) return '';
  const [ns, name] = id.includes(':') ? id.split(':') : ['minecraft', id];
  const words = name.replace(/[[\]]/g, ' ').split(/[_.\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1));
  return ns === 'minecraft' ? words.join(' ') : `${words.join(' ')} · ${ns}`;
}

export const shortName = id => (id || '').replace(/^minecraft:/, '');

export const pos = p => (p ? p.map(n => Math.round(n)).join(', ') : '—');

export const DIM_LABEL = { overworld: 'Overworld', nether: 'Nether', the_end: 'The End', unknown: 'Órfã (sem chunk)' };
const DIM_ORDER = ['overworld', 'nether', 'the_end'];
export const sortDims = list => [...list].sort((a, b) => (DIM_ORDER.indexOf(a) + 1 || 9) - (DIM_ORDER.indexOf(b) + 1 || 9));

export const DIM_COLOR = { overworld: '#5fd068', nether: '#e2574c', the_end: '#c9a5ff', unknown: '#8b98a7' };
/** Dimensions that have a rendered surface map. */
export const MAP_DIMS = new Set(['overworld', 'nether', 'the_end']);

export const isHost = p => p.role.startsWith('local');

/** Display names shared by every page: "Host" for the local player, "Jogador N" for the others in save order. */
export function playerNames(players) {
  const names = new Map();
  let n = 0;
  for (const p of players || []) names.set(p.key, isHost(p) ? 'Host' : `Jogador ${++n}`);
  return names;
}

const BLOCK_ENTITY_LABEL = {
  SculkSensor: 'Sensor de sculk', CalibratedSculkSensor: 'Sensor de sculk calibrado', SculkCatalyst: 'Catalisador de sculk',
  SculkShrieker: 'Guinchador de sculk', BrushableBlock: 'Bloco escovável', MobSpawner: 'Gerador de mobs', TrialSpawner: 'Gerador de desafios',
  Vault: 'Cofre', Bed: 'Cama', Sign: 'Placa', HangingSign: 'Placa suspensa', Banner: 'Estandarte', Skull: 'Cabeça', Beacon: 'Sinalizador',
  EnchantTable: 'Mesa de encantamento', Bell: 'Sino', Conduit: 'Conduíte', EndPortal: 'Portal do End', EndGateway: 'Portal de passagem',
  Cauldron: 'Caldeirão', Beehive: 'Colmeia', BeeNest: 'Ninho de abelhas', Comparator: 'Comparador', DaylightDetector: 'Sensor de luz solar',
  PistonArm: 'Pistão', MovingBlock: 'Bloco em movimento', CommandBlock: 'Bloco de comando', StructureBlock: 'Bloco de estrutura',
  Lodestone: 'Magnetita', Music: 'Bloco musical', NetherReactor: 'Reator do Nether', Jigsaw: 'Bloco quebra-cabeça', CreakingHeart: 'Coração de rangedor',
};

/** Block entity id → pt-BR label ("SculkSensor" → "Sensor de sculk"); unknown ids are split on camel case. */
export const blockEntityLabel = (id, extra = {}) => extra[id] || BLOCK_ENTITY_LABEL[id] || id.replace(/([a-z])([A-Z])/g, '$1 $2');

export const GAMEMODE_LABEL = { survival: 'Sobrevivência', creative: 'Criativo', adventure: 'Aventura', spectator: 'Espectador', default: 'Padrão do mundo' };
export const DIFFICULTY_LABEL = { peaceful: 'Pacífico', easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };

export const ENCHANT_LABEL = {
  protection: 'Proteção', fire_protection: 'Proteção contra Fogo', feather_falling: 'Peso-pena', blast_protection: 'Proteção contra Explosões',
  projectile_protection: 'Proteção contra Projéteis', thorns: 'Espinhos', respiration: 'Respiração', depth_strider: 'Passos Profundos',
  aqua_affinity: 'Afinidade Aquática', sharpness: 'Afiação', smite: 'Julgamento', bane_of_arthropods: 'Ruína dos Artrópodes',
  knockback: 'Repulsão', fire_aspect: 'Aspecto Flamejante', looting: 'Pilhagem', efficiency: 'Eficiência', silk_touch: 'Toque Suave',
  unbreaking: 'Inquebrável', fortune: 'Fortuna', power: 'Força', punch: 'Impacto', flame: 'Chama', infinity: 'Infinidade',
  luck_of_the_sea: 'Sorte do Mar', lure: 'Isca', frost_walker: 'Passos Gelados', mending: 'Remendo', binding_curse: 'Maldição do Ligamento',
  vanishing_curse: 'Maldição do Desaparecimento', impaling: 'Penetração', riptide: 'Correnteza', loyalty: 'Lealdade', channeling: 'Condutividade',
  multishot: 'Rajada', piercing: 'Perfuração', quick_charge: 'Recarga Rápida', soul_speed: 'Velocidade das Almas', swift_sneak: 'Agachamento Rápido',
  wind_burst: 'Rajada de Vento', density: 'Densidade', breach: 'Brecha',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = n => ROMAN[n] || String(n);

export function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

export function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
