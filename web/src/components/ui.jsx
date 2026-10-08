import { useState } from 'react';
import { Search, Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { fmt, fmtCompact } from '../format.js';

export function Panel({ title, icon: Icon, actions, children, className = '', pad = true }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          {title && <h3>{Icon && <Icon size={16} />}{title}</h3>}
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'panel-body' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'green' }) {
  return (
    <div className={`stat tone-${tone}`}>
      <div className="stat-icon">{Icon && <Icon size={20} />}</div>
      <div className="stat-text">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

/** Horizontal bars. rows: [{label, value, color?, icon?, hint?}] */
export function BarList({ rows, max, limit = 12, format = fmtCompact, onSelect, empty = 'Nada aqui' }) {
  const [all, setAll] = useState(false);
  if (!rows?.length) return <Empty text={empty} />;
  const top = max ?? Math.max(...rows.map(r => r.value));
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <div className="barlist">
      {shown.map(r => (
        <button type="button" key={r.key ?? r.label} className={`bar-row${onSelect ? ' clickable' : ''}`} onClick={onSelect ? () => onSelect(r) : undefined} title={r.hint || `${r.label}: ${fmt(r.value)}`}>
          <span className="bar-fill" style={{ width: `${Math.max(1.5, (100 * r.value) / top)}%`, '--c': r.color || 'var(--accent)' }} />
          <span className="bar-label">{r.icon}{r.label}</span>
          <span className="bar-value">{format(r.value)}</span>
        </button>
      ))}
      {rows.length > limit && (
        <button type="button" className="link-btn" onClick={() => setAll(!all)}>
          {all ? 'Mostrar menos' : `Mostrar todos (${rows.length})`}
        </button>
      )}
    </div>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(it => (
        <button type="button" role="tab" key={it.value} aria-selected={value === it.value} className={value === it.value ? 'active' : ''} onClick={() => onChange(it.value)} style={it.color ? { '--tab-c': it.color } : undefined}>
          {it.icon}{it.label}{it.count != null && <span className="tab-count">{fmtCompact(it.count)}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, onSubmit, autoFocus }) {
  return (
    <form className="search" onSubmit={e => { e.preventDefault(); onSubmit?.(value); }}>
      <Search size={16} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} spellCheck={false} />
      {onSubmit && <button type="submit" className="btn btn-primary btn-sm">Buscar</button>}
    </form>
  );
}

export function Loading({ text = 'Processando…', sub }) {
  return (
    <div className="loading">
      <Loader2 className="spin" size={28} />
      <span>{text}</span>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function ErrorBox({ error }) {
  return (
    <div className="error-box"><AlertTriangle size={18} /> {error?.message || String(error)}</div>
  );
}

export function Empty({ text = 'Nada encontrado' }) {
  return <div className="empty"><Inbox size={22} /> {text}</div>;
}

export function Badge({ children, tone = 'neutral', title }) {
  return <span className={`badge badge-${tone}`} title={title}>{children}</span>;
}

/** Renders the {loading,error,data} state of useQuery. */
export function Async({ state, children, loadingText, loadingSub }) {
  if (state.error) return <ErrorBox error={state.error} />;
  if (state.loading || state.data === undefined) return <Loading text={loadingText} sub={loadingSub} />;
  return children(state.data);
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
