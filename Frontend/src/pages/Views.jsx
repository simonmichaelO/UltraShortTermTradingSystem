import { useState } from 'react';
import { ArrowRight, CalendarDays, Download, FlaskConical, Link2Off, LockKeyhole, Settings2, SlidersHorizontal } from 'lucide-react';
import { ACCOUNT, HISTORY, LIMITS, POSITIONS, SAMPLE_DATE, SYMBOLS, SYMBOL_BY_CODE,
  filterBySymbol, historyCsv, previewMode, signedUsd, usd } from '../services/preview-model.js';
import { AccountStats, DecisionsPanel, EngineStatus, MetricList, PositionsPanel, Side, Watchlist } from '../components/Portfolio.jsx';
import { EquityChart } from '../components/Charts.jsx';
import { EmptyState, PanelHeading, Pill, SymbolMark, SymbolSelect, Toggle } from '../components/ui.jsx';

export function PageHero({ title, description, eyebrow = 'TRADING DESK', action }) {
  return <div className="page-hero">
    <div><div className="hero-eyebrow"><span /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {action && <div className="page-actions">{action}</div>}
  </div>;
}

export function ControlsButton({ onClick }) {
  return <button type="button" className="btn btn-primary" onClick={onClick}><SlidersHorizontal size={17} strokeWidth={2.1} /> Trading controls</button>;
}

export function OverviewHero({ onControls }) {
  return <PageHero title="Overview" description="Account performance, positions and execution at a glance." action={<>
    <span className="date-chip" title="Fixed date of the sample snapshot"><CalendarDays size={16} /> {SAMPLE_DATE}</span>
    <ControlsButton onClick={onControls} />
  </>} />;
}

export function Overview({ config, onControls, onSymbol, onPosition }) {
  return <div className="overview-content">
    <AccountStats />
    <div className="dashboard-grid primary-grid"><EquityChart /><EngineStatus config={config} onControls={onControls} /></div>
    <div className="dashboard-grid secondary-grid">
      <div className="panel-stack">
        <PositionsPanel positions={POSITIONS} onPosition={onPosition} action={<a className="mini-link" href="#positions">View positions <ArrowRight size={15} /></a>} />
        <DecisionsPanel compact />
      </div>
      <Watchlist selected={config.symbol} onSelect={onSymbol} />
    </div>
  </div>;
}

export function PositionsView({ onPosition }) {
  const [filter, setFilter] = useState('all');
  return <PositionsPanel expanded positions={filterBySymbol(POSITIONS, filter)} onPosition={onPosition}
    action={<SymbolSelect value={filter} onChange={setFilter} label="Filter positions by instrument" allowAll compact />} />;
}

