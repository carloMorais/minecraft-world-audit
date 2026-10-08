import { useRef, useState, useEffect } from 'react';
import { UploadCloud, FolderOpen, ShieldCheck, Cpu, Map as MapIcon, Backpack, Check, Loader2, AlertTriangle } from 'lucide-react';
import { onProgress } from '../client.js';

const STEPS = [
  ['read', 'Lendo o arquivo'],
  ['unzip', 'Abrindo o .mcworld'],
  ['level', 'Lendo level.dat'],
  ['db', 'Indexando o banco LevelDB'],
  ['players', 'Decodificando jogadores'],
  ['entities', 'Carregando entidades'],
  ['blockEntities', 'Carregando baús e blocos especiais'],
];

export default function Landing({ onOpen, busy, error }) {
  const fileRef = useRef();
  const dirRef = useRef();
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState({});

  useEffect(() => onProgress(p => setProgress(prev => ({ ...prev, current: p.step, [p.step]: p.detail || true }))), []);
  useEffect(() => { if (busy) setProgress({}); }, [busy]);

  const pickFile = f => f && onOpen({ file: f });
  const pickDir = list => {
    const files = [...list];
    if (!files.length) return;
    const root = files[0].webkitRelativePath.split('/')[0];
    onOpen({ files: files.map(f => ({ path: f.webkitRelativePath.slice(root.length + 1), file: f })), name: root });
  };

  const onDrop = e => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const currentIdx = STEPS.findIndex(([k]) => k === progress.current);

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />
      <div className="landing-inner">
        <div className="brand-big">
          <span className="brand-block" />
          <div>
            <h1>MCX</h1>
            <p>Bedrock World Explorer</p>
          </div>
        </div>
        <h2 className="landing-title">Descubra tudo o que existe<br />no seu mundo Minecraft.</h2>
        <p className="landing-sub">
          Inventários, baús, mobs, pets, vilas, mapas, biomas e um mapa aéreo do mundo inteiro, lidos direto do arquivo <code>.mcworld</code>.
        </p>

        {!busy ? (
          <div
            className={`dropzone${drag ? ' drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current.click()}
          >
            <UploadCloud size={44} />
            <strong>Arraste seu arquivo .mcworld aqui</strong>
            <span>ou clique para escolher</span>
            <div className="dropzone-actions" onClick={e => e.stopPropagation()}>
              <button type="button" className="btn btn-primary" onClick={() => fileRef.current.click()}><UploadCloud size={16} /> Escolher .mcworld</button>
              <button type="button" className="btn" onClick={() => dirRef.current.click()}><FolderOpen size={16} /> Abrir pasta do mundo</button>
            </div>
            <input ref={fileRef} type="file" accept=".mcworld,.zip" hidden onChange={e => pickFile(e.target.files[0])} />
            <input ref={dirRef} type="file" webkitdirectory="" directory="" hidden onChange={e => pickDir(e.target.files)} />
          </div>
        ) : (
          <div className="progress-card">
            <h3><Loader2 className="spin" size={18} /> Abrindo o mundo…</h3>
            <ol>
              {STEPS.map(([k, label], i) => {
                const state = i < currentIdx || progress.current === 'done' ? 'done' : i === currentIdx ? 'active' : 'todo';
                return (
                  <li key={k} className={state}>
                    <span className="step-dot">{state === 'done' ? <Check size={12} /> : state === 'active' ? <Loader2 size={12} className="spin" /> : null}</span>
                    {label}
                    {typeof progress[k] === 'string' && <small>{progress[k]}</small>}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {error && <div className="error-box"><AlertTriangle size={18} /> {error}</div>}

        <div className="features">
          <div><ShieldCheck size={20} /><strong>100% local</strong><span>O arquivo é processado no seu navegador. Nada é enviado para servidor nenhum.</span></div>
          <div><Backpack size={20} /><strong>Tudo do save</strong><span>Inventários, ender chests, baús, pets, aldeões e trocas, placas, scoreboard.</span></div>
          <div><MapIcon size={20} /><strong>Mapa aéreo</strong><span>Renderização do terreno com jogadores, portais, vilas e mortes marcados.</span></div>
          <div><Cpu size={20} /><strong>Sem instalação</strong><span>Leitor próprio de LevelDB e NBT rodando num Web Worker.</span></div>
        </div>
      </div>
    </div>
  );
}
