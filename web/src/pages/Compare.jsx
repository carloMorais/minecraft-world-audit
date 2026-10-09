import { useEffect, useRef, useState } from 'react';
import {
  GitCompare, UploadCloud, X, Info, CalendarDays, Clock, Mountain, Users, Backpack, PawPrint, Archive, Loader2, ArrowRight, Gem,
} from 'lucide-react';
import { call, compare } from '../client.js';
import { Panel, PageHeader, StatCard, CoordLink, Empty, Badge, ErrorBox, Tabs } from '../components/ui.jsx';
import { ItemIcon, MobIcon } from '../components/icons.jsx';
import McText from '../components/McText.jsx';
import { TREASURES, treasureCount } from '../treasures.js';
import { fmt, prettyName, mobName, timeAgo, DIM_LABEL, DIM_COLOR, sortDims, playerNames, blockEntityLabel } from '../format.js';
import { CONTAINER_LABEL } from '../containers.js';

const STEP_LABEL = { read: 'Lendo o arquivo', unzip: 'Abrindo o .mcworld', level: 'Lendo level.dat', db: 'Indexando o banco LevelDB', players: 'Decodificando jogadores', done: 'Montando o resumo' };
const ACCEPTED = /\.(mcworld|zip)$/i;

// The comparison survives page changes while the same world stays open (memory only, never stored).
let kept = null;

const signed = n => (n > 0 ? `+${fmt(n)}` : fmt(n));
const tone = n => (n > 0 ? 'gain' : n < 0 ? 'loss' : '');

/** {k: n} maps → [[k, before, after, delta]] with a non-zero delta, biggest changes first. */
function diffMaps(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out = [];
  for (const k of keys) {
    const a = before[k] || 0, b = after[k] || 0;
    if (a !== b) out.push([k, a, b, b - a]);
  }
  return out.sort((x, y) => Math.abs(y[3]) - Math.abs(x[3]));
}

const addMaps = (...maps) => {
  const out = {};
  for (const m of maps) for (const [k, n] of Object.entries(m || {})) out[k] = (out[k] || 0) + n;
  return out;
};

function chunkDiff(before, after) {
  const out = {};
  for (const d of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const set = arr => { const s = new Set(); for (let i = 0; i < (arr?.length || 0); i += 2) s.add(`${arr[i]},${arr[i + 1]}`); return s; };
    const a = set(before[d]), b = set(after[d]);
    let added = 0, removed = 0;
    for (const k of b) if (!a.has(k)) added++;
    for (const k of a) if (!b.has(k)) removed++;
    out[d] = { before: a.size, after: b.size, added, removed };
  }
  return out;
}

function containerDiff(before, after) {
  const key = c => `${c.dimension}:${c.position.join(',')}`;
  const a = new Map(before.map(c => [key(c), c])), b = new Map(after.map(c => [key(c), c]));
  const out = [];
  for (const [k, c] of b) {
    const old = a.get(k);
    const changes = diffMaps(old?.totals, c.totals);
    if (!old) out.push({ c, state: 'new', changes });
    else if (changes.length) out.push({ c, state: 'changed', changes });
  }
  for (const [k, c] of a) if (!b.has(k)) out.push({ c, state: 'gone', changes: diffMaps(c.totals, {}) });
  const weight = r => r.changes.reduce((s, ch) => s + Math.abs(ch[3]), 0);
  return out.sort((x, y) => weight(y) - weight(x));
}

