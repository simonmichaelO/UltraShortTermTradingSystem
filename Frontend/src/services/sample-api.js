import { SYMBOLS } from './preview-model.js';

export const SAMPLE_PATH = '/api/v1/sample-snapshot';
export const SAMPLE_REQUEST_MARKER = 'X-Tickframe-Sample-Request';
export const SAMPLE_POLL_MS = 12_000;
export const SAMPLE_TIMEOUT_MS = 3_500;
export const SCENARIOS = Object.freeze(['normal', 'delayed', 'outage']);
const SYMBOL_CODES = new Set(SYMBOLS.map(symbol => symbol.code));
const MAX_CENTS = 1_000_000_000;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/;
const ACCOUNT_FIELDS = ['balance_cents', 'equity_cents', 'opening_equity_cents', 'peak_equity_cents',
  'free_margin_cents', 'used_margin_cents', 'realised_pl_cents', 'floating_pl_cents'];
const PRICE_FIELDS = ['entry', 'current', 'sl', 'tp'];

export class InvalidSampleResponse extends Error {}

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function stamp(value) {
  if (typeof value !== 'string' || !UTC.test(value)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19) ? parsed : NaN;
}
const cents = value => Number.isInteger(value) && Math.abs(value) <= MAX_CENTS;
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function isAccount(value) {
  return record(value) && value.currency === 'USD' && ACCOUNT_FIELDS.every(key => cents(value[key]))
    && value.opening_equity_cents > 0 && value.peak_equity_cents >= Math.max(value.equity_cents, value.opening_equity_cents)
    && value.used_margin_cents >= 0 && value.balance_cents + value.floating_pl_cents === value.equity_cents
    && value.free_margin_cents + value.used_margin_cents === value.equity_cents;
}

function isPosition(value, asOf) {
  if (!record(value) || typeof value.id !== 'string' || !/^S-[0-9]{1,10}$/.test(value.id)
      || !SYMBOL_CODES.has(value.symbol) || !['BUY', 'SELL'].includes(value.side)) return false;
  const digits = value.symbol === 'XAUUSD' ? 2 : value.symbol === 'USDJPY' ? 3 : 5;
  const price = new RegExp(`^\\d{1,7}\\.\\d{${digits}}$`);
  return Number.isInteger(value.volume_centilots) && value.volume_centilots > 0 && value.volume_centilots <= 10_000
    && PRICE_FIELDS.every(key => typeof value[key] === 'string' && price.test(value[key]) && Number(value[key]) > 0)
    && cents(value.net_cents) && stamp(value.opened_at) <= asOf
    && text(value.strategy, 100) && text(value.trailing, 100) && text(value.rationale, 500);
}

export function isSampleSnapshot(value, scenario = 'normal') {
  if (!record(value) || value.schema_version !== 1 || value.environment !== 'preview'
      || value.data_source !== 'simulated_examples' || value.mt5_connection !== 'not_configured'
      || value.real_controls_available !== false || value.scenario !== scenario || !['normal', 'delayed'].includes(scenario)
      || value.fresh_for_seconds !== 30) return false;
  const issued = stamp(value.issued_at);
  const published = stamp(value.published_at);
  if (!Number.isFinite(issued) || !Number.isFinite(published) || published > issued) return false;
  const fixture = value.sample;
  if (!record(fixture) || typeof fixture.fixture_id !== 'string' || !/^tf-example-[a-z0-9-]{1,48}$/.test(fixture.fixture_id)
      || !Number.isFinite(stamp(fixture.as_of)) || !isAccount(fixture.account)
      || !Array.isArray(fixture.positions) || fixture.positions.length > 32) return false;
  const asOf = stamp(fixture.as_of);
  return fixture.positions.every(position => isPosition(position, asOf))
    && new Set(fixture.positions.map(position => position.id)).size === fixture.positions.length
    && fixture.positions.reduce((sum, position) => sum + position.net_cents, 0) === fixture.account.floating_pl_cents;
}

