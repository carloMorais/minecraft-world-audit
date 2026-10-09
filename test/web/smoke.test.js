// End-to-end smoke test of the built web app: opens the first samples/*.mcworld in headless Chrome
// (over the DevTools protocol, no extra dependencies), visits every page and fails on uncaught
// exceptions, console errors or an error box. Skipped when there is no sample world or no Chrome.
// Run with `npm run test:web` (builds first). Set CHROME to the browser binary if it is not found,
// and SAMPLE to a file name in samples/ to open another world.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PAGES = ['overview', 'map', 'world', 'players', 'players?view=compare', 'containers', 'items?q=diamond', 'entities', 'blocks', 'biomes', 'bases', 'bases?id=1', 'map?heat=build&layer=bases', 'wealth', 'collections', 'villagers', 'storage', 'gear', 'performance', 'mining', 'mining?ore=diamond', 'portals', 'compare', 'advanced'];
const sample = process.env.SAMPLE || existsSync(join(ROOT, 'samples')) && readdirSync(join(ROOT, 'samples')).find(f => f.endsWith('.mcworld'));
const chrome = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => p && existsSync(p));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const skip = !sample ? 'sem mundo em samples/' : !chrome ? 'Chrome não encontrado (defina CHROME)' : !existsSync(join(ROOT, 'web/dist/index.html')) ? 'rode vite build antes' : false;

test('web app renders every page with a sample world', { skip, timeout: 600_000 }, async () => {
  const port = 5300 + Math.floor(Math.random() * 400);
  const server = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  const profile = mkdtempSync(join(tmpdir(), 'mcx-smoke-'));
  const debugPort = 9500 + Math.floor(Math.random() * 400);
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let targets;
    for (let i = 0; i < 100 && !targets; i++) {
      try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json(); } catch { await sleep(200); }
    }
    assert.ok(targets, 'Chrome DevTools did not start');
    ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    const problems = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
      else if (m.method === 'Runtime.exceptionThrown') problems.push(`exceção: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(`console.error: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`);
    });
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    const waitFor = async (expr, ms) => {
      for (const t = Date.now(); Date.now() - t < ms; await sleep(250)) if (await evaluate(expr)) return true;
      return false;
    };
    await send('Runtime.enable');
    await send('DOM.enable');

    for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${port}/`); break; } catch { await sleep(250); } }
    await send('Page.navigate', { url: `http://localhost:${port}/` });
    assert.ok(await waitFor('!!document.querySelector("input[type=file][accept]")', 30_000), 'landing did not render');

    const doc = await send('DOM.getDocument');
    const input = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type=file][accept]' });
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [join(ROOT, 'samples', sample)] });
    assert.ok(await waitFor('!!document.querySelector(".shell")', 180_000), 'world did not open');

    for (const page of PAGES) {
      await evaluate(`location.hash = ${JSON.stringify(page)}`);
      await sleep(300);
      const settled = await waitFor('!document.querySelector(".loading, .map-overlay")', 240_000);
      assert.ok(settled, `#${page} never finished loading`);
      const state = await evaluate('({ page: !!document.querySelector(".page"), error: document.querySelector(".error-box")?.textContent || null })');
      assert.ok(state.page, `#${page} rendered no .page`);
      assert.equal(state.error, null, `#${page} shows an error: ${state.error}`);
    }
    // save comparison: open the same sample in the second worker
    await evaluate('location.hash = "compare"');
    assert.ok(await waitFor('!!document.querySelector(".compare-drop input[type=file]")', 30_000), 'compare picker did not render');
    const doc2 = await send('DOM.getDocument');
    const input2 = await send('DOM.querySelector', { nodeId: doc2.root.nodeId, selector: '.compare-drop input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId: input2.nodeId, files: [join(ROOT, 'samples', sample)] });
    assert.ok(await waitFor('!!document.querySelector(".compare-sides, .error-box")', 240_000), 'comparison never finished');
    assert.equal(await evaluate('document.querySelector(".error-box")?.textContent || null'), null, 'comparison failed');
    assert.deepEqual(problems, [], problems.join('\n'));
  } finally {
    ws?.close();
    browser.kill();
    server.kill();
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold files */ }
  }
});
