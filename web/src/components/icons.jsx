// Item and mob icons. No game textures are shipped: items are 16×16 pixel sprites drawn in
// sprites.js and tinted by material; block items are a cube in the map palette from
// src/extract/surface.js. Mobs use a lucide shape on a coloured disc.
import {
  Cat, Dog, Bird, Rabbit, Skull, Ghost, Bug, Turtle, PawPrint, Users, Squirrel, Snail, Droplet, Zap, Fish, Flame,
  ShoppingBag, Sparkles, Box, Crosshair, Egg, Panda, Wind, Snowflake, Shield,
} from 'lucide-react';
import { blockColor } from '../../../src/extract/surface.js';
import { spriteShape, spriteUrl } from './sprites.js';

const MATERIAL = [
  [/netherite/, '#4b4346'], [/diamond/, '#4fd8d4'], [/emerald/, '#2ecc71'], [/gold|golden/, '#f2c14e'],
  [/minecart|shears|flint_and_steel|iron|chain/, '#cfd6dc'], [/copper/, '#d27d55'], [/lapis|lapis_lazuli/, '#3457c9'], [/redstone/, '#e0352b'],
  [/amethyst/, '#a26be0'], [/quartz/, '#ece6dc'], [/leather|rabbit_hide|saddle/, '#9a5b33'], [/stone|cobble/, '#8d8d8d'],
  [/boat|sign|painting|bed|campfire|wooden|stick|bowl|bow$|crossbow|fishing_rod/, '#a87c4a'], [/elytra|phantom/, '#8f8bb0'], [/turtle|scute/, '#4d9a42'],
  [/enchanted_book/, '#9b6bff'], [/book/, '#8a4b2a'], [/paper|map/, '#d9caa0'], [/experience_bottle/, '#9be15d'],
  [/potion|bottle/, '#e267b4'], [/ender_eye/, '#3f9f7f'], [/ender|chorus|shulker|purpur/, '#8f5aa7'],
  [/blaze|fire|lava|magma/, '#f08a24'], [/breeze|wind/, '#b7c6f0'], [/slime/, '#7ccf5b'], [/totem/, '#e8c45a'],
  [/bone|skull/, '#e8e3cf'], [/string|wool|feather|lead/, '#e6e6e6'], [/coal|charcoal|ink|wither/, '#3a3a3a'],
  [/beef|porkchop|mutton|chicken|rabbit|rotten_flesh/, '#d8705c'], [/cod|salmon/, '#b9a28a'], [/tropical_fish/, '#f08a24'],
  [/pufferfish/, '#e8c45a'], [/bread|wheat|hay|cookie/, '#d9b157'], [/golden_apple|glistering/, '#f2c14e'],
  [/apple|melon|beetroot|sweet_berries/, '#d8423a'], [/carrot|pumpkin/, '#f08a24'], [/potato/, '#c9a35a'],
  [/sugar|snow|glass/, '#dbe7f2'], [/flint|gunpowder/, '#6b6b6b'], [/arrow|trident/, '#b49a73'], [/firework/, '#e94e77'],
  [/heart_of_the_sea|nautilus|prismarine/, '#3fb0b8'], [/glowstone|glow_/, '#f5d36b'], [/nether_star/, '#f1f3c8'],
  [/egg/, '#e8e3cf'], [/spawn_egg/, '#c9a27a'], [/wart|nether_brick/, '#8a2a2a'], [/echo|echo_shard/, '#1e5a63'],
  [/seeds/, '#7fb24a'], [/spyglass/, '#d27d55'], [/compass|clock/, '#9aa0a6'], [/bucket/, '#cfd6dc'], [/bell/, '#f2c14e'], [/music_disc/, '#3a3a3a'],
];

// Names that are clearly placed blocks even when the map palette has no exact colour for them.
const BLOCKISH = /stone|ore$|deepslate|cobble|granite|diorite|andesite|tuff|dirt|sand|gravel|clay|terracotta|brick|block$|planks|_log$|_wood$|stem$|hyphae|leaves|wool|concrete|glass|slab|stairs|wall$|fence|carpet|ice$|snow$|netherrack|obsidian|basalt|blackstone|prismarine$|purpur|moss|mud|calcite|dripstone|sculk|bookshelf|pumpkin$|melon$|hay|sponge|lamp|scaffolding|rail$|table$|furnace|smoker|anvil|cauldron|beacon|lantern|grass|podzol|mycelium|nylium|froglight|shroomlight|bedrock|debris|crafter|observer|piston|dispenser|dropper|lodestone|vault|spawner|jukebox|note_?block|composter|loom|grindstone|stonecutter|lectern|bell$|campfire|target|tnt$|cactus|bamboo$|kelp_block|coral|sea_lantern|bed$|banner$|candle$|chain$|bars$/;

