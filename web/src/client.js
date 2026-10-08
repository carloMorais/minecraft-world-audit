// Promise-based RPC to the extractor worker + a small caching hook for React.
import { useEffect, useState } from 'react';

let worker = null;
let seq = 0;
const pending = new Map();
const progressListeners = new Set();
const cache = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') { for (const l of progressListeners) l(data); return; }
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      data.error ? p.reject(new Error(data.error)) : p.resolve(data.result);
    };
    worker.onerror = e => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'erro no worker'));
      pending.clear();
    };
  }
  return worker;
}

export function call(method, args) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, method, args });
  });
}

export function onProgress(fn) {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

export function openWorld(input) {
  cache.clear();
  return call('open', input);
}

/** Calls a worker method once and caches the result for the currently open world. */
export function useQuery(method, args, { enabled = true } = {}) {
  const key = `${method}|${args ? JSON.stringify(args) : ''}`;
  const [state, setState] = useState(() => (cache.has(key) ? { data: cache.get(key) } : { loading: enabled }));
  useEffect(() => {
    if (!enabled) return undefined;
    if (cache.has(key)) { setState({ data: cache.get(key) }); return undefined; }
    let alive = true;
    setState({ loading: true });
    const t0 = performance.now();
    call(method, args).then(
      data => { cache.set(key, data); if (alive) setState({ data, ms: performance.now() - t0 }); },
      error => alive && setState({ error }),
    );
    return () => { alive = false; };
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
