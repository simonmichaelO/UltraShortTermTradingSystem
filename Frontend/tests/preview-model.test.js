import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, HISTORY, LIMITS, STORAGE_KEY, SYMBOLS,
  filterBySymbol, historyCsv, loadConfig, previewMode, saveConfig, validateConfig } from '../src/services/preview-model.js';

const fakeStorage = (start = null) => {
  let value = start;
  return { getItem(key) { assert.equal(key, STORAGE_KEY); return value; }, setItem(key, next) { assert.equal(key, STORAGE_KEY); value = next; } };
};

test('only the eight project instruments are offered', () => {
  assert.deepEqual(SYMBOLS.map(s => s.code), ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'XAUUSD']);
  assert.equal(validateConfig({ ...DEFAULT_CONFIG, symbol: 'XAUUSD247' }).ok, false);
  assert.equal(validateConfig({ ...DEFAULT_CONFIG, symbol: '__proto__' }).ok, false);
});

test('configuration preserves hard caps and accepts in-range custom preferences', () => {
  assert.equal(validateConfig(DEFAULT_CONFIG).ok, true);
  const custom = validateConfig({ ...DEFAULT_CONFIG, intensity: '73', tradeRisk: '6.5', openRisk: 22, marginLimit: 60 });
  assert.equal(custom.ok, true);
  assert.equal(custom.value.intensity, 73);
  assert.equal(custom.value.tradeRisk, 6.5);
  const rejected = validateConfig({ ...DEFAULT_CONFIG, tradeRisk: LIMITS.tradeRisk + 0.01, openRisk: LIMITS.openRisk + 1,
    marginLimit: LIMITS.marginLimit + 1, positionLimit: 6, intensity: 101 });
  assert.equal(rejected.ok, false);
  assert.deepEqual(Object.keys(rejected.errors).sort(), ['intensity', 'marginLimit', 'openRisk', 'positionLimit', 'tradeRisk']);
  for (const value of ['', NaN, Infinity, null, true]) assert.equal(validateConfig({ ...DEFAULT_CONFIG, tradeRisk: value }).ok, false);
  for (const value of [null, undefined, 'invalid', {}]) assert.equal(validateConfig(value).ok, false);
});

test('only preview preferences persist; broken and unavailable storage are handled', () => {
  const storage = fakeStorage();
  assert.deepEqual(loadConfig(storage), DEFAULT_CONFIG);
  assert.equal(saveConfig(storage, { ...DEFAULT_CONFIG, symbol: 'USDJPY', emergency: true, liveTrading: true }), true);
  assert.equal(loadConfig(storage).symbol, 'USDJPY');
  assert.equal(loadConfig(storage).emergency, true);
  assert.equal(loadConfig(storage).liveTrading, undefined);
  assert.deepEqual(loadConfig(fakeStorage('[invalid]')), DEFAULT_CONFIG);
  assert.equal(loadConfig(fakeStorage('{"tradeRisk":15,"emergency":true}')).emergency, true);
  assert.equal(loadConfig(fakeStorage('{"tradeRisk":15}')).tradeRisk, LIMITS.tradeRisk);
  assert.deepEqual(loadConfig({ getItem() { throw new Error('blocked'); } }), DEFAULT_CONFIG);
  assert.equal(saveConfig({ setItem() { throw new Error('blocked'); } }, DEFAULT_CONFIG), false);
});

test('emergency state supersedes the shadow switch; no preview state is live', () => {
  assert.equal(previewMode(DEFAULT_CONFIG), 'Shadow only');
  assert.equal(previewMode({ ...DEFAULT_CONFIG, shadow: false }), 'Monitoring only');
  assert.equal(previewMode({ ...DEFAULT_CONFIG, emergency: true }), 'Emergency stop');
});

test('closed trade filter and export preserve simulated provenance', () => {
  assert.equal(filterBySymbol(HISTORY, 'all').length, HISTORY.length);
  assert.equal(filterBySymbol(HISTORY, 'USDCHF').length, 0);
  const csv = historyCsv(filterBySymbol(HISTORY, 'XAUUSD'));
  assert.match(csv, /^data_source,ticket,/);
  assert.match(csv, /"SIMULATED_FIXTURE"/);
  assert.match(csv, /"2,684.32"/);
  assert.doesNotMatch(csv, /GBPUSD/);
});