const groupPrice = value => value.replace(/\B(?=(\d{3})+\.)/g, ',');

export function displaySampleSnapshot(body) {
  const raw = body.sample.account;
  const asOf = stamp(body.sample.as_of);
  return {
    fixtureId: body.sample.fixture_id, asOf: body.sample.as_of,
    issuedAt: stamp(body.issued_at), publishedAt: stamp(body.published_at), freshnessMs: body.fresh_for_seconds * 1000,
    account: {
      balance: raw.balance_cents / 100, equity: raw.equity_cents / 100, openingEquity: raw.opening_equity_cents / 100,
      peak: raw.peak_equity_cents / 100, freeMargin: raw.free_margin_cents / 100, usedMargin: raw.used_margin_cents / 100,
      realised: raw.realised_pl_cents / 100, floating: raw.floating_pl_cents / 100,
    },
    positions: body.sample.positions.map(position => {
      const duration = Math.floor((asOf - stamp(position.opened_at)) / 1000);
      return {
        id: position.id, symbol: position.symbol, side: position.side, volume: position.volume_centilots / 100,
        ...Object.fromEntries(PRICE_FIELDS.map(key => [key, groupPrice(position[key])])),
        net: position.net_cents / 100, duration: `${Math.floor(duration / 60)}m ${String(duration % 60).padStart(2, '0')}s`,
        time: new Date(position.opened_at).toISOString().slice(11, 19), strategy: position.strategy,
        trailing: position.trailing, rationale: position.rationale,
      };
    }),
  };
}

export async function readSampleSnapshot(scenario, signal, fetchSample = globalThis.fetch) {
  if (!SCENARIOS.includes(scenario)) throw new InvalidSampleResponse('Unknown delivery scenario.');
  const path = scenario === 'normal' ? SAMPLE_PATH : `${SAMPLE_PATH}?scenario=${scenario}`;
  // Correlate the reply with this GET without trusting the browser's wall clock.
  // This is a cache/replay check, not an authentication token.
  const marker = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  const response = await fetchSample(path, {
    method: 'GET', mode: 'same-origin', redirect: 'error',
    headers: { Accept: 'application/json', [SAMPLE_REQUEST_MARKER]: marker }, cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error(`Sample feed returned HTTP ${response.status}.`);
  if (response.headers.get(SAMPLE_REQUEST_MARKER) !== marker) {
    throw new InvalidSampleResponse('Response was not issued for this sample request.');
  }
  if (response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new InvalidSampleResponse('Sample feed did not return JSON.');
  }
  let body;
  try { body = await response.json(); } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new InvalidSampleResponse('Unreadable sample response.', { cause });
  }
  if (!isSampleSnapshot(body, scenario)) throw new InvalidSampleResponse('Unsafe or inconsistent sample response.');
  return displaySampleSnapshot(body);
}

export const emptySampleFeed = () => ({ phase: 'checking', snapshot: null, expiresAt: null, issue: null });

export function acceptSample(feed, snapshot, received, elapsed = 0) {
  if (feed.snapshot && snapshot.publishedAt <= feed.snapshot.publishedAt) {
    // An old or repeated publication isn't a fresh update. It can age out
    // on its original deadline and can never erase a known failure.
    return expireSample(feed, received);
  }
  const remaining = snapshot.freshnessMs - (snapshot.issuedAt - snapshot.publishedAt) - elapsed;
  return {
    phase: remaining > 0 ? 'fresh' : 'stale', snapshot,
    expiresAt: remaining > 0 ? received + remaining : null, issue: remaining > 0 ? null : 'old',
  };
}

export function failSample(feed, issue = 'network') {
  return { ...feed, phase: feed.snapshot ? 'stale' : 'unavailable', expiresAt: null, issue };
}

export function expireSample(feed, now) {
  return feed.phase === 'fresh' && now >= feed.expiresAt ? failSample(feed, 'old') : feed;
}
