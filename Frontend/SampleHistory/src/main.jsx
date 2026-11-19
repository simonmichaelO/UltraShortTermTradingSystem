import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowRight, ChevronRight, CircleAlert, Clock3, Database, FlaskConical, History, Layers2, LockKeyhole,
  RefreshCw, Wallet, WifiOff,
} from 'lucide-react';
import { readHistory, TIMEOUT_MS } from './history-api.js';
import './style.css';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', hourCycle: 'h23' });
const money = cents => USD.format(cents / 100);
const signedMoney = cents => cents > 0 ? `+${money(cents)}` : money(cents);
const date = stamp => SHORT_DAY.format(new Date(stamp));
const clock = stamp => TIME.format(new Date(stamp));
const quote = value => value.replace(/\B(?=(\d{3})+\.)/g, ',');
const tone = value => value > 0 ? 'positive' : value < 0 ? 'negative' : '';
const pending = { status: 'loading', snapshots: [] };

function Shell() {
  return <header className="top"><div className="frame top-inner">
    <div className="brand"><span className="logo"><Activity size={22} aria-hidden="true" /></span><div><strong>Tickframe<span>.</span></strong><small>TRADING WORKSPACE</small></div></div>
    <div className="crumb"><span>Workspace</span><ChevronRight size={14} aria-hidden="true" /><strong>Sample History</strong></div>
    <div className="top-state"><LockKeyhole size={13} aria-hidden="true" /> Read-only preview</div>
  </div></header>;
}

function SnapshotList({ snapshots, selected, onSelect }) {
  return <section className="panel snapshot-list" aria-labelledby="saved-title">
    <header className="panel-head"><div><span className="panel-kicker">SQLITE ARCHIVE</span><h2 id="saved-title">Saved snapshots</h2></div><span className="count" title="Number of saved examples">{snapshots.length}</span></header>
    <ul aria-label="Saved sample snapshots">
      {snapshots.map((item, i) => <li key={item.fixture_id}>
        <button type="button" className="snapshot" aria-pressed={selected.fixture_id === item.fixture_id} onClick={() => onSelect(item.fixture_id)}>
          <div className="snap-title"><span className="snap-date">{date(item.as_of)}</span>{i === 0 && <span className="newest">Newest saved</span>}</div>
          <span className="snap-time"><time dateTime={item.as_of}>{clock(item.as_of)} UTC</time></span>
          <div className="snap-line"><strong>{money(item.account.equity_cents)}</strong><span>{item.positions.length} sample {item.positions.length === 1 ? 'position' : 'positions'}</span><ChevronRight size={16} aria-hidden="true" /></div>
        </button>
      </li>)}
    </ul>
    <div className="list-note"><Clock3 size={13} aria-hidden="true" /> Newest example first · UTC</div>
  </section>;
}

function Stat({ name, cents, sign = false, icon: Icon }) {
  return <div className="stat"><dt><Icon size={14} aria-hidden="true" /> {name}</dt><dd className={sign ? tone(cents) : ''}>{sign ? signedMoney(cents) : money(cents)}</dd></div>;
}

function SnapshotDetail({ item }) {
  const a = item.account;
  return <section className="panel detail" aria-labelledby="detail-title">
    <header className="panel-head detail-head"><div><span className="panel-kicker">SELECTED SNAPSHOT</span><h2 id="detail-title">Account snapshot</h2></div><span className="example"><FlaskConical size={13} aria-hidden="true" /> Simulated</span></header>
    <div className="detail-body">
      <dl className="time-grid">
        <div><dt>Example time</dt><dd><time dateTime={item.as_of}>{date(item.as_of)} · {clock(item.as_of)} UTC</time></dd></div>
        <div><dt>Saved to SQLite</dt><dd><time dateTime={item.stored_at_utc}>{date(item.stored_at_utc)} · {clock(item.stored_at_utc)} UTC</time></dd></div>
      </dl>
      <dl className="stats" aria-label="Selected sample amounts in USD">
        <Stat name="Equity" cents={a.equity_cents} icon={Wallet} />
        <Stat name="Balance" cents={a.balance_cents} icon={Database} />
        <Stat name="Floating P/L" cents={a.floating_pl_cents} sign icon={Activity} />
      </dl>
      <div className="margin" aria-label="Sample margin"><span>Used margin <strong>{money(a.used_margin_cents)}</strong></span><span>Free margin <strong>{money(a.free_margin_cents)}</strong></span></div>
    </div>
    <div className="position-head"><h3>Positions at snapshot</h3><span>Simulated · no broker orders</span></div>
    {item.positions.length ? <div className="table-wrap"><table aria-label="Positions at selected sample snapshot">
      <thead><tr><th scope="col">Instrument</th><th scope="col">Side</th><th scope="col" className="num">Lots</th><th scope="col" className="num sample-quote">Sample quote</th><th scope="col" className="num">Net P/L</th></tr></thead>
      <tbody>{item.positions.map(p => <tr key={p.id}>
        <th scope="row">{p.symbol}</th><td><span className={`side ${p.side === 'BUY' ? 'buy' : 'sell'}`}>{p.side}</span></td>
        <td className="num">{(p.volume_centilots / 100).toFixed(2)}</td><td className="num sample-quote">{quote(p.current)}</td>
        <td className={`num ${tone(p.net_cents)}`}>{signedMoney(p.net_cents)}</td>
      </tr>)}</tbody>
    </table></div> : <p className="empty-positions">This saved example has no open sample positions.</p>}
  </section>;
}

