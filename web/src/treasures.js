// Valuable items summarised on the Overview and in the player comparison. `ids` maps item ids to
// how many base units one stack item is worth (a diamond block is 9 diamonds).
export const TREASURES = [
  { key: 'diamond', label: 'Diamantes', icon: 'minecraft:diamond', ids: { 'minecraft:diamond': 1, 'minecraft:diamond_block': 9 }, q: '^minecraft:diamond(_block)?$' },
  { key: 'netherite', label: 'Netherite', icon: 'minecraft:netherite_ingot', ids: { 'minecraft:netherite_ingot': 1, 'minecraft:netherite_block': 9 }, q: '^minecraft:netherite_(ingot|block)$', hint: 'em barras' },
  { key: 'debris', label: 'Detritos ancestrais', icon: 'minecraft:ancient_debris', ids: { 'minecraft:ancient_debris': 1, 'minecraft:netherite_scrap': 1 }, q: '^minecraft:(ancient_debris|netherite_scrap)$', hint: 'e fragmentos' },
  { key: 'emerald', label: 'Esmeraldas', icon: 'minecraft:emerald', ids: { 'minecraft:emerald': 1, 'minecraft:emerald_block': 9 }, q: '^minecraft:emerald(_block)?$' },
  { key: 'gold', label: 'Ouro', icon: 'minecraft:gold_ingot', ids: { 'minecraft:gold_ingot': 1, 'minecraft:gold_block': 9, 'minecraft:gold_nugget': 1 / 9 }, q: '^minecraft:gold_(ingot|block|nugget)$', hint: 'em barras' },
  { key: 'totem', label: 'Totens', icon: 'minecraft:totem_of_undying', ids: { 'minecraft:totem_of_undying': 1 }, q: '^minecraft:totem_of_undying$' },
  { key: 'elytra', label: 'Élitros', icon: 'minecraft:elytra', ids: { 'minecraft:elytra': 1 }, q: '^minecraft:elytra$' },
  { key: 'books', label: 'Livros encantados', icon: 'minecraft:enchanted_book', ids: { 'minecraft:enchanted_book': 1 }, q: '^minecraft:enchanted_book$' },
  { key: 'gapple', label: 'Maçãs douradas', icon: 'minecraft:golden_apple', ids: { 'minecraft:golden_apple': 1, 'minecraft:enchanted_golden_apple': 1 }, q: '^minecraft:(enchanted_)?golden_apple$' },
  { key: 'star', label: 'Estrelas e sinalizadores', icon: 'minecraft:nether_star', ids: { 'minecraft:nether_star': 1, 'minecraft:beacon': 1 }, q: '^minecraft:(nether_star|beacon)$' },
  { key: 'shulker', label: 'Caixas de shulker', icon: 'minecraft:shulker_box', ids: {}, match: /shulker_box$/, q: 'shulker_box$' },
];

/** Value of one treasure in a {itemId: count} totals map. */
export function treasureCount(t, totals) {
  let n = 0;
  for (const [id, count] of Object.entries(totals || {})) {
    if (t.ids[id] != null) n += count * t.ids[id];
    else if (t.match?.test(id)) n += count;
  }
  return Math.floor(n);
}
