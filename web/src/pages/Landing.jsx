import { useRef, useState, useEffect } from 'react';
import {
  UploadCloud, FolderOpen, ShieldCheck, Cpu, Map as MapIcon, Backpack, Check, Loader2, AlertTriangle, HelpCircle, ChevronDown,
} from 'lucide-react';
import { onProgress } from '../client.js';

const STEPS = [
  ['read', 'Lendo o arquivo'],
  ['unzip', 'Abrindo o .mcworld'],
  ['level', 'Lendo level.dat'],
  ['db', 'Indexando o banco LevelDB'],
  ['players', 'Decodificando jogadores'],
];

const ACCEPTED = /\.(mcworld|zip)$/i;

/** Faint blocks drifting up behind the landing: left %, size, colour, duration and phase. */
const CUBES = [
  [6, 18, '#5fd068', 26, 0], [14, 10, '#8b5a2b', 34, -12], [23, 14, '#4fb2d8', 30, -20], [33, 8, '#9aa3ad', 38, -6],
  [68, 12, '#f2c14e', 32, -16], [77, 20, '#5fd068', 28, -4], [86, 9, '#a78bfa', 36, -24], [94, 14, '#8b5a2b', 30, -10],
].map(([x, s, c, d, delay]) => ({ left: `${x}%`, '--s': `${s}px`, '--c': c, animationDuration: `${d}s`, animationDelay: `${delay}s` }));

/** Turns a <input webkitdirectory> FileList into the worker's { files, name } input. */
export function dirInput(list) {
  const files = [...(list || [])];
  if (!files.length) return null;
  const root = files[0].webkitRelativePath.split('/')[0];
  return { files: files.map(f => ({ path: f.webkitRelativePath.slice(root.length + 1), file: f })), name: root };
}

