// Illustrative fixtures for the standalone web preview. No market feed, bridge,
// authentication, strategy engine, or order client is connected to this module.
export const SAMPLE_DATE = 'Nov 17, 2026';
export const STORAGE_KEY = 'tickframe-preview-v1';

export const SYMBOLS = Object.freeze([
  { code: 'EURUSD', name: 'Euro / US Dollar', glyph: '€', bid: '1.08892', change: 0.24, spread: 0.8, latency: 42, slippage: 0.1, theme: 'eur' },
  { code: 'GBPUSD', name: 'British Pound / US Dollar', glyph: '£', bid: '1.27351', change: -0.13, spread: 1.0, latency: 47, slippage: 0.2, theme: 'gbp' },
  { code: 'USDJPY', name: 'US Dollar / Japanese Yen', glyph: '¥', bid: '149.362', change: 0.31, spread: 0.9, latency: 51, slippage: 0.2, theme: 'jpy' },
  { code: 'USDCHF', name: 'US Dollar / Swiss Franc', glyph: 'Fr', bid: '0.88417', change: -0.06, spread: 1.1, latency: 46, slippage: 0.2, theme: 'chf' },
  { code: 'USDCAD', name: 'US Dollar / Canadian Dollar', glyph: 'C$', bid: '1.39276', change: 0.08, spread: 1.1, latency: 48, slippage: 0.2, theme: 'cad' },
  { code: 'AUDUSD', name: 'Australian Dollar / US Dollar', glyph: 'A$', bid: '0.65328', change: -0.16, spread: 1.0, latency: 49, slippage: 0.2, theme: 'aud' },
  { code: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', glyph: 'N$', bid: '0.59634', change: 0.11, spread: 1.2, latency: 50, slippage: 0.2, theme: 'nzd' },
  { code: 'XAUUSD', name: 'Gold / US Dollar', glyph: 'Au', bid: '2,683.22', change: 0.54, spread: 24.0, latency: 62, slippage: 1.3, theme: 'xau' },
]);
export const SYMBOL_BY_CODE = Object.freeze(Object.fromEntries(SYMBOLS.map(s => [s.code, s])));

export const ACCOUNT = Object.freeze({
  balance: 2442.92, equity: 2486.72, openingEquity: 2400, peak: 2504.75,
  freeMargin: 1942.48, usedMargin: 544.24, realised: 42.92, floating: 43.80,
});
export const METRICS = Object.freeze({
  dailyChange: ACCOUNT.equity - ACCOUNT.openingEquity,
  dailyPercent: (ACCOUNT.equity / ACCOUNT.openingEquity - 1) * 100,
  drawdownPercent: (1 - ACCOUNT.equity / ACCOUNT.peak) * 100,
  marginPercent: (ACCOUNT.usedMargin / ACCOUNT.equity) * 100,
});

export const LIMITS = Object.freeze({
  tradeRisk: 10, openRisk: 40, marginLimit: 70, dailyDrawdown: 40, dailyTarget: 1500, maxPreviewPositions: 5,
});
export const PRESETS = Object.freeze([
  { label: 'Measured', value: 25 }, { label: 'Balanced', value: 55 }, { label: 'Responsive', value: 80 },
]);
export const DEFAULT_CONFIG = Object.freeze({
  symbol: 'EURUSD', shadow: true, emergency: false, intensity: 55,
  positionLimit: 5, tradeRisk: 10, openRisk: 40, marginLimit: 70,
  dashboardAlerts: true,
});
const KNOWN_SYMBOLS = new Set(SYMBOLS.map(s => s.code));

function numeric(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return NaN;
}

export function validateConfig(candidate) {
  const input = candidate && typeof candidate === 'object' ? candidate : {};
  const errors = {};
  if (!KNOWN_SYMBOLS.has(input.symbol)) errors.symbol = 'Select one of the eight supported instruments.';
  const numberBounds = {
    intensity: [0, 100, true], positionLimit: [1, LIMITS.maxPreviewPositions, true],
    tradeRisk: [0.1, LIMITS.tradeRisk, false], openRisk: [0.1, LIMITS.openRisk, false],
    marginLimit: [0.1, LIMITS.marginLimit, false],
  };
  const values = {};
  for (const [key, [min, max, integer]] of Object.entries(numberBounds)) {
    const value = numeric(input[key]);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      errors[key] = `Enter ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`;
    } else {
      values[key] = value;
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      symbol: input.symbol, ...values, shadow: input.shadow === true,
      emergency: input.emergency === true, dashboardAlerts: input.dashboardAlerts === true,
    },
  };
}

