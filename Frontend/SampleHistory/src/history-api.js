export const HISTORY_PATH = '/api/v1/sample-history';
export const TIMEOUT_MS = 3500;
const SYMBOLS = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'XAUUSD']);
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const boundedCents = value => Number.isInteger(value) && Math.abs(value) <= 1_000_000_000;

function utcMillis(value) {
  if (typeof value !== 'string' || !UTC.test(value)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19) ? parsed : NaN;
}

function isPosition(p) {
  return object(p) && typeof p.id === 'string' && /^S-[0-9]{1,10}$/.test(p.id)
    && SYMBOLS.has(p.symbol) && ['BUY', 'SELL'].includes(p.side) && Number.isInteger(p.volume_centilots)
    && p.volume_centilots > 0 && p.volume_centilots <= 10_000 && boundedCents(p.net_cents)
    && typeof p.current === 'string' && /^\d{1,7}\.\d{2,5}$/.test(p.current) && Number(p.current) > 0;
}

function isSnapshot(item) {
  if (!object(item) || typeof item.fixture_id !== 'string' || !/^tf-example-[a-z0-9-]{1,48}$/.test(item.fixture_id)
    || !Number.isFinite(utcMillis(item.as_of)) || !Number.isFinite(utcMillis(item.stored_at_utc))
    || !Array.isArray(item.positions) || item.positions.length > 32 || !item.positions.every(isPosition)) return false;
  const a = item.account;
  return object(a) && a.currency === 'USD'
    && [a.balance_cents, a.equity_cents, a.floating_pl_cents, a.free_margin_cents, a.used_margin_cents].every(boundedCents)
    && a.used_margin_cents >= 0 && a.balance_cents + a.floating_pl_cents === a.equity_cents
    && a.free_margin_cents + a.used_margin_cents === a.equity_cents
    && item.positions.reduce((sum, p) => sum + p.net_cents, 0) === a.floating_pl_cents
    && new Set(item.positions.map(p => p.id)).size === item.positions.length;
}

export function isHistory(value) {
  return object(value) && value.schema_version === 1 && value.environment === 'preview'
    && value.storage === 'sqlite_read_only' && value.data_source === 'simulated_examples'
    && value.mt5_connection === 'not_configured' && value.real_controls_available === false
    && Array.isArray(value.snapshots) && value.snapshots.length <= 2 && value.snapshots.every(isSnapshot)
    && new Set(value.snapshots.map(item => item.fixture_id)).size === value.snapshots.length
    && value.snapshots.every((item, i, all) => i === 0 || utcMillis(all[i - 1].as_of) >= utcMillis(item.as_of));
}

export async function readHistory(signal, get = globalThis.fetch) {
  const response = await get(HISTORY_PATH, {
    method: 'GET', mode: 'same-origin', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
  });
  if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('Sample history unavailable.');
  }
  const data = await response.json();
  if (!isHistory(data)) throw new Error('Sample history could not be verified.');
  return data.snapshots;
}
