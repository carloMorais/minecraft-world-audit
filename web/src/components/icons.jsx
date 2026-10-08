// Item and mob "icons": no game textures are shipped, so each item gets a material colour plus a
// shape icon (sword, pickaxe, food…). Block items reuse the map palette from src/extract/surface.js.
import {
  Sword, Pickaxe, Axe, Shovel, Shield, HardHat, Shirt, Footprints, Apple, Beef, Fish, FlaskConical, BookOpen,
  Gem, Flame, Feather, Map as MapIcon, Compass, Clock, Key, Package, Bone, Egg, Carrot, Cookie, Wheat, Sparkles,
  Box, Crosshair, Wand2, Coins, Anchor, Music, Rocket, Sprout, Flower2, Cat, Dog, Bird, Rabbit, Skull, Ghost,
  Bug, Turtle, PawPrint, Users, Squirrel, Snail, Droplet, Zap, Circle, Square, Scroll, Shell, Cherry, Grape, Milk,
  Candy, Fence, DoorOpen, Lamp, Cable, Hammer, Scissors, Bell, Cake, Leaf, Mountain, TreePine, Waves, Swords,
  ShoppingBag, Heart,
} from 'lucide-react';
import { blockColor } from '../../../src/extract/surface.js';

const MATERIAL = [
  [/netherite/, '#4b4346'], [/diamond/, '#4fd8d4'], [/emerald/, '#2ecc71'], [/gold|golden/, '#f2c14e'],
  [/iron|chain/, '#cfd6dc'], [/copper/, '#d27d55'], [/lapis/, '#3457c9'], [/redstone/, '#e0352b'],
  [/amethyst/, '#a26be0'], [/quartz/, '#ece6dc'], [/leather|rabbit_hide/, '#9a5b33'], [/stone|cobble/, '#8d8d8d'],
  [/wooden|stick|bowl/, '#a87c4a'], [/elytra|phantom/, '#8f8bb0'], [/turtle|scute/, '#4d9a42'],
  [/enchanted_book/, '#9b6bff'], [/book|paper|map/, '#d9caa0'], [/potion|bottle/, '#e267b4'],
  [/ender|chorus|shulker|purpur/, '#8f5aa7'], [/blaze|fire|lava|magma/, '#f08a24'], [/slime/, '#7ccf5b'],
  [/bone|skull/, '#e8e3cf'], [/string|wool|feather/, '#eeeeee'], [/coal|charcoal|ink|wither/, '#3a3a3a'],
  [/beef|porkchop|mutton|chicken|rabbit|cod|salmon/, '#d8705c'], [/bread|wheat|hay/, '#d9b157'],
  [/apple|melon|beetroot/, '#d8423a'], [/carrot|pumpkin/, '#f08a24'], [/sugar|snow|glass/, '#dbe7f2'],
  [/flint|gunpowder/, '#6b6b6b'], [/arrow|bow|crossbow|trident/, '#b49a73'], [/firework/, '#e94e77'],
];

