import { useState } from 'react';
import { Database, Download, FileJson, Search } from 'lucide-react';
import { useQuery, call } from '../client.js';
import { Panel, Async, PageHeader, SearchInput, ErrorBox, Loading } from '../components/ui.jsx';
import { fmt, fmtCompact, downloadJson } from '../format.js';

const EXPORTS = [
  ['summary', 'Resumo'], ['players', 'Jogadores'], ['entities', 'Entidades'], ['containers', 'Containers'],
  ['items', 'Totais de itens'], ['misc', 'Vilas, mapas e mais'], ['biomes', 'Biomas'], ['blocks', 'Censo de blocos'], ['keys', 'Índice do banco'],
];

const EXAMPLES = ['~local_player', 'scoreboard', 'portals', 'mobevents', 'TheEnd', 'AutonomousEntities', 'BiomeData', 'schedulerWT'];

function RawExplorer() {
  const [q, setQ] = useState('');
  const [state, setState] = useState(null);
  const run = async key => {
    if (!key) return;
    setState({ loading: true });
    try { setState({ data: await call('raw', { key }), key }); } catch (e) { setState({ error: e }); }
  };
  return (
    <Panel title="Explorador NBT" icon={Search}>
      <p className="muted">Lê qualquer chave do banco LevelDB e mostra o NBT completo, sem tratamento. Chaves binárias: <code>hex:…</code></p>
      <SearchInput value={q} onChange={setQ} onSubmit={run} placeholder="Chave (ex.: ~local_player, map_-12884900043, player_server_…)" />
      <div className="quick">{EXAMPLES.map(k => <button type="button" key={k} className="chip" onClick={() => { setQ(k); run(k); }}>{k}</button>)}</div>
      {state?.loading && <Loading text="Lendo…" />}
      {state?.error && <ErrorBox error={state.error} />}
      {state?.data && (
        <>
          <div className="toolbar"><button type="button" className="btn btn-sm" onClick={() => downloadJson(`${state.key}.json`, state.data)}><Download size={14} /> Baixar JSON</button></div>
          <pre className="code">{JSON.stringify(state.data, null, 2).slice(0, 200000)}</pre>
        </>
      )}
    </Panel>
  );
}

export default function Advanced({ world }) {
  const keys = useQuery('keys');
  const [busy, setBusy] = useState(null);
  const exportOne = async (what, label) => {
    setBusy(label);
    try { downloadJson(`${(world.label || 'mundo').replace(/[^\w-]+/g, '_')}-${what}.json`, await call(what)); } finally { setBusy(null); }
  };
  return (
    <div className="page">
      <PageHeader title="Avançado" subtitle="Dados brutos: exportação em JSON, índice do banco de dados e leitura direta de qualquer registro NBT." />
      <Panel title="Exportar em JSON" icon={FileJson}>
        <div className="export-grid">
          {EXPORTS.map(([w, label]) => (
            <button type="button" key={w} className="btn" disabled={!!busy} onClick={() => exportOne(w, label)}><Download size={15} /> {label}</button>
          ))}
        </div>
        {busy && <Loading text={`Gerando ${busy}…`} />}
      </Panel>
      <RawExplorer />
      <Panel title="Índice do banco LevelDB" icon={Database} pad={false}>
        <Async state={keys} loadingText="Indexando chaves…">
          {K => (
            <>
              <p className="muted panel-body">{fmt(K.totalKeys)} chaves · {fmtCompact(K.totalValueBytes)} bytes · {K.leveldb.tables} tabelas, {K.leveldb.logs} logs · {fmt(K.leveldb.deletions)} remoções</p>
              <table className="table">
                <thead><tr><th>Categoria</th><th>Registros</th><th>Tamanho</th></tr></thead>
                <tbody>{Object.entries(K.categories).map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td>{fmt(v.count)}</td><td>{fmtCompact(v.bytes)} B</td></tr>)}</tbody>
              </table>
            </>
          )}
        </Async>
      </Panel>
    </div>
  );
}
