import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, CircleDollarSign, Clock3, Crosshair,
  FlaskConical, Gauge, Layers3, LockKeyhole, ShieldCheck, Wallet, WifiOff } from 'lucide-react';
import { DECISIONS, SYMBOLS, SYMBOL_BY_CODE, previewMode, signedPercent, signedUsd, usd } from '../services/preview-model.js';
import { EmptyState, PanelHeading, Pill, SymbolMark } from './ui.jsx';
import { Sparkline } from './Charts.jsx';
import { WebStatusRow } from './WebStatus.jsx';

const equityTrend = [5, 7, 6, 10, 9, 13, 10, 16, 15, 20, 18, 23, 22, 26];
const profitTrend = [4, 6, 4, 9, 12, 10, 11, 8, 13, 16, 14, 19, 17, 22];

export function SimulationBanner() {
  return <div className="simulation-banner">
    <span className="simulation-icon"><FlaskConical size={17} strokeWidth={1.9} /></span>
    <div className="simulation-copy"><strong>Simulation preview</strong><span>Example data only. This dashboard cannot place orders.</span></div>
    <span className="simulation-right"><WifiOff size={14} /> MT5 disconnected</span>
  </div>;
}

function StatCard({ label, value, icon: Icon, iconTone, valueTone = '', children, indicator }) {
  return <section className="stat-card">
    <div className="stat-top"><span>{label}</span><span className={`stat-icon icon-${iconTone}`}><Icon size={17} strokeWidth={1.8} /></span></div>
    <strong className={`stat-value ${valueTone}`}>{value}</strong>
    <div className="stat-foot">{children}</div>
    {indicator && <div className="stat-indicator">{indicator}</div>}
  </section>;
}

const pnlTone = value => value < 0 ? 'text-negative' : value > 0 ? 'text-positive' : '';

export function AccountStats({ feed }) {
  const account = feed.snapshot?.account;
  if (!account) {
    const missing = feed.phase === 'checking' ? 'Waiting for sample' : 'Sample unavailable';
    const cards = [['Account equity', Wallet, 'lime'], ['Daily P/L', Activity, 'green'],
      ['Free margin', Layers3, 'blue'], ['Daily drawdown', ShieldCheck, 'amber']];
    return <div className="stats-grid" aria-label="Simulated account metrics">
      {cards.map(([label, icon, tone]) => <StatCard key={label} label={label} value="—" icon={icon} iconTone={tone}>{missing}</StatCard>)}
    </div>;
  }
  const daily = account.equity - account.openingEquity;
  const dailyPercent = 100 * daily / account.openingEquity;
  const dailyDrawdown = 100 * (1 - account.equity / account.peak);
  const marginPercent = account.equity > 0 ? 100 * account.usedMargin / account.equity : null;
  const changeTone = pnlTone(daily);
  const ChangeIcon = daily < 0 ? ArrowDownRight : ArrowUpRight;
  return <div className="stats-grid" aria-label={feed.phase === 'stale' ? 'Stale simulated account metrics' : 'Simulated account metrics'}>
    <StatCard label="Account equity" value={usd(account.equity)} icon={Wallet} iconTone="lime" indicator={<Sparkline points={equityTrend} />}>
      <span className={`stat-up ${changeTone}`}><ChangeIcon size={13} /> {signedPercent(dailyPercent)}</span><span>vs. day open</span>
    </StatCard>
    <StatCard label="Daily P/L" value={signedUsd(daily)} icon={Activity} iconTone="green" valueTone={changeTone} indicator={<Sparkline points={profitTrend} tone="green" />}>
      <span>Realised <span className="secondary-numeral">{signedUsd(account.realised)}</span></span>
    </StatCard>
    <StatCard label="Free margin" value={usd(account.freeMargin)} icon={Layers3} iconTone="blue">
      {marginPercent === null ? <span>Margin % unavailable</span> : <>
        <div className="margin-track" aria-hidden="true"><span style={{ width: `${Math.min(100, marginPercent)}%` }} /></div>
        <span className="used-margin">{marginPercent.toFixed(1)}% used</span>
      </>}
    </StatCard>
    <StatCard label="Daily drawdown" value={`${dailyDrawdown.toFixed(2)}%`} icon={ShieldCheck} iconTone="amber">
      <span>Equity peak <span className="secondary-numeral">{usd(account.peak)}</span></span>
    </StatCard>
  </div>;
}

