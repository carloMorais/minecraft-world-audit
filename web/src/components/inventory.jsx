// Minecraft-style inventory slots with rich tooltips.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ItemIcon } from './icons.jsx';
import McText from './McText.jsx';
import { prettyName, ENCHANT_LABEL, roman } from '../format.js';

const MAX_DURABILITY = {
  wooden: 59, stone: 131, iron: 250, golden: 32, diamond: 1561, netherite: 2031, elytra: 432, shield: 336,
  bow: 384, crossbow: 465, trident: 250, fishing_rod: 64, shears: 238, flint_and_steel: 64, mace: 500,
  leather_helmet: 55, leather_chestplate: 80, leather_leggings: 75, leather_boots: 65,
  chainmail_helmet: 165, chainmail_chestplate: 240, chainmail_leggings: 225, chainmail_boots: 195,
  iron_helmet: 165, iron_chestplate: 240, iron_leggings: 225, iron_boots: 195,
  golden_helmet: 77, golden_chestplate: 112, golden_leggings: 105, golden_boots: 91,
  diamond_helmet: 363, diamond_chestplate: 528, diamond_leggings: 495, diamond_boots: 429,
  netherite_helmet: 407, netherite_chestplate: 592, netherite_leggings: 555, netherite_boots: 481, turtle_helmet: 275,
};

function maxDurability(id) {
  const n = (id || '').replace(/^minecraft:/, '');
  if (MAX_DURABILITY[n]) return MAX_DURABILITY[n];
  const mat = n.split('_')[0];
  if (/_(sword|pickaxe|axe|shovel|hoe)$/.test(n)) return MAX_DURABILITY[mat];
  return null;
}

export function ItemTooltipBody({ it }) {
  const max = maxDurability(it.item);
  return (
    <div className="mc-tooltip">
      <div className={`tt-name${it.enchantments ? ' tt-ench' : ''}${it.customName ? ' tt-custom' : ''}`}>
        {it.customName ? <McText text={it.customName} /> : prettyName(it.item)}
      </div>
      {it.customName && <div className="tt-dim">{prettyName(it.item)}</div>}
      {it.enchantments?.map(e => (
        <div key={e.id} className={`tt-enchant${/curse/.test(e.name) ? ' tt-curse' : ''}`}>{ENCHANT_LABEL[e.name] || e.name} {roman(e.level)}</div>
      ))}
      {it.lore?.map((l, i) => <div key={i} className="tt-lore">{l}</div>)}
      {it.book && <div className="tt-lore">“{it.book.title}” — {it.book.author} ({it.book.pages?.length || 0} págs.)</div>}
      {it.durabilityUsed != null && (
        <div className="tt-dim">Durabilidade: {max ? `${Math.min(max, Math.max(0, max - it.durabilityUsed))} / ${max}` : `-${it.durabilityUsed}`}</div>
      )}
      {it.contents && (
        <div className="tt-contents">
          {it.contents.slice(0, 27).map((c, i) => <div key={i}>{c.count}× {c.customName ? <McText text={c.customName} /> : prettyName(c.item)}</div>)}
          {it.contents.length > 27 && <div className="tt-dim">… +{it.contents.length - 27}</div>}
        </div>
      )}
      <div className="tt-id">{it.item}{it.count > 1 ? ` · ${it.count}` : ''}</div>
    </div>
  );
}

/** Floating tooltip that follows the mouse (portal, so it never gets clipped). */
export function useHoverTooltip() {
  const [tip, setTip] = useState(null);
  const handlers = content => ({
    onMouseEnter: e => setTip({ content, x: e.clientX, y: e.clientY }),
    onMouseMove: e => setTip(t => t && { ...t, x: e.clientX, y: e.clientY }),
    onMouseLeave: () => setTip(null),
  });
  const node = tip && createPortal(
    <div className="floating-tip" style={{ left: Math.min(tip.x + 16, window.innerWidth - 300), top: Math.min(tip.y + 16, window.innerHeight - 220) }}>
      {tip.content}
    </div>,
    document.body,
  );
  return [handlers, node];
}

export function Slot({ it, size = 48, label, tipHandlers }) {
  const max = it ? maxDurability(it.item) : null;
  const pct = it && max && it.durabilityUsed > 0 ? Math.max(0, 1 - it.durabilityUsed / max) : null;
  const hp = tipHandlers && it ? tipHandlers(<ItemTooltipBody it={it} />) : {};
  return (
    <div className={`slot${it ? ' filled' : ''}`} style={{ width: size, height: size }} {...hp}>
      {it ? (
        <>
          <ItemIcon id={it.item} size={size - 12} enchanted={!!it.enchantments?.length} />
          {it.count > 1 && <span className="slot-count">{it.count}</span>}
          {it.contents && <span className="slot-badge">{it.contents.length}</span>}
          {pct != null && (
            <span className="slot-dura"><span style={{ width: `${pct * 100}%`, background: `hsl(${pct * 120} 80% 50%)` }} /></span>
          )}
        </>
      ) : label ? <span className="slot-label">{label}</span> : null}
    </div>
  );
}

/** Grid of `cols` columns; `items` are placed by their slot number when present. */
export function SlotGrid({ items = [], slots, cols = 9, size = 48, startSlot = 0, tipHandlers }) {
  const total = slots ?? Math.max(cols, Math.ceil(items.length / cols) * cols);
  const bySlot = new Map();
  let next = startSlot;
  for (const it of items) bySlot.set(it.slot ?? next++, it);
  return (
    <div className="slot-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}>
      {Array.from({ length: total }, (_, i) => <Slot key={i} it={bySlot.get(i + startSlot)} size={size} tipHandlers={tipHandlers} />)}
    </div>
  );
}

/** Wraps children so the hover tooltip portal is rendered once. */
export function TooltipScope({ children }) {
  const [handlers, node] = useHoverTooltip();
  return <>{children(handlers)}{node}</>;
}

