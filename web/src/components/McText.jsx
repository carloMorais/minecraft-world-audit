// Renders Minecraft "§" formatting codes (colours, bold, italic…) as styled spans.
const COLORS = {
  0: '#000000', 1: '#0000aa', 2: '#00aa00', 3: '#00aaaa', 4: '#aa0000', 5: '#aa00aa', 6: '#ffaa00', 7: '#aaaaaa',
  8: '#555555', 9: '#5555ff', a: '#55ff55', b: '#55ffff', c: '#ff5555', d: '#ff55ff', e: '#ffff55', f: '#ffffff',
  g: '#ddd605', h: '#e3d4d1', i: '#cecaca', j: '#443a3b', m: '#971607', n: '#b4684d', p: '#deb12d', q: '#47a036',
  s: '#2cbaa8', t: '#21497b', u: '#9a5cc6',
};

export const stripCodes = s => (s || '').replace(/§./g, '');

export default function McText({ text }) {
  if (!text || !text.includes('§')) return text ?? null;
  const parts = [];
  let style = {};
  const re = /§(.)|([^§]+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) {
      const c = m[1].toLowerCase();
      if (COLORS[c]) style = { color: COLORS[c] };
      else if (c === 'l') style = { ...style, fontWeight: 800 };
      else if (c === 'o') style = { ...style, fontStyle: 'italic' };
      else if (c === 'n') style = { ...style, textDecoration: 'underline' };
      else if (c === 'm') style = { ...style, textDecoration: 'line-through' };
      else if (c === 'r') style = {};
    } else {
      parts.push(<span key={parts.length} style={style}>{m[2]}</span>);
    }
  }
  return <>{parts}</>;
}