export function EngineStatus({ config, webStatus, onControls }) {
  const instrument = SYMBOL_BY_CODE[config.symbol];
  return <section className="panel engine-panel" aria-labelledby="engine-heading">
    <PanelHeading id="engine-heading" title="Trading status" description="Terminal and execution overview" action={<Pill tone="neutral" dot>MT5 not connected</Pill>} />
    <div className="engine-content">
      <div className="small-section-heading"><span>ACTIVE INSTRUMENT</span><Crosshair size={13} /></div>
      <button type="button" className="active-instrument" onClick={onControls} aria-label={`Change active instrument, current ${instrument.code}`}>
        <SymbolMark symbol={instrument} size="lg" />
        <span className="active-copy"><strong>{instrument.code}</strong><small>{instrument.name}</small></span>
        <ChevronRight size={17} className="active-chevron" />
      </button>
      <div className="engine-mode"><span><span className="engine-label-icon"><FlaskConical size={15} /></span>Operating mode</span><Pill tone={config.emergency ? 'red' : config.shadow ? 'violet' : 'neutral'} dot>{previewMode(config)}</Pill></div>
      <div className="engine-mode engine-permission"><span><span className="engine-label-icon"><LockKeyhole size={15} /></span>Live entries</span><span className="permission-text">Locked</span></div>
      <WebStatusRow status={webStatus} />
      <div className="execution">
        <div className="small-section-heading"><span>EXECUTION SAMPLE</span><span className="execution-label">SIMULATED</span></div>
        <div className="execution-values">
          <div><span>Latency</span><strong>{instrument.latency}<small> ms</small></strong></div>
          <div><span>Spread</span><strong>{instrument.spread.toFixed(1)}<small> pips</small></strong></div>
          <div><span>Slippage</span><strong>{instrument.slippage.toFixed(1)}<small> pips</small></strong></div>
        </div>
      </div>
    </div>
  </section>;
}

export function PositionsPanel({ positions, phase, onPosition, expanded, filtered, action }) {
  const label = !positions ? (phase === 'checking' ? 'Waiting for the sample feed' : 'Sample feed unavailable')
    : phase === 'stale' ? 'Stale sample · not current · no broker orders' : 'Simulated positions · no broker orders';
  const net = positions ? positions.reduce((sum, p) => sum + Math.round(p.net * 100), 0) / 100 : null;
  return <section className="panel table-panel" aria-labelledby="positions-heading">
    <PanelHeading id="positions-heading" title={<>{expanded ? 'Position ledger' : 'Open positions'} {positions && <span className="count-tag">{positions.length}</span>}</>}
      description={label} action={action} />
    {positions?.length ? <div className="table-scroll" tabIndex={0} aria-label="Scrollable simulated positions table">
      <table className={`positions-table ${expanded ? 'expanded-table' : ''}`}>
        <thead><tr><th scope="col">Instrument</th><th scope="col">Side</th><th scope="col" className="num wide-detail">Lots</th><th scope="col" className="num wide-detail">Entry</th>
          {expanded && <th scope="col" className="num">Sample quote</th>}<th scope="col" className="num wide-detail">Stop loss</th><th scope="col" className="num">Net P/L</th>
          {expanded && <th scope="col">Duration</th>}<th scope="col" className="table-chevron"><span className="sr-only">Details</span></th></tr></thead>
        <tbody>{positions.map(p => <tr key={p.id}>
          <td><button type="button" className="symbol-link" onClick={() => onPosition(p)} aria-label={`Review ${p.symbol} sample position`}><SymbolMark symbol={SYMBOL_BY_CODE[p.symbol]} /><strong>{p.symbol}</strong></button></td>
          <td><Side side={p.side} /></td><td className="num wide-detail">{p.volume.toFixed(2)}</td><td className="num wide-detail">{p.entry}</td>
          {expanded && <td className="num">{p.current}</td>}<td className="num wide-detail">{p.sl}</td><td className={`num pnl-cell ${p.net < 0 ? 'text-negative' : 'text-positive'}`}>{signedUsd(p.net)}</td>
          {expanded && <td className="mono muted">{p.duration}</td>}<td className="table-chevron"><button type="button" className="row-arrow" onClick={() => onPosition(p)} aria-label={`Details for ${p.id}`}><ChevronRight size={16} /></button></td>
        </tr>)}</tbody>
      </table>
    </div> : positions ? <EmptyState title={filtered ? 'No matching sample positions' : 'No sample positions'}
      message={filtered ? 'Try All instruments or a different symbol.' : 'The available sample was received and has no open positions.'} />
      : <EmptyState title={phase === 'checking' ? 'Checking for sample positions' : 'Sample positions unavailable'}
        message={phase === 'checking' ? 'Waiting for the first usable response.' : 'No position count can be shown without a sample.'} />}
    {!!positions?.length && <div className="table-footer"><span><span className="table-footer-dot" /> {positions.length} {positions.length === 1 ? 'position' : 'positions'}</span>
      <span>Estimated net <strong className={`mono ${pnlTone(net)}`}>{signedUsd(net)}</strong></span></div>}
  </section>;
}

