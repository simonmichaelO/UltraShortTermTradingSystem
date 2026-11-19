import { ChevronDown, Database, RefreshCw } from 'lucide-react';
import { Pill } from './ui.jsx';

const APPEARANCE = {
  checking: { label: 'Checking', tone: 'neutral' },
  fresh: { label: 'Fresh', tone: 'lime' },
  stale: { label: 'Stale', tone: 'amber' },
  unavailable: { label: 'Unavailable', tone: 'amber' },
};
const DAY = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', hourCycle: 'h23' });

function explanation(feed) {
  if (feed.phase === 'checking') return 'Waiting for the first sample from the read-only API.';
  if (feed.phase === 'fresh') return 'Recently delivered by the web API. These are fixed examples, not live market data.';
  if (feed.phase === 'stale') {
    if (feed.scenario === 'delayed' && feed.issue === 'old') return 'Simulated delay. Showing an older sample, not current data.';
    if (feed.issue === 'old') return 'Showing a sample past its freshness limit. These values are not current.';
    return 'The latest check failed. Showing the last verified sample, not current data.';
  }
  if (feed.scenario === 'outage') return 'Simulated outage. No account balance or position count is available.';
  if (feed.issue === 'invalid') return 'The response could not be verified. Balances and positions are unavailable.';
  return 'The sample endpoint did not respond with data. Balances and positions are unavailable.';
}

export function SampleFeed({ feed }) {
  const { label, tone } = APPEARANCE[feed.phase];
  return <section className={`sample-feed sample-feed-${feed.phase}`} aria-labelledby="sample-feed-heading">
    <div className="sample-feed-main">
      <span className="sample-feed-icon"><Database size={18} strokeWidth={1.8} /></span>
      <div className="sample-feed-copy">
        <div className="sample-feed-title">
          <h2 id="sample-feed-heading">Sample data feed</h2>
          <span role="status" aria-label={`Sample data feed: ${label}`}><Pill tone={tone} dot>{label}</Pill></span>
        </div>
        <p>{explanation(feed)}</p>
        {feed.snapshot && <p className="sample-feed-time">
          <span>Example as of <time dateTime={feed.snapshot.asOf}>{DAY.format(new Date(feed.snapshot.asOf))}, {TIME.format(new Date(feed.snapshot.asOf))} UTC</time></span>
          <span>Sample published <time dateTime={new Date(feed.snapshot.publishedAt).toISOString()}>{DAY.format(feed.snapshot.publishedAt)}, {TIME.format(feed.snapshot.publishedAt)} UTC</time></span>
        </p>}
      </div>
    </div>
    <div className="sample-feed-actions">
      <div className="sample-scenario">
        <label htmlFor="sample-scenario">Delivery test</label>
        <span className="select-wrap">
          <select id="sample-scenario" value={feed.scenario} onChange={event => feed.setScenario(event.target.value)}
            title="Test sample delivery in this browser only; this cannot affect any account.">
            <option value="normal">Normal delivery</option>
            <option value="delayed">Delayed sample</option>
            <option value="outage">Simulated outage</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </div>
      <button type="button" className="btn btn-secondary btn-small sample-refresh" onClick={feed.checkNow} disabled={feed.refreshing}>
        <RefreshCw size={14} aria-hidden="true" /> Check now
      </button>
    </div>
  </section>;
}