function StorageNotice({ status }) {
  const info = {
    loading: ['Checking', 'Opening the saved sample history read-only.'],
    ready: ['Available', 'Read from SQLite. These records are historical examples, not live prices.'],
    empty: ['Empty', 'SQLite is available, but this store contains no saved examples.'],
    unavailable: ['Unavailable', 'No verified history could be read. No amounts or counts are displayed.'],
  }[status];
  return <section className={`notice ${status}`} aria-label="Sample storage">
    <div className="notice-icon"><Database size={17} aria-hidden="true" /></div>
    <div className="notice-copy"><strong>Sample storage</strong><p>{info[1]}</p></div>
    <span role="status" className="storage-state" aria-label={`Sample storage: ${info[0]}`}><span />{info[0]}</span>
  </section>;
}

function StatePanel({ status, onRetry }) {
  const unavailable = status === 'unavailable';
  const Icon = unavailable ? CircleAlert : History;
  const title = status === 'empty' ? 'No saved snapshots' : unavailable ? 'Sample history unavailable' : 'Checking saved snapshots';
  return <section className="panel state-panel" aria-labelledby="history-state-title">
    <span className="state-icon"><Icon size={21} aria-hidden="true" /></span><h2 id="history-state-title">{title}</h2>
    <p>{status === 'empty' ? 'There are no example rows in this SQLite copy.' : unavailable
      ? 'The sample database could not be verified. Try reading it again.' : 'Waiting for the read-only sample store.'}</p>
    {unavailable && <button type="button" className="refresh" onClick={onRetry}>Try again <ArrowRight size={15} aria-hidden="true" /></button>}
  </section>;
}

function App() {
  const [result, setResult] = useState(pending);
  const [generation, setGeneration] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    readHistory(controller.signal).then(snapshots => {
      if (active) setResult({ status: snapshots.length ? 'ready' : 'empty', snapshots });
    }).catch(() => {
      if (active) setResult({ status: 'unavailable', snapshots: [] });
    }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [generation]);
  const refresh = () => { setResult(pending); setGeneration(n => n + 1); };
  const selected = result.snapshots.find(item => item.fixture_id === selectedId) ?? result.snapshots[0];
  return <><a className="skip" href="#content">Skip to content</a><Shell />
    <main className="frame" id="content" tabIndex={-1}>
      <div className="hero"><div><div className="eyebrow"><Layers2 size={14} aria-hidden="true" /> STORAGE LAB</div><h1>Sample History</h1>
        <p>See simulated account snapshots saved to SQLite.</p></div>
        <button className="refresh" type="button" onClick={refresh} disabled={result.status === 'loading'}><RefreshCw size={15} aria-hidden="true" /> Refresh history</button>
      </div>
      <StorageNotice status={result.status} />
      {result.status === 'ready' ? <div className="contents">
        <SnapshotList snapshots={result.snapshots} selected={selected} onSelect={setSelectedId} /><SnapshotDetail item={selected} />
      </div> : <StatePanel status={result.status} onRetry={refresh} />}
      <footer><span><FlaskConical size={13} aria-hidden="true" /> Sample History v0.6</span><div><span><WifiOff size={13} aria-hidden="true" /> MT5 disconnected</span><span><LockKeyhole size={12} aria-hidden="true" /> Live entries locked</span></div></footer>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