export function loadConfig(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const checked = validateConfig({ ...DEFAULT_CONFIG, ...parsed });
      if (checked.ok) return checked.value;
      return { ...DEFAULT_CONFIG, emergency: parsed.emergency === true };
    }
  } catch {
    // Blocked/expired storage must not prevent showing the offline preview.
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(storage, config) {
  const checked = validateConfig(config);
  if (!checked.ok) return false;
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(checked.value));
    return true;
  } catch {
    return false;
  }
}

export function previewMode(config) {
  if (config.emergency) return 'Emergency stop';
  return config.shadow ? 'Shadow only' : 'Monitoring only';
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const usd = value => USD.format(value);
export const signedUsd = value => `${value < 0 ? '−' : value > 0 ? '+' : ''}${USD.format(Math.abs(value))}`;
export const signedPercent = value => `${value < 0 ? '−' : value > 0 ? '+' : ''}${Math.abs(value).toFixed(2)}%`;

export const POSITIONS = Object.freeze([
  { id: 'S-1048', symbol: 'EURUSD', side: 'BUY', volume: 0.12, entry: '1.08624', current: '1.08892', sl: '1.08645', tp: '1.09080', net: 31.24, duration: '2m 18s', strategy: 'Momentum breakout', time: '14:28:14', trailing: 'Stop has moved up', rationale: 'Illustrative breakout above the recent range, with a structural trailing stop written into the fixture.' },
  { id: 'S-1047', symbol: 'GBPUSD', side: 'SELL', volume: 0.04, entry: '1.27186', current: '1.27351', sl: '1.27420', tp: '1.26890', net: -6.98, duration: '4m 06s', strategy: 'Range reversion', time: '14:26:26', trailing: 'Initial stop', rationale: 'Illustrative reversion setup. The quote has moved against the hypothetical position; the initial stop is unchanged.' },
  { id: 'S-1045', symbol: 'XAUUSD', side: 'BUY', volume: 0.02, entry: '2,673.22', current: '2,683.22', sl: '2,675.40', tp: '2,689.70', net: 19.54, duration: '6m 43s', strategy: 'Volatility expansion', time: '14:23:49', trailing: 'Stop has moved up', rationale: 'Illustrative gold position after a volatility expansion. The fixture shows a hypothetical cost-adjusted gain, not a broker fill.' },
]);

export const HISTORY = Object.freeze([
  { id: 'S-1044', symbol: 'EURUSD', side: 'BUY', volume: 0.08, entry: '1.08650', exit: '1.08826', day: 'Nov 17', time: '14:18:12', duration: '1m 36s', gross: 14.08, commission: 0.56, strategy: 'Momentum breakout', reason: 'Momentum faded' },
  { id: 'S-1042', symbol: 'USDJPY', side: 'SELL', volume: 0.07, entry: '149.510', exit: '149.260', day: 'Nov 17', time: '13:54:05', duration: '2m 05s', gross: 11.72, commission: 0.49, strategy: 'Range reversion', reason: 'Target reached' },
  { id: 'S-1041', symbol: 'GBPUSD', side: 'BUY', volume: 0.05, entry: '1.27502', exit: '1.27365', day: 'Nov 17', time: '13:22:31', duration: '48s', gross: -6.85, commission: 0.35, strategy: 'Momentum breakout', reason: 'Setup invalidated' },
  { id: 'S-1039', symbol: 'XAUUSD', side: 'SELL', volume: 0.03, entry: '2,684.32', exit: '2,675.46', day: 'Nov 17', time: '12:57:44', duration: '3m 41s', gross: 26.58, commission: 1.21, strategy: 'Volatility expansion', reason: 'Structural exit' },
  { id: 'S-1038', symbol: 'AUDUSD', side: 'BUY', volume: 0.09, entry: '0.65117', exit: '0.65192', day: 'Nov 16', time: '15:13:02', duration: '2m 54s', gross: 6.75, commission: 0.63, strategy: 'Range reversion', reason: 'Momentum faded' },
  { id: 'S-1036', symbol: 'EURUSD', side: 'SELL', volume: 0.07, entry: '1.08781', exit: '1.08693', day: 'Nov 16', time: '14:27:46', duration: '1m 19s', gross: 6.16, commission: 0.49, strategy: 'Range reversion', reason: 'Target reached' },
  { id: 'S-1034', symbol: 'USDCAD', side: 'BUY', volume: 0.05, entry: '1.39121', exit: '1.39033', day: 'Nov 16', time: '12:49:20', duration: '1m 04s', gross: -3.16, commission: 0.35, strategy: 'Momentum breakout', reason: 'Setup invalidated' },
].map(trade => ({ ...trade, net: Math.round((trade.gross - trade.commission) * 100) / 100 })));

export const DECISIONS = Object.freeze([
  { id: 'D-3', time: '14:30:22', symbol: 'USDJPY', state: 'Rejected', title: 'Spread ceiling blocked entry', description: 'In this example, the spread was above the permitted range. The setup would not proceed to sizing.' },
  { id: 'D-2', time: '14:28:14', symbol: 'EURUSD', state: 'Shadow', title: 'Momentum setup recorded', description: 'An illustrative breakout was logged as a shadow opportunity. No order was sent.' },
  { id: 'D-1', time: '14:26:26', symbol: 'GBPUSD', state: 'Shadow', title: 'Reversion setup recorded', description: 'An example short was recorded with a structural invalidation level, using sample costs.' },
]);

export const ALERTS = Object.freeze([
  { id: 'A-3', title: 'Spread ceiling reached', summary: 'Example alert · USDJPY entry rejected.', time: '14:30 UTC', tone: 'amber' },
  { id: 'A-2', title: 'Shadow setup recorded', summary: 'Example alert · EURUSD momentum breakout.', time: '14:28 UTC', tone: 'lime' },
  { id: 'A-1', title: 'No terminal connected', summary: 'Preview status · MT5 bridge is not configured.', time: 'Setup', tone: 'neutral' },
]);

export const SERIES = Object.freeze({
  '1D': {
    values: [2400,2409,2405,2417,2412,2415,2429,2424,2433,2448,2438,2446,2432,2449,2456,2452,2467,2458,2464,2475,2469,2474,2490,2481,2495,2504.75,2492,2486.72],
    ticks: [2520, 2485, 2450, 2415, 2380], labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '14:30'], start: '2026-11-17T00:00:00Z',
  },
  '7D': {
    values: [2280,2290,2284,2312,2307,2315,2300,2305,2330,2320,2335,2329,2347,2354,2344,2362,2357,2372,2360,2345,2352,2349,2377,2385,2379,2400,2395,2413,2406,2422,2418,2403,2410,2423,2444,2435,2454,2448,2463,2451,2472,2465,2490,2480,2497,2504.75,2495,2486.72],
    ticks: [2530, 2460, 2390, 2320, 2250], labels: ['Nov 11', 'Nov 12', 'Nov 13', 'Nov 14', 'Nov 16', 'Nov 17'], start: '2026-11-11T00:00:00Z',
  },
  '30D': {
    values: [2050,2063,2080,2070,2092,2120,2104,2110,2118,2135,2120,2147,2158,2136,2149,2176,2189,2204,2181,2196,2205,2224,2215,2231,2260,2245,2263,2276,2264,2273,2309,2293,2315,2301,2318,2340,2326,2360,2368,2350,2376,2402,2390,2400,2435,2421,2454,2442,2474,2463,2504.75,2486.72],
    ticks: [2600, 2450, 2300, 2150, 2000], labels: ['Oct 19', 'Oct 24', 'Oct 30', 'Nov 5', 'Nov 11', 'Nov 17'], start: '2026-10-19T00:00:00Z',
  },
});

export function filterBySymbol(items, selected) {
  return selected === 'all' ? items : items.filter(item => item.symbol === selected);
}

export function historyCsv(items) {
  return [
    'data_source,ticket,day,time_utc,instrument,side,lots,entry,exit,commission_usd,net_pnl_usd,exit_reason',
    ...items.map(trade => ['SIMULATED_FIXTURE', trade.id, `${trade.day} 2026`, trade.time, trade.symbol, trade.side, trade.volume, trade.entry, trade.exit, trade.commission, trade.net, trade.reason]
      .map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')),
  ].join('\n') + '\n';
}