function buildDiff(A, B) {
  // older save first
  const [before, after] = (Date.parse(A.lastPlayed) || 0) <= (Date.parse(B.lastPlayed) || 0) ? [A, B] : [B, A];
  const players = [];
  const keys = new Set([...before.players.map(p => p.key), ...after.players.map(p => p.key)]);
  for (const k of keys) {
    const p0 = before.players.find(p => p.key === k), p1 = after.players.find(p => p.key === k);
    players.push({
      key: k, before: p0, after: p1,
      items: diffMaps(addMaps(p0?.itemTotals, p0?.enderChestTotals), addMaps(p1?.itemTotals, p1?.enderChestTotals)),
    });
  }
  return {
    before, after,
    chunks: chunkDiff(before.chunks, after.chunks),
    players,
    items: diffMaps(before.items, after.items),
    entities: diffMaps(before.entities, after.entities),
    blockEntities: diffMaps(before.blockEntities, after.blockEntities),
    containers: containerDiff(before.containers, after.containers),
    treasures: TREASURES.map(t => ({ ...t, before: treasureCount(t, before.items), after: treasureCount(t, after.items) })).filter(t => t.before || t.after),
  };
}

function ChangeChips({ changes, limit = 8 }) {
  return (
    <div className="diff-chips">
      {changes.slice(0, limit).map(([id, , , d]) => (
        <span key={id} className={`diff-chip ${tone(d)}`} title={`${prettyName(id)}: ${signed(d)}`}>
          <ItemIcon id={id} size={18} /> {signed(d)}
        </span>
      ))}
      {changes.length > limit && <small className="muted">+{changes.length - limit}</small>}
    </div>
  );
}