export function Side({ side }) {
  const buy = side === 'BUY';
  const Icon = buy ? ArrowUpRight : ArrowDownRight;
  return <span className={`order-side ${buy ? 'side-buy' : 'side-sell'}`}><Icon size={12} strokeWidth={2.2} />{side}</span>;
}

export function Watchlist({ selected, onSelect }) {
  return <section className="panel watchlist-panel" aria-labelledby="watchlist-heading">
    <PanelHeading id="watchlist-heading" title="Market watch" description="Eight instruments · sample quotes" action={<span className="watchlist-icon"><Gauge size={17} /></span>} />
    <div className="watchlist-head" aria-hidden="true"><span>Instrument</span><span>Bid</span><span>Change</span></div>
    <ul className="watchlist">
      {SYMBOLS.map(symbol => <li key={symbol.code}>
        <button type="button" className={`watch-row ${selected === symbol.code ? 'watch-selected' : ''}`} onClick={() => onSelect(symbol.code)}
          aria-label={`Select ${symbol.code} for preview`} aria-pressed={selected === symbol.code} title={`Set ${symbol.code} as the active preview instrument`}>
          <span className="watch-symbol"><SymbolMark symbol={symbol} /><strong>{symbol.code}</strong></span>
          <span className="mono watch-price">{symbol.bid}</span>
          <span className={`mono watch-change ${symbol.change < 0 ? 'text-negative' : 'text-positive'}`}>{signedPercent(symbol.change)}</span>
        </button>
      </li>)}
    </ul>
    <div className="table-footer"><span><Clock3 size={13} /> Snapshot</span><span className="mono">14:30:32 UTC</span></div>
  </section>;
}

export function DecisionsPanel({ compact = false }) {
  return <section className="panel decisions-panel" aria-labelledby="decisions-heading">
    <PanelHeading id="decisions-heading" title="Recent decisions" description="Illustrative signal log" action={compact ? <a className="mini-link" href="#shadow">Shadow mode <ArrowRight size={15} /></a> : <Pill tone="violet">Sample</Pill>} />
    <ul className="decision-list">
      {DECISIONS.map(decision => <li key={decision.id}>
        <span className={`stat-icon icon-${decision.state === 'Rejected' ? 'amber' : 'violet'}`}>{decision.state === 'Rejected' ? <ShieldCheck size={16} /> : <FlaskConical size={16} />}</span>
        <span className="decision-main"><strong>{decision.title}</strong><small>{compact ? decision.symbol : decision.description}</small></span>
        <span className="decision-meta"><Pill tone={decision.state === 'Rejected' ? 'amber' : 'violet'}>{decision.state}</Pill><small className="mono">{decision.time} UTC</small></span>
      </li>)}
    </ul>
  </section>;
}

export function MetricList({ feed }) {
  const account = feed.snapshot?.account;
  const description = !account ? (feed.phase === 'checking' ? 'Waiting for sample' : 'Sample feed unavailable')
    : feed.phase === 'stale' ? 'Stale sample · example values in USD' : 'Simulated values in USD';
  return <section className="panel summary-panel" aria-labelledby="snapshot-heading">
    <PanelHeading id="snapshot-heading" title="Account snapshot" description={description} action={<CircleDollarSign size={19} className="muted" />} />
    <dl className="value-list">
      <div><dt>Balance</dt><dd>{account ? usd(account.balance) : '—'}</dd></div>
      <div><dt>Used margin</dt><dd>{account ? usd(account.usedMargin) : '—'}</dd></div>
      <div><dt>Floating P/L</dt><dd className={account ? pnlTone(account.floating) : ''}>{account ? signedUsd(account.floating) : '—'}</dd></div>
      <div><dt>Realised P/L</dt><dd className={account ? pnlTone(account.realised) : ''}>{account ? signedUsd(account.realised) : '—'}</dd></div>
    </dl>
  </section>;
}
