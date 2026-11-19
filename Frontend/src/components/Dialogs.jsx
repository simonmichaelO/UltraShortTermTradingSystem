import { useState } from 'react';
import { Bell, Check, CircleAlert, FlaskConical, Info, LockKeyhole, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { LIMITS, PRESETS, SYMBOL_BY_CODE, signedUsd, validateConfig } from '../services/preview-model.js';
import { Dialog, EmptyState, Pill, SymbolMark, SymbolSelect, Toggle } from './ui.jsx';
import { Side } from './Portfolio.jsx';

const FIELD_LABELS = {
  positionLimit: 'Position limit', tradeRisk: 'Risk per trade (%)', openRisk: 'Aggregate risk (%)', marginLimit: 'Margin use (%)',
};

function NumericField({ name, value, onChange, error }) {
  const id = `control-${name}`;
  return <div className="field">
    <label htmlFor={id}>{FIELD_LABELS[name]}</label>
    <input type="number" inputMode={name === 'positionLimit' ? 'numeric' : 'decimal'} value={value} onChange={event => onChange(event.target.value)}
      id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} step={name === 'positionLimit' ? '1' : 'any'} />
    {error && <small className="field-error" id={`${id}-error`}>{error}</small>}
  </div>;
}

export function ControlsDialog({ config, onApply, onClose, onEmergency }) {
  const [draft, setDraft] = useState(config);
  const [errors, setErrors] = useState({});
  const field = (name, value) => { setDraft(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: undefined })); };

  function submit(event) {
    event.preventDefault();
    const outcome = validateConfig(draft);
    if (!outcome.ok) { setErrors(outcome.errors); return; }
    onApply(outcome.value);
  }

  return <Dialog title="Trading controls" subtitle="Preview · changes stay in this browser" icon={SlidersHorizontal} onClose={onClose}>
    <form className="drawer-form" noValidate onSubmit={submit}>
      <div className="drawer-body controls-body">
        <div className="notice"><LockKeyhole size={17} /><span><strong>Live entries are locked</strong><small>The preview has no broker bridge or order connection.</small></span></div>
        <section className="control-section">
          <h3>Operating settings</h3>
          <div className="field"><label htmlFor="control-symbol">Active instrument</label><SymbolSelect id="control-symbol" label="Active instrument" value={draft.symbol} onChange={value => field('symbol', value)} />
            {errors.symbol && <small className="field-error">{errors.symbol}</small>}
          </div>
          <div className="control-switch"><div><strong>Shadow mode</strong><small>{draft.emergency ? 'Clear the preview stop first.' : 'Show the simulated operating mode.'}</small></div><Toggle name="Shadow mode" checked={draft.shadow} disabled={draft.emergency} onChange={value => field('shadow', value)} /></div>
        </section>
        <section className="control-section">
          <div className="control-heading"><h3>Trading intensity</h3><span className="number-chip">{draft.intensity}/100</span></div>
          <p>Adjust the preview setting or choose a preset. This does not run any strategy.</p>
          <div className="preset-group" role="group" aria-label="Intensity presets">
            {PRESETS.map(p => <button type="button" key={p.value} className={Number(draft.intensity) === p.value ? 'preset-selected' : ''}
              aria-pressed={Number(draft.intensity) === p.value} onClick={() => field('intensity', p.value)}>{p.label}</button>)}
          </div>
          <input className="intensity-slider" type="range" min="0" max="100" step="1" value={draft.intensity} style={{ '--range-percent': `${draft.intensity}%` }} aria-label="Custom intensity"
            onChange={event => field('intensity', Number(event.target.value))} />
          <div className="slider-endpoints"><span>0 · selective</span><span>100 · responsive</span></div>
          {errors.intensity && <small className="field-error">{errors.intensity}</small>}
        </section>
        <section className="control-section">
          <h3>Risk limits</h3><p>These ceilings are preserved, not recommended operating levels. Choose lower preview limits to try the form.</p>
          <div className="control-grid">{Object.keys(FIELD_LABELS).map(name => <NumericField key={name} name={name} value={draft[name]} onChange={value => field(name, value)} error={errors[name]} />)}</div>
          <div className="control-constants"><span>Daily drawdown: <strong>{LIMITS.dailyDrawdown}% from peak</strong></span><span>Daily target: <strong>+1,500% of day-open equity</strong></span></div>
        </section>
        <button type="button" className="btn btn-danger-outline stop-form-trigger" onClick={onEmergency}><ShieldAlert size={16} /> {draft.emergency ? 'Review preview stop' : 'Emergency stop preview'}</button>
      </div>
      <div className="dialog-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit"><Check size={16} /> Apply preview settings</button></div>
    </form>
  </Dialog>;
}

