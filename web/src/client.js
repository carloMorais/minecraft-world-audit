// Promise-based RPC to the extractor worker + a small caching hook for React.
import { useEffect, useState } from 'react';

/** One extractor worker. The main world uses one; the save comparison opens a second, disposable one. */
function channel() {
  let worker = null;
  let seq = 0;
  const pending = new Map();
  const progressListeners = new Set();

  function get() {
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

  return {
    call(method, args) {
      const id = ++seq;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        get().postMessage({ id, method, args });
      });
    },
    onProgress(fn) {
      progressListeners.add(fn);
      return () => progressListeners.delete(fn);
    },
    /** Kills the worker and the world it holds (frees its memory). */
    terminate() {
      worker?.terminate();
      worker = null;
      for (const p of pending.values()) p.reject(new Error('cancelado'));
      pending.clear();
    },
  };
}

const main = channel();
const cache = new Map();

export const call = main.call;
export const onProgress = main.onProgress;

export function openWorld(input) {
  cache.clear();
  return call('open', input);
}

/** Second worker holding the save that the open world is compared with. */
export const compare = channel();

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
