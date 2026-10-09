import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, AlertTriangle, Inbox, ChevronRight, MapPin, X, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { fmt, fmtCompact, pos, MAP_DIMS } from '../format.js';
import { useHashParam } from '../route.js';

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

/** Metric tile; with onClick it becomes a button that leads to the matching page. */
export function StatCard({ icon: Icon, label, value, sub, tone = 'green', onClick, action }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`stat tone-${tone}${onClick ? ' stat-link' : ''}`} onClick={onClick} title={action}>
      <div className="stat-icon">{Icon && <Icon size={20} />}</div>
      <div className="stat-text">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
      {onClick && <ChevronRight size={16} className="stat-go" aria-hidden="true" />}
    </Tag>
  );
}

/** Coordinates that open the map centred on them (plain text when there is no map for the dimension). */
export function CoordLink({ go, dim, position, label, children }) {
  const text = children ?? pos(position);
  if (!go || !position || !MAP_DIMS.has(dim)) return <code className="coord">{text}</code>;
  const open = e => {
    e.stopPropagation();
    go('map', { dim, x: Math.floor(position[0]), y: position[1] == null ? null : Math.round(position[1]), z: Math.floor(position[2]), label });
  };
  return (
    <button type="button" className="coord coord-link" onClick={open} title="Ver no mapa">
      <MapPin size={11} aria-hidden="true" />{text}
    </button>
  );
}

/**
 * Sortable table rows. `getters` maps a column key to a value getter (null/undefined sort last);
 * the active sort ("qty" or "-qty" for descending) lives in the URL. Returns [rows, header cell factory].
 */
export function useSort(rows, getters, fallback = '') {
  const [sort, setSort] = useHashParam('sort', fallback);
  const desc = sort.startsWith('-');
  const key = sort.replace(/^-/, '');
  const sorted = useMemo(() => {
    const get = getters[key];
    if (!get) return rows;
    return [...rows].sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
      const r = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb;
      return desc ? -r : r;
    });
  }, [rows, key, desc]); // eslint-disable-line react-hooks/exhaustive-deps
  const th = (k, label, { firstDesc = false, className = '' } = {}) => {
    const active = key === k;
    const next = active ? (desc ? k : `-${k}`) : firstDesc ? `-${k}` : k;
    return (
      <th className={className} aria-sort={active ? (desc ? 'descending' : 'ascending') : undefined}>
        <button type="button" className={`th-sort${active ? ' active' : ''}`} onClick={() => setSort(next)} title="Ordenar">
          {label}{active ? (desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />) : <ArrowUpDown size={12} className="th-idle" />}
        </button>
      </th>
    );
  };
  return [sorted, th];
}

/** Centered dialog: focuses the [data-autofocus] action, closes on Esc and backdrop click. */
export function Modal({ icon: Icon, title, children, actions, onClose, tone = 'gold' }) {
  const ref = useRef();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    ref.current?.querySelector('[data-autofocus]')?.focus();
    const onKey = e => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal modal-${tone}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {Icon && <div className="modal-icon"><Icon size={26} /></div>}
        <h2 id="modal-title">{title}</h2>
        {children}
        <div className="modal-actions">{actions}</div>
        <small className="modal-hint">Pressione <kbd>Esc</kbd> para voltar</small>
      </div>
    </div>
  );
}

/** Horizontal bars. rows: [{label, value, color?, icon?, hint?}] */
/** PieChart that uses CSS conic gradients */
export function PieChart({ data, total, format = fmtCompact, className = '' }) {
  if (!data?.length) return <Empty text="Nada aqui" />;
  const top = data.slice(0, 6); // max 6 slices for readability
  const others = data.slice(6).reduce((a, r) => a + r.value, 0);
  if (others > 0) top.push({ key: 'outros', label: 'Outros', value: others, color: '#444' });
  const sum = total ?? top.reduce((a, r) => a + r.value, 0);
  let acc = 0;
  const slices = top.map(r => {
    const start = acc;
    const pct = (r.value / sum) * 100;
    acc += pct;
    return `${r.color || 'var(--accent)'} ${start}% ${acc}%`;
  }).join(', ');
  return (
    <div className={`chart-panel-body ${className}`}>
      <div className="pie-chart" style={{ '--pie-slices': slices }}>
        <div className="pie-chart-inner">
          <b>{format(sum)}</b>
          <small>Total</small>
        </div>
      </div>
      <div className="chart-legend">
        {top.map(r => (
          <div key={r.key} className="legend-item">
            <span className="dot" style={{ background: r.color || 'var(--accent)' }} />
            <span>{r.label}</span>
            <b>{format(r.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarList({ rows, max, limit = 12, format = fmtCompact, onSelect, empty = 'Nada aqui' }) {
  const [all, setAll] = useState(false);
  if (!rows?.length) return <Empty text={empty} />;
  const top = max ?? Math.max(...rows.map(r => r.value));
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <div className="barlist">
      {shown.map(r => (
        <button type="button" key={r.key ?? r.label} className={`bar-row${onSelect ? ' clickable' : ''}${r.active ? ' active' : ''}`} onClick={onSelect ? () => onSelect(r) : undefined} tabIndex={onSelect ? undefined : -1} title={r.hint || `${r.label}: ${fmt(r.value)}`}>
          <span className="bar-fill" style={{ width: `${Math.max(1.5, (100 * r.value) / top)}%`, '--c': r.color || 'var(--accent)' }} />
          <span className="bar-label">{r.icon}<span className="bar-text">{r.label}</span></span>
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

export function Tabs({ value, onChange, items, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map(it => (
        <button type="button" role="tab" key={it.value} aria-selected={value === it.value} className={value === it.value ? 'active' : ''} onClick={() => onChange(it.value)} style={it.color ? { '--tab-c': it.color } : undefined}>
          {it.color && !it.icon && <span className="dot" style={{ background: it.color }} />}
          {it.icon}{it.label}{it.count != null && <span className="tab-count">{fmtCompact(it.count)}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, onSubmit, autoFocus, label, inputRef }) {
  return (
    <form className="search" role="search" onSubmit={e => { e.preventDefault(); onSubmit?.(value); }}>
      <Search size={16} aria-hidden="true" />
      <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label || placeholder} autoFocus={autoFocus} spellCheck={false} />
      {value && <button type="button" className="icon-x" onClick={() => onChange('')} aria-label="Limpar busca"><X size={13} /></button>}
      {onSubmit && <button type="submit" className="btn btn-primary btn-sm">Buscar</button>}
    </form>
  );
}

export function Loading({ text = 'Processando…', sub }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <Loader2 className="spin" size={28} />
      <span>{text}</span>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function ErrorBox({ error }) {
  return (
    <div className="error-box" role="alert"><AlertTriangle size={18} /> {error?.message || String(error)}</div>
  );
}

export function Empty({ text = 'Nada encontrado', children }) {
  return <div className="empty" role="status"><Inbox size={22} /> <span>{text}</span>{children}</div>;
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
