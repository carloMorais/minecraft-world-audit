// Hash routing with query params: "#items?q=elytra". Page filters live in the URL (and so in the
// browser history) instead of any client-side storage.
import { useCallback, useState } from 'react';

export function parseHash() {
  const raw = window.location.hash.slice(1);
  const i = raw.indexOf('?');
  const page = (i < 0 ? raw : raw.slice(0, i)) || 'overview';
  const params = Object.fromEntries(new URLSearchParams(i < 0 ? '' : raw.slice(i + 1)));
  return { page, params };
}

export function hashFor(page, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString();
  return `#${page}${qs ? `?${qs}` : ''}`;
}

/** Replaces one param of the current entry without adding history or firing hashchange. */
function writeParam(key, value, fallback) {
  const { page, params } = parseHash();
  if (value == null || value === '' || value === fallback) delete params[key];
  else params[key] = String(value);
  const next = hashFor(page, params);
  if (next !== window.location.hash) window.history.replaceState(null, '', next);
}

/** useState mirrored into the URL hash (string values; `fallback` is kept out of the URL). */
export function useHashParam(key, fallback = '') {
  const [value, setValue] = useState(() => parseHash().params[key] ?? fallback);
  const set = useCallback(next => {
    setValue(prev => {
      const v = typeof next === 'function' ? next(prev) : next;
      writeParam(key, v, fallback);
      return v ?? fallback;
    });
  }, [key, fallback]);
  return [value, set];
}

/** Merges `patch` into the current page's params (null removes a key) without adding history. */
export function replaceParams(patch) {
  const { page, params } = parseHash();
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') delete params[k];
    else params[k] = String(v);
  }
  const next = hashFor(page, params);
  if (next !== window.location.hash) window.history.replaceState(null, '', next);
}
