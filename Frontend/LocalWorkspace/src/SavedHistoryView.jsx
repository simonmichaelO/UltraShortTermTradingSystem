import { useEffect, useState } from 'react';
import { ChevronRight, Clock3, Database, LockKeyhole, RefreshCw } from 'lucide-react';
import { readHistory, TIMEOUT_MS } from '../../SampleHistory/src/history-api.js';
import { Side } from '../../src/components/Portfolio.jsx';
import { EmptyState, PanelHeading, Pill, SymbolMark } from '../../src/components/ui.jsx';
import { signedUsd, SYMBOL_BY_CODE, usd } from '../../src/services/preview-model.js';

const day = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' });
const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', hourCycle: 'h23' });
const dateLabel = value => day.format(new Date(value));
const timeLabel = value => time.format(new Date(value));
const pnlTone = amount => amount > 0 ? 'text-positive' : amount < 0 ? 'text-negative' : '';
const pending = { phase: 'checking', records: [] };
const statuses = {
  checking: ['Checking', 'neutral', 'Opening the saved examples read-only.'],
  ready: ['Available', 'lime', 'Saved in local SQLite. These are past examples, separate from the Overview feed.'],
  empty: ['Empty', 'amber', 'The local store was verified but has no saved snapshots.'],
  unavailable: ['Unavailable', 'amber', 'No verified SQLite history could be read. The Overview feed is checked separately.'],
};

function useSavedHistory() {
  const [state, setState] = useState(pending);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    readHistory(controller.signal).then(records => {
      if (active) setState({ phase: records.length ? 'ready' : 'empty', records });
    }).catch(() => {
      if (active) setState({ phase: 'unavailable', records: [] });
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [generation]);
  return { ...state, refresh: () => { setState(pending); setGeneration(count => count + 1); } };
}

function StorageStatus({ phase, refresh }) {
  const [label, tone, detail] = statuses[phase];
  return <section className="panel archive-status" aria-label="Sample storage">
    <span className="stat-icon icon-lime"><Database size={17} aria-hidden="true" /></span>
    <div><div className="archive-status-head"><strong>Sample storage</strong><span role="status" aria-label={`Sample storage: ${label}`}><Pill tone={tone} dot>{label}</Pill></span></div>
      <p>{detail}</p></div>
    <button type="button" className="btn btn-secondary btn-small archive-refresh" onClick={refresh} disabled={phase === 'checking'}>
      <RefreshCw size={14} aria-hidden="true" /> {phase === 'unavailable' ? 'Try again' : 'Refresh history'}
    </button>
  </section>;
}

function SavedSnapshots({ records, selected, onSelect }) {
  return <section className="panel archive-list" aria-labelledby="archive-list-heading">
    <PanelHeading id="archive-list-heading" title={<>Saved snapshots <span className="count-tag">{records.length}</span></>}
      description="Newest example first · UTC" />
    <ul>{records.map((record, i) => <li key={record.fixture_id}>
      <button type="button" className="archive-select" aria-pressed={record.fixture_id === selected.fixture_id} onClick={() => onSelect(record.fixture_id)}>
        <span className="archive-entry-date"><strong>{dateLabel(record.as_of)}</strong>{i === 0 && <Pill tone="lime">Newest example</Pill>}</span>
        <time className="mono muted" dateTime={record.as_of}>{timeLabel(record.as_of)} UTC</time>
        <span className="archive-entry-value"><strong>{usd(record.account.equity_cents / 100)}</strong><span className="muted">{record.positions.length} sample positions</span><ChevronRight size={15} aria-hidden="true" /></span>
      </button>
    </li>)}</ul>
  </section>;
}

function Stamp({ value }) {
  return <time dateTime={value}>{dateLabel(value)} · {timeLabel(value)} UTC</time>;
}

function SavedSnapshot({ record }) {
  const a = record.account;
  return <section className="panel archive-detail" aria-labelledby="archive-detail-heading">
    <PanelHeading id="archive-detail-heading" title="Account snapshot" description="Saved example values in USD"
      action={<Pill tone="neutral"><LockKeyhole size={12} aria-hidden="true" /> Read-only</Pill>} />
    <dl className="archive-dates">
      <div><dt>Example time</dt><dd><Stamp value={record.as_of} /></dd></div>
      <div><dt>Saved to SQLite</dt><dd><Stamp value={record.stored_at_utc} /></dd></div>
    </dl>
    <dl className="archive-values">
      <div><dt>Equity</dt><dd>{usd(a.equity_cents / 100)}</dd></div>
      <div><dt>Balance</dt><dd>{usd(a.balance_cents / 100)}</dd></div>
      <div><dt>Floating P/L</dt><dd className={pnlTone(a.floating_pl_cents)}>{signedUsd(a.floating_pl_cents / 100)}</dd></div>
    </dl>
    <div className="archive-margin"><span>Used margin <strong>{usd(a.used_margin_cents / 100)}</strong></span>
      <span>Free margin <strong>{usd(a.free_margin_cents / 100)}</strong></span></div>
    <div className="archive-position-heading"><h3>Positions at snapshot</h3><span className="muted">Simulated · no broker orders</span></div>
    {record.positions.length ? <div className="table-scroll" tabIndex={0} aria-label="Scrollable saved sample positions">
      <table className="archive-table"><thead><tr><th scope="col">Instrument</th><th scope="col">Side</th><th scope="col" className="num">Lots</th><th scope="col" className="num archive-quote">Example quote</th><th scope="col" className="num">Net P/L</th></tr></thead>
        <tbody>{record.positions.map(p => <tr key={p.id}>
          <th scope="row"><span className="symbol-link static-symbol"><SymbolMark symbol={SYMBOL_BY_CODE[p.symbol]} /><strong>{p.symbol}</strong></span></th>
          <td><Side side={p.side} /></td><td className="num mono">{(p.volume_centilots / 100).toFixed(2)}</td>
          <td className="num mono archive-quote">{p.current.replace(/\B(?=(\d{3})+\.)/g, ',')}</td>
          <td className={`num mono ${pnlTone(p.net_cents)}`}>{signedUsd(p.net_cents / 100)}</td>
        </tr>)}</tbody></table>
    </div> : <EmptyState title="No positions in this snapshot" message="This is a verified saved example with zero positions." />}
  </section>;
}

export function SavedHistoryView() {
  const history = useSavedHistory();
  const [selectedId, setSelectedId] = useState(null);
  const selected = history.records.find(record => record.fixture_id === selectedId) ?? history.records[0];
  return <div className="archive-view">
    <StorageStatus phase={history.phase} refresh={history.refresh} />
    {selected ? <div className="archive-grid"><SavedSnapshots records={history.records} selected={selected} onSelect={setSelectedId} />
      <SavedSnapshot record={selected} />
    </div> : <section className="panel" aria-label="Saved snapshot state"><EmptyState
      title={history.phase === 'checking' ? 'Opening Sample History' : history.phase === 'empty' ? 'No saved snapshots' : 'Sample History unavailable'}
      message={history.phase === 'checking' ? 'Waiting for the local SQLite read.' : history.phase === 'empty'
        ? 'There are no rows in this verified sample store.' : 'No amounts or counts can be shown. Use Try again after checking the local store.'} />
    </section>}
    <p className="archive-note"><Clock3 size={13} aria-hidden="true" /> Example times are fictional. Save times show when the local sample store recorded them.</p>
  </div>;
}
