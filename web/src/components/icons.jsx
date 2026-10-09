// Item and mob icons. No game textures are shipped: items are 16×16 pixel sprites and blocks small
// 3D models, all drawn in sprites/. Mobs use a lucide shape on a coloured disc.
import {
  Cat, Dog, Bird, Rabbit, Skull, Ghost, Bug, Turtle, PawPrint, Users, Squirrel, Snail, Droplet, Zap, Fish, Flame,
  ShoppingBag, Sparkles, Box, Crosshair, Egg, Panda, Wind, Snowflake, Shield,
} from 'lucide-react';
import { itemArtUrl } from './sprites/index.js';

function hashColor(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 35% 52%)`;
}

/** An item as the game shows it in an inventory slot. Enchanted items (and those that always
 * shimmer, like the enchanted golden apple) get the glint. */
export function ItemIcon({ id, size = 40, enchanted = false }) {
  const { url, glint, block } = itemArtUrl(id);
  return (
    <span className={`item-icon${block ? ' block' : ''}${enchanted || glint ? ' glint' : ''}`} style={{ width: size, height: size, '--sprite': `url("${url}")` }}>
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