function hashColor(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 35% 52%)`;
}

/** Sprite template and colours for an item id. */
export function itemSprite(id) {
  const name = (id || '').replace(/^[^:]+:/, '');
  const ruleShape = spriteShape(name, true);
  const matched = ruleShape !== 'orb' || /compass|clock|pearl|eye|slime_ball|magma_cream|snowball|heart_of_the_sea|fire_charge|clay_ball|experience/.test(name);
  const isBlock = !matched && BLOCKISH.test(name);
  const shape = isBlock ? (/_ore$/.test(name) ? 'ore' : 'block') : ruleShape;
  let color = shape === 'block' || shape === 'ore' ? null : MATERIAL.find(([re]) => re.test(name))?.[1];
  if (!color) color = isBlock || shape === 'block' || shape === 'ore' || shape === 'box' || shape === 'door' ? `rgb(${blockColor(id || '').join(',')})` : hashColor(name);
  let accent;
  if (shape === 'ore') { color = '#8d8d8d'; accent = MATERIAL.find(([re]) => re.test(name.replace(/_ore$|deepslate_/g, '')))?.[1] || '#f0f0f0'; }
  if (/deepslate_.*_ore/.test(name)) color = '#4d4d55';
  if (shape === 'book') accent = name.includes('enchanted') ? '#e8d4ff' : '#f2c14e';
  return { shape, color, accent };
}

export function ItemIcon({ id, size = 40, enchanted = false }) {
  const { shape, color, accent } = itemSprite(id);
  const url = spriteUrl(shape, color, accent);
  return (
    <span className={`item-icon${enchanted ? ' glint' : ''}`} style={{ width: size, height: size, '--sprite': `url("${url}")` }}>
      <img src={url} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}

const MOBS = [
  [/villager|trader|witch|illager|pillager|vindicator|evoker/, Users, '#d9a066'],
  [/zombie|skeleton|stray|husk|drowned|wither|phantom|bogged/, Skull, '#7fa36b'], [/creeper/, Zap, '#5fd068'],
  [/ghast|vex|allay|ghost/, Ghost, '#e5e5e5'], [/spider|silverfish|endermite|bee|bug/, Bug, '#7a5c45'], [/panda/, Panda, '#e5e5e5'],
  [/cat|ocelot|siamese|scottish_fold|persian/, Cat, '#f2c14e'], [/wolf|dog|fox|shiba|husky|corgi/, Dog, '#c48a4f'],
  [/parrot|chicken|bird|falcon|eagle/, Bird, '#e2574c'], [/rabbit|guinea_pig|hamster/, Rabbit, '#c9a27a'],
  [/turtle|tortoise/, Turtle, '#4d9a42'], [/fish|cod|salmon|squid|axolotl|dolphin|tadpole/, Fish, '#4fb2d8'],
  [/squirrel|hedgehog|capybara/, Squirrel, '#a87c4a'], [/snail|slime|magma_cube/, Snail, '#7ccf5b'],
  [/dragon|ramtalon|blazefalcon|stormfalcon|t_rex/, Flame, '#a26be0'], [/horse|donkey|mule|llama|camel|cow|pig|sheep|goat|strider|hoglin/, PawPrint, '#b78b5d'],
  [/piglin|enderman|blaze|warden|guardian/, Skull, '#e2574c'], [/iron_golem/, Shield, '#cfd6dc'], [/snow_golem/, Snowflake, '#dbe7f2'], [/breeze/, Wind, '#b7c6f0'],
  [/item$/, ShoppingBag, '#8b98a7'],
  [/xp_orb/, Sparkles, '#9be15d'], [/minecart|boat|shulker/, Box, '#9aa5b1'], [/arrow|trident|snowball|pearl/, Crosshair, '#b49a73'],
  [/egg/, Egg, '#e8e3cf'], [/water|bubble/, Droplet, '#4fb2d8'],
];

export function MobIcon({ id, size = 28 }) {
  const name = (id || '').replace(/^[^:]+:/, '');
  const [, Icon, color] = MOBS.find(([re]) => re.test(name)) || [null, PawPrint, hashColor(name)];
  return (
    <span className="mob-icon" style={{ '--c': color, width: size, height: size }}>
      <Icon size={size * 0.6} strokeWidth={2.2} />
    </span>
  );
}
