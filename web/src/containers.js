// Shared metadata for item-holding blocks (block entity ids as saved by Bedrock).
export const CONTAINER_LAYOUT = {
  Chest: [27, 9], Barrel: [27, 9], ShulkerBox: [27, 9], Hopper: [5, 5], Dispenser: [9, 3], Dropper: [9, 3],
  Furnace: [3, 3], BlastFurnace: [3, 3], Smoker: [3, 3], BrewingStand: [5, 5], Crafter: [9, 3], ChiseledBookshelf: [6, 3],
  DecoratedPot: [1, 1], Campfire: [4, 4], Lectern: [1, 1], Jukebox: [1, 1], ItemFrame: [1, 1], GlowItemFrame: [1, 1], FlowerPot: [1, 1],
};

export const CONTAINER_LABEL = {
  Chest: 'Baú', Barrel: 'Barril', ShulkerBox: 'Caixa de Shulker', Hopper: 'Funil', Dispenser: 'Ejetor', Dropper: 'Liberador',
  Furnace: 'Fornalha', BlastFurnace: 'Alto-forno', Smoker: 'Defumador', BrewingStand: 'Suporte de poções', DecoratedPot: 'Vaso decorado',
  Lectern: 'Atril', Jukebox: 'Toca-discos', ItemFrame: 'Moldura', GlowItemFrame: 'Moldura brilhante', FlowerPot: 'Vaso', Campfire: 'Fogueira',
  ChiseledBookshelf: 'Estante entalhada', Crafter: 'Fabricador', EnderChest: 'Baú do End',
};

export const CONTAINER_COLOR = {
  Chest: '#d9a14a', Barrel: '#a8743f', ShulkerBox: '#b07ad8', Hopper: '#8d96a3', Dispenser: '#9aa0a6', Dropper: '#9aa0a6',
  Furnace: '#e0703a', BlastFurnace: '#e0703a', Smoker: '#e0703a', BrewingStand: '#e267b4', DecoratedPot: '#c46a4a',
  ItemFrame: '#c8b07a', GlowItemFrame: '#7fe3d4', EnderChest: '#2fb39a',
};

/** All items a block entity holds (slots + frame/jukebox/lectern single items). */
export const containerItems = b => [...(b.items || []), ...[b.item, b.record, b.book].filter(Boolean)];