export default function Landing({ onOpen, busy, error }) {
  const fileRef = useRef();
  const dirRef = useRef();
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState({});
  const [localError, setLocalError] = useState(null);

  useEffect(() => onProgress(p => setProgress(prev => ({ ...prev, current: p.step, [p.step]: p.detail || true }))), []);
  useEffect(() => { if (busy) setProgress({}); }, [busy]);

  const pickFile = f => {
    if (!f) return;
    if (!ACCEPTED.test(f.name)) {
      setLocalError(`"${f.name}" não é um mundo exportado. Escolha um arquivo .mcworld (ou use "Abrir pasta do mundo").`);
      return;
    }
    setLocalError(null);
    onOpen({ file: f });
  };
  const pickDir = list => { const input = dirInput(list); if (input) onOpen(input); };

  // Accept drops anywhere on the page: a drop that misses the dropzone would otherwise make the
  // browser navigate to the file and leave the app.
  useEffect(() => {
    if (busy) return undefined;
    let depth = 0;
    const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
    const enter = e => { if (!hasFiles(e)) return; depth++; setDrag(true); };
    const leave = e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setDrag(false); };
    const over = e => { if (hasFiles(e)) e.preventDefault(); };
    const drop = e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDrag(false);
      pickFile(e.dataTransfer.files?.[0]);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIdx = STEPS.findIndex(([k]) => k === progress.current);
  const doneCount = progress.current === 'done' ? STEPS.length : Math.max(0, currentIdx);
  const shownError = localError || error;

  return (
    <div className={`landing${drag ? ' dragging' : ''}`}>
      <div className="landing-bg" aria-hidden="true" />
      <div className="landing-cubes" aria-hidden="true">{CUBES.map((c, i) => <span key={i} style={c} />)}</div>
      <div className="landing-inner">
        <div className="brand-big">
          <span className="brand-block" />
          <div>
            <h1>MCX</h1>
            <p>Bedrock World Explorer</p>
          </div>
        </div>
        <h2 className="landing-title">Descubra tudo o que existe <br className="wide-only" />no seu mundo Minecraft.</h2>
        <p className="landing-sub">
          Inventários, baús, mobs, pets, vilas, mapas, biomas e um mapa aéreo do mundo inteiro, lidos direto do arquivo <code>.mcworld</code>.
        </p>

        {!busy ? (
          <div
            className={`dropzone${drag ? ' drag' : ''}`}
            onClick={() => fileRef.current.click()}
            role="button"
            tabIndex={0}
            aria-label="Escolher arquivo .mcworld"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current.click(); } }}
          >
            <UploadCloud size={44} aria-hidden="true" />
            <strong className="pointer-only">{drag ? 'Solte para abrir o mundo' : 'Arraste seu arquivo .mcworld para cá'}</strong>
            <span className="pointer-only">ou clique para escolher</span>
            <strong className="touch-only">Escolha o arquivo .mcworld do seu mundo</strong>
            <div className="dropzone-actions" onClick={e => e.stopPropagation()}>
              <button type="button" className="btn btn-primary" onClick={() => fileRef.current.click()}><UploadCloud size={16} /> Escolher .mcworld</button>
              <button type="button" className="btn" onClick={() => dirRef.current.click()}><FolderOpen size={16} /> Abrir pasta do mundo</button>
            </div>
            <input ref={fileRef} type="file" accept=".mcworld,.zip" hidden onChange={e => { pickFile(e.target.files[0]); e.target.value = ''; }} />
            <input ref={dirRef} type="file" webkitdirectory="" directory="" hidden onChange={e => { pickDir(e.target.files); e.target.value = ''; }} />
          </div>
        ) : (
          <div className="progress-card" role="status" aria-live="polite">
            <h3><Loader2 className="spin" size={18} /> Abrindo o mundo…</h3>
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${(100 * (doneCount + 0.5)) / STEPS.length}%` }} /></div>
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
            <p className="progress-note">Mundos grandes podem levar alguns segundos. Nada sai do seu computador.</p>
          </div>
        )}

        {shownError && !busy && <div className="error-box" role="alert"><AlertTriangle size={18} /> {shownError}</div>}

        {!busy && (
          <details className="help">
            <summary><HelpCircle size={16} /> Onde encontro o arquivo do meu mundo? <ChevronDown size={16} className="help-chevron" /></summary>
            <div className="help-body">
              <div>
                <strong>Exportar pelo jogo (mais fácil)</strong>
                <ol>
                  <li>Em <b>Jogar</b>, clique no lápis ao lado do mundo.</li>
                  <li>Role até o fim das configurações e clique em <b>Exportar mundo</b>.</li>
                  <li>Salve o arquivo <code>.mcworld</code> e escolha-o aqui.</li>
                </ol>
              </div>
              <div>
                <strong>Abrir a pasta no Windows</strong>
                <p>Use <b>Abrir pasta do mundo</b> e escolha uma pasta dentro de <code>minecraftWorlds</code>:</p>
                <ul>
                  <li><code>%APPDATA%\Minecraft Bedrock\Users\…\games\com.mojang\minecraftWorlds</code></li>
                  <li className="muted">Versões antigas: <code>%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds</code></li>
                </ul>
                <p className="muted">Feche o mundo no jogo antes, para que tudo esteja salvo.</p>
              </div>
            </div>
          </details>
        )}

        <div className="features">
          <div><ShieldCheck size={20} /><strong>100% local</strong><span>O arquivo é processado no seu navegador. Nada é enviado para servidor nenhum.</span></div>
          <div><Backpack size={20} /><strong>Tudo do save</strong><span>Inventários, ender chests, baús, pets, aldeões e trocas, placas, scoreboard.</span></div>
          <div><MapIcon size={20} /><strong>Mapa aéreo</strong><span>Renderização do terreno com jogadores, portais, vilas e mortes marcados.</span></div>
          <div><Cpu size={20} /><strong>Sem instalação</strong><span>Leitor próprio de LevelDB e NBT rodando num Web Worker.</span></div>
        </div>
      </div>
      {!busy && (
        <section className="faq" aria-labelledby="faq-title">
          <h2 id="faq-title">Como funciona</h2>
          <div className="faq-steps">
            <div><span>1</span><strong>Exporte o mundo</strong><p>No Minecraft Bedrock, exporte o mundo como <code>.mcworld</code> ou escolha a pasta dele.</p></div>
            <div><span>2</span><strong>Abra aqui</strong><p>O arquivo é lido por este site dentro do seu navegador, como um programa instalado.</p></div>
            <div><span>3</span><strong>Explore</strong><p>Mapa, jogadores, baús, itens, mobs, vilas e biomas, com busca e links entre tudo.</p></div>
          </div>
          <div className="faq-list">
            <details>
              <summary>Meu mundo é enviado para algum servidor?</summary>
              <p>Não. O site só entrega o programa; a leitura do arquivo acontece no seu computador ou celular. Nada é enviado e nada fica guardado: ao fechar ou recarregar a página, o mundo some da memória.</p>
            </details>
            <details>
              <summary>Funciona com a Java Edition?</summary>
              <p>Não. O formato lido aqui é o do Bedrock (Windows, celular, consoles). Mundos da Java Edition usam outro formato.</p>
            </details>
            <details>
              <summary>Posso estragar meu mundo?</summary>
              <p>Não. O MCX só lê o arquivo, nunca escreve nele. Mesmo assim, feche o mundo no jogo antes de exportar para que tudo esteja salvo.</p>
            </details>
            <details>
              <summary>Por que não aparecem mobs mortos ou blocos minerados?</summary>
              <p>O Bedrock não guarda essas estatísticas dentro do mundo; elas ficam na conta. Só aparecem quando um add-on as registra no scoreboard, e nesse caso estão em “Vilas, mapas e mais”.</p>
            </details>
            <details>
              <summary>Funciona no celular?</summary>
              <p>Sim, inclusive o mapa com toque e pinça. Mundos muito grandes podem demorar mais para abrir em aparelhos com pouca memória.</p>
            </details>
          </div>
        </section>
      )}
      {drag && <div className="drop-overlay" aria-hidden="true"><UploadCloud size={56} /><strong>Solte o arquivo .mcworld</strong></div>}
    </div>
  );
}