export function HistoryView() {
  const [filter, setFilter] = useState('all');
  const filtered = filterBySymbol(HISTORY, filter);
  const total = filtered.reduce((sum, t) => sum + t.net, 0);
  function downloadHistory() {
    const url = URL.createObjectURL(new Blob([historyCsv(filtered)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tickframe-simulated-history.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="panel table-panel" aria-labelledby="history-heading">
    <PanelHeading id="history-heading" title="Closed trade ledger" description="Simulated fixtures · all times UTC" action={<div className="filter-actions">
      <SymbolSelect value={filter} onChange={setFilter} label="Filter history by instrument" allowAll compact />
      <button className="btn btn-secondary btn-small" type="button" onClick={downloadHistory} disabled={!filtered.length}><Download size={15} /> Sample CSV</button>
    </div>} />
    {filtered.length ? <div className="table-scroll" tabIndex={0} aria-label="Scrollable simulated trade history">
      <table className="history-table"><thead><tr><th scope="col">Instrument</th><th scope="col">Closed (UTC)</th><th scope="col">Side</th><th scope="col" className="num">Lots</th><th scope="col" className="num">Entry</th><th scope="col" className="num">Exit</th><th scope="col" className="num">Commission</th><th scope="col" className="num">Net P/L</th><th scope="col">Exit reason</th></tr></thead>
        <tbody>{filtered.map(trade => <tr key={trade.id}>
          <td><span className="symbol-link static-symbol"><SymbolMark symbol={SYMBOL_BY_CODE[trade.symbol]} /><strong>{trade.symbol}</strong></span></td>
          <td><span className="mono trade-time">{trade.day}<small>{trade.time}</small></span></td><td><Side side={trade.side} /></td><td className="num">{trade.volume.toFixed(2)}</td>
          <td className="num">{trade.entry}</td><td className="num">{trade.exit}</td><td className="num">{usd(trade.commission)}</td>
          <td className={`num ${trade.net < 0 ? 'text-negative' : 'text-positive'}`}>{signedUsd(trade.net)}</td><td className="muted">{trade.reason}</td>
        </tr>)}</tbody>
      </table>
    </div> : <EmptyState title="No matching sample trades" message="Try All instruments or a different symbol." />}
    <div className="table-footer"><span>{filtered.length} sample {filtered.length === 1 ? 'trade' : 'trades'}</span><span>Net total <strong className="mono">{signedUsd(total)}</strong></span></div>
  </section>;
}

export function AnalyticsView() {
  const [selected, setSelected] = useState('all');
  const filtered = filterBySymbol(HISTORY, selected);
  const grouped = SYMBOLS.filter(symbol => selected === 'all' || selected === symbol.code).map(symbol => {
    const trades = filtered.filter(item => item.symbol === symbol.code);
    const sum = trades.reduce((total, t) => total + t.net, 0);
    return { symbol, count: trades.length, sum, wins: trades.filter(t => t.net > 0).length };
  });
  return <div className="panel-stack">
    <div className="dashboard-grid primary-grid"><EquityChart /><MetricList /></div>
    <section className="panel table-panel" aria-labelledby="analytics-heading">
      <PanelHeading id="analytics-heading" title="Per-instrument results" description="Descriptive figures for the sample trades, not performance evidence" action={<SymbolSelect value={selected} onChange={setSelected} label="Filter analytics by instrument" allowAll compact />} />
      <div className="table-scroll" tabIndex={0} aria-label="Scrollable sample analytics"><table className="analytics-table"><thead><tr>
        <th scope="col">Instrument</th><th scope="col" className="num">Sample count</th><th scope="col" className="num">Wins</th><th scope="col" className="num">Net P/L</th><th scope="col" className="num">Avg. net / trade</th><th scope="col">Evidence</th>
      </tr></thead><tbody>{grouped.map(({ symbol, count, sum, wins }) => <tr key={symbol.code}>
        <td><span className="symbol-link static-symbol"><SymbolMark symbol={symbol} /><strong>{symbol.code}</strong></span></td><td className="num">{count}</td><td className="num">{count ? wins : '—'}</td>
        <td className={`num ${sum > 0 ? 'text-positive' : sum < 0 ? 'text-negative' : ''}`}>{count ? signedUsd(sum) : '—'}</td><td className="num">{count ? signedUsd(sum / count) : '—'}</td>
        <td><Pill tone="neutral">{count ? 'Fixture only' : 'No samples'}</Pill></td>
      </tr>)}</tbody></table></div>
    </section>
  </div>;
}

export function ShadowView({ config, onControls }) {
  return <div className="dashboard-grid secondary-grid">
    <DecisionsPanel />
    <section className="panel summary-panel shadow-status">
      <PanelHeading title="Shadow workspace" description="Interface preview" action={<FlaskConical size={18} className="accent" />} />
      <dl className="value-list"><div><dt>Operating mode</dt><dd><Pill tone={config.emergency ? 'red' : 'violet'}>{previewMode(config)}</Pill></dd></div>
        <div><dt>Active instrument</dt><dd>{config.symbol}</dd></div><div><dt>Real account impact</dt><dd>None</dd></div></dl>
      <p className="panel-note">Shadow opportunities will come from the EA after integration. This version reads prewritten examples and does not run a strategy.</p>
      <div className="panel-inline-actions"><ControlsButton onClick={onControls} /></div>
    </section>
  </div>;
}

export function SettingsView({ config, onControls, onAlertsToggle, onReset }) {
  return <div className="settings-grid">
    <section className="panel summary-panel" aria-labelledby="config-heading">
      <PanelHeading id="config-heading" title="Effective preview settings" description="Local preferences, not broker settings" action={<Settings2 size={19} className="muted" />} />
      <dl className="value-list">
        <div><dt>Active instrument</dt><dd>{config.symbol}</dd></div><div><dt>Trading intensity</dt><dd>{config.intensity} / 100</dd></div>
        <div><dt>Position limit</dt><dd>{config.positionLimit}</dd></div><div><dt>Risk per trade</dt><dd>{config.tradeRisk}% <span className="muted">/ {LIMITS.tradeRisk}%</span></dd></div>
        <div><dt>Aggregate risk</dt><dd>{config.openRisk}% <span className="muted">/ {LIMITS.openRisk}%</span></dd></div>
        <div><dt>Margin utilisation</dt><dd>{config.marginLimit}% <span className="muted">/ {LIMITS.marginLimit}%</span></dd></div>
        <div><dt>Daily peak drawdown trigger</dt><dd>{LIMITS.dailyDrawdown}%</dd></div><div><dt>Daily profit target</dt><dd>+1,500%</dd></div>
      </dl>
      <div className="panel-inline-actions"><ControlsButton onClick={onControls} /><button className="btn btn-secondary" type="button" onClick={onReset}>Reset preview</button></div>
    </section>
    <div className="panel-stack">
      <section className="panel summary-panel">
        <PanelHeading title="Notifications" description="Channels are independent" />
        <dl className="value-list">
          <div><dt>Dashboard indicators</dt><dd><Toggle name="Dashboard indicators" checked={config.dashboardAlerts} onChange={onAlertsToggle} /></dd></div>
          <div><dt>Telegram delivery</dt><dd><Pill>Not connected</Pill></dd></div><div><dt>MT5 push</dt><dd><Pill>Not connected</Pill></dd></div>
        </dl>
      </section>
      <section className="panel summary-panel">
        <PanelHeading title="Connection and access" description="Not part of this standalone preview" />
        <div className="connection-checks"><span><Link2Off size={16} /> MT5 bridge disconnected</span><span><LockKeyhole size={16} /> Login and two-factor not configured</span></div>
        <p className="panel-note">Do not enter broker credentials. There are no endpoints or forms for real accounts here.</p>
      </section>
    </div>
  </div>;
}
