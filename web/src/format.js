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