function DiffList({ rows, icon, label, limit = 30, empty }) {
  const [side, setSide] = useState('gain');
  const shown = rows.filter(r => (side === 'gain' ? r[3] > 0 : r[3] < 0)).slice(0, limit);
  const gains = rows.filter(r => r[3] > 0).length, losses = rows.length - gains;
  return (
    <>
      <div className="toolbar"><Tabs value={side} onChange={setSide} items={[{ value: 'gain', label: 'Aumentou', count: gains }, { value: 'loss', label: 'Diminuiu', count: losses }]} /></div>
      {shown.length === 0 ? <Empty text={empty} /> : (
        <div className="table-wrap short">
          <table className="table">
            <thead><tr><th /><th>{label}</th><th className="num">Antes</th><th className="num">Depois</th><th className="num">Diferença</th></tr></thead>
            <tbody>
              {shown.map(([k, a, b, d]) => (
                <tr key={k}>
                  <td className="cell-icon">{icon(k)}</td>
                  <td><strong>{k.includes(':') ? (icon === mobIcon ? mobName(k) : prettyName(k)) : blockEntityLabel(k, CONTAINER_LABEL)}</strong></td>
                  <td className="num">{fmt(a)}</td>
                  <td className="num">{fmt(b)}</td>
                  <td className={`num ${tone(d)}`}><strong>{signed(d)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
const itemIcon = id => <ItemIcon id={id} size={24} />;
const mobIcon = id => <MobIcon id={id} size={24} />;

function Picker({ onPick, busy, progress, error }) {
  const ref = useRef();
  const [over, setOver] = useState(false);
  const take = f => { if (f && ACCEPTED.test(f.name)) onPick(f); };
  return (
    <Panel>
      <div
        className={`compare-drop${over ? ' over' : ''}`}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      >
        {busy ? (
          <>
            <Loader2 size={30} className="spin" />
            <strong>{STEP_LABEL[progress?.step] || 'Abrindo o outro save…'}</strong>
            <small className="muted">{progress?.detail || 'O outro mundo é lido num processo separado; o mundo aberto continua como está.'}</small>
          </>
        ) : (
          <>
            <GitCompare size={30} />
            <strong>Escolha outro save do mesmo mundo</strong>
            <small className="muted">Por exemplo, um backup antigo. Arraste o .mcworld aqui ou escolha o arquivo. Nada é enviado nem guardado.</small>
            <button type="button" className="btn btn-primary" onClick={() => ref.current.click()}><UploadCloud size={15} /> Escolher .mcworld</button>
          </>
        )}
        <input ref={ref} type="file" accept=".mcworld,.zip" hidden onChange={e => { take(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {error && <ErrorBox error={error} />}
    </Panel>
  );
}

export default function Compare({ world, go }) {
  const owner = `${world?.file}|${world?.label}`;
  const [state, setState] = useState(() => (kept?.owner === owner ? kept.state : { phase: 'idle' }));
  const [progress, setProgress] = useState(null);
  useEffect(() => compare.onProgress(setProgress), []);
  useEffect(() => { kept = { owner, state }; }, [owner, state]);

  async function pick(file) {
    setState({ phase: 'loading' });
    setProgress(null);
    try {
      await compare.call('open', { file });
      const [A, B] = await Promise.all([call('snapshot'), compare.call('snapshot')]);
      setState({ phase: 'ready', file: file.name, diff: buildDiff({ ...A, label: world?.file || world?.label }, { ...B, label: file.name }) });
    } catch (e) {
      compare.terminate();
      setState({ phase: 'idle', error: e });
    }
  }
  const close = () => { compare.terminate(); setState({ phase: 'idle' }); };

  return (
    <div className="page">
      <PageHeader
        icon={GitCompare}
        title="Comparar saves"
        subtitle="Abra outro save do mesmo mundo (um backup antigo, por exemplo) e veja o que mudou: exploração, itens, mobs e baús."
        actions={state.phase === 'ready' && <button type="button" className="btn" onClick={close}><X size={15} /> Fechar comparação</button>}
      />
      {state.phase !== 'ready'
        ? <Picker onPick={pick} busy={state.phase === 'loading'} progress={progress} error={state.error} />
        : <Result D={state.diff} go={go} />}
    </div>
  );
}

function Result({ D, go }) {
  const { before, after } = D;
  const names = playerNames(after.players.length >= before.players.length ? after.players : before.players);
  const dims = sortDims(Object.keys(D.chunks));
  const newChunks = dims.reduce((s, d) => s + D.chunks[d].added, 0);
  const days = after.daysPlayed - before.daysPlayed;
  const hours = after.playHours - before.playHours;
  return (
    <>
      <div className="compare-sides">
        <div className="compare-side"><Badge>antes</Badge><strong>{before.label}</strong><small className="muted">{before.name} · jogado em {timeAgo(before.lastPlayed)}</small></div>
        <ArrowRight size={18} className="muted" />
        <div className="compare-side"><Badge tone="green">depois</Badge><strong>{after.label}</strong><small className="muted">{after.name} · jogado em {timeAgo(after.lastPlayed)}</small></div>
      </div>
      {before.name !== after.name && <div className="note"><Info size={15} /><span>Os dois saves têm nomes diferentes (<b>{before.name}</b> e <b>{after.name}</b>). A comparação só faz sentido entre versões do mesmo mundo.</span></div>}
      <div className="stats-grid four">
        <StatCard icon={CalendarDays} label="Dias no jogo" value={signed(days)} sub={`${fmt(before.daysPlayed)} → ${fmt(after.daysPlayed)}`} tone="gold" />
        <StatCard icon={Clock} label="Tempo de jogo" value={`${hours >= 0 ? '+' : ''}${fmt(Math.round(hours))} h`} sub="com o mundo aberto" tone="blue" />
        <StatCard icon={Mountain} label="Chunks novos" value={signed(newChunks)} sub={dims.map(d => `${DIM_LABEL[d]} ${signed(D.chunks[d].added)}`).join(' · ')} tone="teal" />
        <StatCard icon={Archive} label="Containers alterados" value={fmt(D.containers.length)} sub={`${D.containers.filter(c => c.state === 'new').length} novos · ${D.containers.filter(c => c.state === 'gone').length} sumiram`} tone="orange" />
      </div>

      {D.treasures.length > 0 && (
        <Panel title="Tesouros" icon={Gem}>
          <div className="treasures">
            {D.treasures.map(t => {
              const d = t.after - t.before;
              return (
                <div key={t.key} className="treasure">
                  <ItemIcon id={t.icon} size={34} enchanted={t.key === 'books'} />
                  <div>
                    <strong className={tone(d)}>{d ? signed(d) : '='}</strong>
                    <small>{t.label}: {fmt(t.before)} → {fmt(t.after)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="grid-2">
        <Panel title="Exploração" icon={Mountain}>
          <div className="dim-bars">
            {dims.map(d => {
              const c = D.chunks[d];
              return (
                <div key={d} className="dim-bar">
                  <div className="dim-bar-head"><span className="dot" style={{ background: DIM_COLOR[d] }} />{DIM_LABEL[d] || d}<b>{fmt(c.before)} → {fmt(c.after)}</b></div>
                  <div className="track"><span style={{ width: `${c.after ? (100 * (c.after - c.added)) / c.after : 0}%`, background: DIM_COLOR[d], opacity: 0.45 }} /></div>
                  <small>{signed(c.added)} chunks novos{c.removed ? ` · ${fmt(c.removed)} chunks a menos (apagados ou resetados)` : ''}</small>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Jogadores" icon={Users}>
          <div className="compare-players">
            {D.players.map(p => {
              const lv0 = p.before?.xp?.level, lv1 = p.after?.xp?.level;
              return (
                <div key={p.key} className="compare-player">
                  <div className="compare-player-head">
                    <strong>{names.get(p.key) || p.key}</strong>
                    {!p.before && <Badge tone="green">novo</Badge>}
                    {!p.after && <Badge tone="red">não está no save mais novo</Badge>}
                    {p.before && p.after && <small className="muted">XP {fmt(lv0)} → {fmt(lv1)}</small>}
                    {p.after?.hasDiedBefore && !p.before?.hasDiedBefore && <Badge tone="red">morreu</Badge>}
                  </div>
                  {p.items.length ? <ChangeChips changes={p.items} limit={10} /> : <small className="muted">Inventário igual</small>}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Itens no mundo" icon={Backpack}>
          <DiffList rows={D.items} icon={itemIcon} label="Item" empty="Nenhuma mudança" />
        </Panel>
        <Panel title="Mobs e entidades" icon={PawPrint}>
          <DiffList rows={D.entities} icon={mobIcon} label="Tipo" empty="Nenhuma mudança" />
        </Panel>
      </div>

      <Panel title="Baús e containers que mudaram" icon={Archive} actions={<small className="muted">do que mais mudou ao que menos mudou</small>}>
        {D.containers.length === 0 ? <Empty text="Nenhum container mudou" /> : (
          <div className="table-wrap short">
            <table className="table">
              <thead><tr><th>Container</th><th>Situação</th><th>Mudanças</th><th>Coordenadas</th></tr></thead>
              <tbody>
                {D.containers.slice(0, 150).map((r, i) => (
                  <tr key={i}>
                    <td>{r.c.customName ? <><strong><McText text={r.c.customName} /></strong> <small className="muted">{CONTAINER_LABEL[r.c.id] || r.c.id}</small></> : <strong>{CONTAINER_LABEL[r.c.id] || r.c.id}</strong>}</td>
                    <td>{r.state === 'new' ? <Badge tone="green">novo</Badge> : r.state === 'gone' ? <Badge tone="red">sumiu</Badge> : <Badge tone="blue">alterado</Badge>}</td>
                    <td>{r.changes.length ? <ChangeChips changes={r.changes} /> : <small className="muted">vazio</small>}</td>
                    <td className="nowrap"><CoordLink go={go} dim={r.c.dimension} position={r.c.position} label={CONTAINER_LABEL[r.c.id] || r.c.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {D.containers.length > 150 && <small className="muted">Mostrando 150 de {fmt(D.containers.length)}.</small>}
      </Panel>

      <Panel title="Blocos especiais" icon={Archive}>
        <DiffList rows={D.blockEntities} icon={() => <Archive size={16} />} label="Bloco" empty="Nenhuma mudança" />
      </Panel>
    </>
  );
}
