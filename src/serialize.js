// Converts extractor output into plain, transferable data: drops `raw` NBT (unless asked) and turns
// BigInt into number (when safe) or string.
export function toPlain(value, keepRaw = false) {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  if (Array.isArray(value)) return value.map(v => toPlain(v, keepRaw));
  if (value && typeof value === 'object' && !ArrayBuffer.isView(value)) {
    if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [k, toPlain(v, keepRaw)]));
    const o = {};
    for (const [k, v] of Object.entries(value)) if (keepRaw || k !== 'raw') o[k] = toPlain(v, keepRaw);
    return o;
  }
  return value;
}
