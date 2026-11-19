import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { HISTORY, SERIES } from '../src/services/preview-model.js';
import {
  acceptSample, displaySampleSnapshot, emptySampleFeed, expireSample, failSample, InvalidSampleResponse,
  isSampleSnapshot, readSampleSnapshot, SAMPLE_PATH, SAMPLE_REQUEST_MARKER,
} from '../src/services/sample-api.js';

const sample = JSON.parse(readFileSync(new URL('../../Backend/app/services/fixtures/sample_snapshot_v1.json', import.meta.url), 'utf-8'));
const dto = {
  schema_version: 1, environment: 'preview', data_source: 'simulated_examples', mt5_connection: 'not_configured',
  real_controls_available: false, scenario: 'normal', issued_at: '2026-11-17T15:00:00Z',
  published_at: '2026-11-17T15:00:00Z', fresh_for_seconds: 30, sample,
};

test('displayed sample balances, positions and old chart fixtures still reconcile', () => {
  assert.equal(isSampleSnapshot(dto), true);
  const { account, positions } = displaySampleSnapshot(dto);
  const cents = value => Math.round(value * 100);
  assert.equal(cents(account.balance + account.floating), cents(account.equity));
  assert.equal(cents(account.freeMargin + account.usedMargin), cents(account.equity));
  assert.equal(cents(positions.reduce((sum, p) => sum + p.net, 0)), cents(account.floating));
  assert.equal(cents(HISTORY.filter(t => t.day === 'Nov 17').reduce((total, trade) => total + trade.net, 0)), cents(account.realised));
  assert.equal((100 * (1 - account.equity / account.peak)).toFixed(2), '0.72');
  assert.equal((100 * (account.equity / account.openingEquity - 1)).toFixed(2), '3.61');
  for (const series of Object.values(SERIES)) assert.equal(series.values.at(-1), account.equity);
  assert.equal(positions[2].entry, '2,673.22');
  assert.equal(positions[2].duration, '6m 43s');
});

test('required provenance, UTC times, instrument mapping and financial invariants fail closed', () => {
  for (const mutate of [
    d => { d.data_source = 'broker'; }, d => { d.mt5_connection = 'connected'; },
    d => { d.real_controls_available = true; }, d => { d.schema_version = 2; }, d => { d.scenario = 'delayed'; },
    d => { d.issued_at = '2026-11-17T15:00:00'; }, d => { d.published_at = '2026-11-17T15:01:00Z'; },
    d => { d.sample.as_of = '2026-02-30T12:00:00Z'; }, d => { d.sample.account.balance_cents = null; },
    d => { d.sample.account.equity_cents += 1; }, d => { d.sample.account.free_margin_cents -= 1; },
    d => { d.sample.positions[0].symbol = 'BTCUSD'; }, d => { d.sample.positions[0].volume_centilots = 0; },
    d => { d.sample.positions[0].opened_at = '2026-11-17T14:30:33Z'; },
    d => { d.sample.positions[0].id = d.sample.positions[1].id; }, d => { d.sample.positions[0].net_cents += 1; },
    d => { d.sample.positions[2].entry = '2,673.22'; }, d => { d.sample.positions[1].rationale = {}; },
  ]) {
    const value = structuredClone(dto);
    mutate(value);
    assert.equal(isSampleSnapshot(value), false);
  }
  assert.equal(isSampleSnapshot(null), false);
});

test('a validated zero-position snapshot is distinct from missing sample data', () => {
  const fixture = structuredClone(dto);
  const account = fixture.sample.account;
  account.floating_pl_cents = 0;
  account.equity_cents = account.balance_cents;
  account.free_margin_cents = account.equity_cents - account.used_margin_cents;
  fixture.sample.positions = [];
  assert(isSampleSnapshot(fixture));
  assert.deepEqual(displaySampleSnapshot(fixture).positions, []);
  assert.equal(failSample(emptySampleFeed()).snapshot, null);
});

