// Warns before a reload throws away the world loaded in memory.
// F5 / Ctrl+R / Cmd+R are intercepted and answered with our own dialog; browsers only allow their
// native, unstyled prompt for the reload button and tab close, so that stays as the fallback.
import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Compass } from 'lucide-react';

const isReloadKey = e => e.key === 'F5' || ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'r');

export default function ReloadGuard({ worldName }) {
  const [open, setOpen] = useState(false);
  const allow = useRef(false);
  const stayRef = useRef();

  useEffect(() => {
    const onKey = e => {
      if (!isReloadKey(e)) return;
      e.preventDefault();
      setOpen(true);
    };
    const onBeforeUnload = e => {
      if (allow.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    stayRef.current?.focus();
    const onEsc = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  if (!open) return null;

  const reload = () => {
    allow.current = true;
    window.location.reload();
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="reload-title" aria-describedby="reload-desc">
        <div className="modal-icon"><RefreshCw size={26} /></div>
        <h2 id="reload-title">Recarregar a página?</h2>
        <p id="reload-desc">
          O mundo <strong>{worldName}</strong> está aberto só na memória do navegador. Se recarregar, ele será fechado:
          você vai precisar escolher o arquivo <code>.mcworld</code> de novo e esperar a leitura.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-danger-ghost" onClick={reload}><RefreshCw size={15} /> Sim, recarregar</button>
          <button type="button" ref={stayRef} className="btn btn-primary" onClick={() => setOpen(false)}><Compass size={15} /> Continuar explorando</button>
        </div>
        <small className="modal-hint">Pressione <kbd>Esc</kbd> para voltar</small>
      </div>
    </div>
  );
}