const SHAPE = [
  [/_sword$/, Sword], [/_pickaxe$/, Pickaxe], [/_axe$/, Axe], [/_shovel$/, Shovel], [/_hoe$/, Wand2],
  [/shield/, Shield], [/_helmet$|turtle_helmet/, HardHat], [/_chestplate$|_tunic/, Shirt], [/_leggings$|_pants/, Shirt],
  [/_boots$/, Footprints], [/elytra/, Feather], [/^bow$|crossbow/, Crosshair], [/trident|mace/, Swords],
  [/arrow/, Crosshair], [/enchanted_book|^book$|writable_book|written_book|knowledge_book/, BookOpen],
  [/map/, MapIcon], [/compass|recovery_compass/, Compass], [/clock/, Clock], [/key|trial_key/, Key],
  [/shulker_box|bundle/, Package], [/chest|barrel/, Box], [/bone/, Bone], [/egg$/, Egg], [/carrot/, Carrot],
  [/cookie|bread/, Cookie], [/wheat|hay/, Wheat], [/beef|porkchop|mutton|chicken|rabbit$|cooked/, Beef],
  [/cod|salmon|fish|pufferfish/, Fish], [/apple/, Apple], [/berries|cherry/, Cherry], [/melon|grape/, Grape],
  [/milk|bucket/, Milk], [/cake/, Cake], [/pie|candy|sugar/, Candy], [/potion|bottle|honey/, FlaskConical],
  [/diamond$|emerald$|amethyst_shard|quartz$|prismarine_crystals|echo_shard/, Gem], [/ingot|nugget|scrap|netherite_upgrade/, Coins],
  [/blaze|fire_charge|torch|campfire|lantern/, Flame], [/totem/, Heart], [/firework|rocket/, Rocket],
  [/music_disc|jukebox|note_block|goat_horn/, Music], [/sapling|seeds|sprout|bamboo|kelp|vine/, Sprout],
  [/flower|tulip|poppy|dandelion|orchid|allium|rose|lilac|peony|daisy|cornflower|lily/, Flower2],
  [/leaves/, Leaf], [/_log$|_wood$|_planks$|_stem$/, TreePine], [/fence|wall/, Fence], [/door|trapdoor/, DoorOpen],
  [/lamp|glowstone|sea_lantern|shroomlight|froglight/, Lamp], [/redstone|repeater|comparator|observer|piston|lever|button/, Cable],
  [/anvil|smithing|grindstone/, Hammer], [/shears/, Scissors], [/bell/, Bell], [/anchor|lodestone/, Anchor],
  [/shell|nautilus|heart_of_the_sea/, Shell], [/string|lead|name_tag|saddle/, Scroll], [/water|ice/, Waves],
  [/stone|ore|deepslate|cobble|granite|diorite|andesite|tuff|dirt|sand|gravel|clay|terracotta|bricks?$|block$/, Mountain],
  [/spawn_egg/, Egg], [/gunpowder|redstone$|glowstone_dust|dust/, Sparkles], [/emerald/, Gem],
];

function hashColor(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 35% 52%)`;
}

export function itemStyle(id) {
  const name = (id || '').replace(/^[^:]+:/, '');
  let color = MATERIAL.find(([re]) => re.test(name))?.[1];
  const Icon = SHAPE.find(([re]) => re.test(name))?.[1] || (id?.startsWith('minecraft:') ? Square : Circle);
  if (!color) {
    const c = blockColor(id || '');
    color = Icon === Square || Icon === Mountain ? `rgb(${c.join(',')})` : hashColor(name);
  }
  return { color, Icon };
}

export function ItemIcon({ id, size = 40, enchanted = false }) {
  const { color, Icon } = itemStyle(id);
  return (
    <span className={`item-icon${enchanted ? ' glint' : ''}`} style={{ '--c': color, width: size, height: size }}>
      <Icon size={size * 0.55} strokeWidth={2.2} />
    </span>
  );
}

const MOBS = [
  [/villager|trader|witch|illager|pillager|vindicator|evoker/, Users, '#d9a066'],
  [/zombie|skeleton|stray|husk|drowned|wither|phantom/, Skull, '#7fa36b'], [/creeper/, Zap, '#5fd068'],
  [/ghast|vex|allay|ghost/, Ghost, '#e5e5e5'], [/spider|silverfish|endermite|bee|bug/, Bug, '#7a5c45'],
  [/cat|ocelot|siamese|scottish_fold|persian/, Cat, '#f2c14e'], [/wolf|dog|fox|shiba|husky|corgi/, Dog, '#c48a4f'],
  [/parrot|chicken|bird|falcon|eagle/, Bird, '#e2574c'], [/rabbit|guinea_pig|hamster/, Rabbit, '#c9a27a'],
  [/turtle|tortoise/, Turtle, '#4d9a42'], [/fish|cod|salmon|squid|axolotl|dolphin|tadpole/, Fish, '#4fb2d8'],
  [/squirrel|hedgehog|capybara/, Squirrel, '#a87c4a'], [/snail|slime|magma_cube/, Snail, '#7ccf5b'],
  [/dragon|ramtalon|blazefalcon|stormfalcon|t_rex/, Flame, '#a26be0'], [/horse|donkey|mule|llama|camel|cow|pig|sheep|goat|strider|hoglin/, PawPrint, '#b78b5d'],
  [/piglin|enderman|blaze|warden|golem|guardian/, Skull, '#e2574c'], [/item$/, ShoppingBag, '#8b98a7'],
  [/xp_orb/, Sparkles, '#9be15d'], [/minecart|boat/, Box, '#9aa5b1'], [/arrow|trident|snowball|pearl/, Crosshair, '#b49a73'],
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