test('client only requests the same-origin GET and rejects broken payloads', async () => {
  const signal = new AbortController().signal;
  const snapshot = await readSampleSnapshot('normal', signal, async (url, options) => {
    assert.equal(url, SAMPLE_PATH);
    const marker = options.headers[SAMPLE_REQUEST_MARKER];
    assert.match(marker, /^[a-f0-9]{32}$/);
    assert.deepEqual(options, {
      method: 'GET', mode: 'same-origin', redirect: 'error', cache: 'no-store', signal,
      headers: { Accept: 'application/json', [SAMPLE_REQUEST_MARKER]: marker },
    });
    return Response.json(dto, { headers: { [SAMPLE_REQUEST_MARKER]: marker } });
  });
  assert.equal(snapshot.account.balance, 2442.92);
  await assert.rejects(readSampleSnapshot('outage', signal, async url => {
    assert.equal(url, `${SAMPLE_PATH}?scenario=outage`);
    return new Response('', { status: 503 });
  }), /HTTP 503/);
  const withReply = fn => async (_, options) => fn({ [SAMPLE_REQUEST_MARKER]: options.headers[SAMPLE_REQUEST_MARKER] });
  await assert.rejects(readSampleSnapshot('normal', signal, withReply(headers => Response.json({ ...dto, real_controls_available: true }, { headers }))), InvalidSampleResponse);
  await assert.rejects(readSampleSnapshot('normal', signal, withReply(headers => new Response('<p>Not JSON</p>', { headers }))), InvalidSampleResponse);
  await assert.rejects(readSampleSnapshot('normal', signal, withReply(headers => new Response('{', { headers: { ...headers, 'Content-Type': 'application/json' } }))), InvalidSampleResponse);
});

test('a previously issued reply is not presented as fresh on a new request', async () => {
  const signal = new AbortController().signal;
  let previousMarker;
  await readSampleSnapshot('normal', signal, async (_, options) => {
    previousMarker = options.headers[SAMPLE_REQUEST_MARKER];
    return Response.json(dto, { headers: { [SAMPLE_REQUEST_MARKER]: previousMarker } });
  });
  await assert.rejects(readSampleSnapshot('normal', signal, async (_, options) => {
    assert.notEqual(options.headers[SAMPLE_REQUEST_MARKER], previousMarker);
    return Response.json(dto, { headers: { [SAMPLE_REQUEST_MARKER]: previousMarker } });
  }), InvalidSampleResponse);
});

test('normal delivery expires at the deadline and an initial delay is already stale', () => {
  const current = displaySampleSnapshot(dto);
  const feed = acceptSample(emptySampleFeed(), current, 1000, 100);
  assert.equal(feed.phase, 'fresh');
  assert.equal(feed.expiresAt, 30_900);
  assert.equal(expireSample(feed, 30_899).phase, 'fresh');
  assert.equal(expireSample(feed, 30_900).phase, 'stale');
  const delayed = { ...current, publishedAt: current.publishedAt - 90_000 };
  assert.equal(acceptSample(emptySampleFeed(), delayed, 1000).phase, 'stale');
});

test('failure keeps a last valid sample, refuses to renew duplicates, and recovers on a newer publication', () => {
  const original = displaySampleSnapshot(dto);
  const start = acceptSample(emptySampleFeed(), original, 500);
  assert.equal(acceptSample(start, original, 1000).expiresAt, start.expiresAt);
  assert.equal(acceptSample(start, original, start.expiresAt).phase, 'stale');
  const stale = failSample(start, 'invalid');
  assert.equal(stale.phase, 'stale');
  assert.equal(stale.snapshot, original);
  assert.equal(acceptSample(stale, original, 1000).phase, 'stale');
  const next = { ...original, issuedAt: original.issuedAt + 100, publishedAt: original.publishedAt + 100 };
  assert.equal(acceptSample(stale, next, 1000).phase, 'fresh');
  assert.equal(failSample(emptySampleFeed()).phase, 'unavailable');
});
