import { useEffect, useRef } from 'react';
import { ChevronDown, Inbox, X } from 'lucide-react';
import { SYMBOLS } from '../services/preview-model.js';

export function Pill({ children, tone = 'neutral', dot = false, className = '' }) {
  return <span className={`pill tone-${tone} ${className}`}>{dot && <span className="status-dot" />}{children}</span>;
}

export function SymbolMark({ symbol, size = 'sm' }) {
  return <span className={`symbol-mark mark-${symbol.theme} mark-${size}`} aria-hidden="true">{symbol.glyph}</span>;
}

export function SymbolSelect({ value, onChange, id, label = 'Instrument', allowAll = false, compact = false }) {
  return <span className={`select-wrap ${compact ? 'select-compact' : ''}`}>
    <select id={id} aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
      {allowAll && <option value="all">All instruments</option>}
      {SYMBOLS.map(symbol => <option value={symbol.code} key={symbol.code}>{symbol.code}</option>)}
    </select>
    <ChevronDown size={15} aria-hidden="true" />
  </span>;
}

export function PanelHeading({ title, description, action, id }) {
  return <div className="panel-heading">
    <div className="panel-heading-text"><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>
    {action}
  </div>;
}

export function EmptyState({ title, message }) {
  return <div className="empty-state"><span className="stat-icon"><Inbox size={18} /></span><strong>{title}</strong><p>{message}</p></div>;
}

export function Toggle({ name, checked, onChange, disabled = false }) {
  return <button type="button" role="switch" className={`toggle ${checked ? 'is-on' : ''}`} aria-label={name}
    aria-checked={checked} onClick={() => onChange(!checked)} disabled={disabled}><span /></button>;
}

export function Dialog({ title, subtitle, children, onClose, type = 'drawer', icon: Icon }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} className={`dialog dialog-${type}`} aria-label={title}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="dialog-inner">
      <div className="dialog-heading">
        {Icon && <span className="dialog-head-icon"><Icon size={20} /></span>}
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
      </div>
      {children}
    </div>
  </dialog>;
}