export function EmergencyDialog({ latched, onToggle, onClose }) {
  return <Dialog title={latched ? 'Clear preview stop?' : 'Test emergency stop?'} subtitle="Simulation only" type="modal" icon={ShieldAlert} onClose={onClose}>
    <div className="drawer-body modal-body">
      <p>{latched ? 'This clears the stop in the preview and restores your selected shadow or monitoring mode. It cannot arm live trading.' : 'This latches the preview into Emergency stop. It won’t cancel orders, close positions, or send commands to MT5.'}</p>
      <div className="notice notice-amber"><CircleAlert size={18} /><span><strong>No broker connected</strong><small>Sample positions remain visible and unchanged.</small></span></div>
    </div>
    <div className="dialog-actions"><button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
      <button className={`btn ${latched ? 'btn-primary' : 'btn-danger'}`} type="button" onClick={onToggle}>{latched ? 'Clear preview stop' : 'Apply preview stop'}</button></div>
  </Dialog>;
}

export function PositionDialog({ position, onClose }) {
  const instrument = SYMBOL_BY_CODE[position.symbol];
  const facts = [ ['Volume (lots)', position.volume.toFixed(2)], ['Entry', position.entry], ['Current quote', position.current], ['Stop loss', position.sl],
    ['Take profit', position.tp], ['Opened (UTC)', position.time], ['Duration', position.duration], ['Trailing status', position.trailing], ['Partial closes', 'None in sample'] ];
  return <Dialog title={`${position.symbol} position`} subtitle={`${position.id} · simulated fixture`} onClose={onClose} icon={FlaskConical}>
    <div className="drawer-body position-detail">
      <div className="detail-summary"><SymbolMark symbol={instrument} size="lg" /><div><strong>{position.symbol}</strong><small>{instrument.name}</small></div><Side side={position.side} /></div>
      <div className="detail-pnl"><span>Estimated net P/L</span><strong className={position.net < 0 ? 'text-negative' : 'text-positive'}>{signedUsd(position.net)}</strong></div>
      <dl className="value-list detail-values">{facts.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <section className="detail-rationale"><span className="label-caps">STRATEGY</span><h3>{position.strategy}</h3><p>{position.rationale}</p></section>
    </div>
  </Dialog>;
}

export function AlertsDialog({ alerts, unread, enabled, onRead, onClose }) {
  return <Dialog title="Notifications" subtitle="Preview examples and local interface events" onClose={onClose} icon={Bell}>
    <div className="drawer-body alert-body">
      {!enabled && <div className="notice"><Info size={17} /><span><strong>Dashboard indicators are off</strong><small>You can change this in Settings. The existing examples are still available.</small></span></div>}
      <div className="alerts-subheading"><Pill tone={unread ? 'lime' : 'neutral'}>{unread} unread</Pill><button className="btn btn-secondary btn-small" type="button" disabled={!unread} onClick={onRead}>Mark all read</button></div>
      {!alerts.length ? <EmptyState title="No alerts" message="Preview notices will appear here when available." /> : <ul className="alert-list">
        {alerts.map(alert => <li key={alert.id}><span className={`alert-dot status-${alert.tone}`} /><div><strong>{alert.title}</strong><p>{alert.summary}</p><time>{alert.time}</time></div></li>)}
      </ul>}
    </div>
  </Dialog>;
}
