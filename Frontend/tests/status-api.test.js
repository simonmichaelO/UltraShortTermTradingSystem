import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidStatusResponse, isPreviewStatus, readPreviewStatus, STATUS_PATH } from '../src/services/status-api.js';

const preview = {
  schema_version: 1, service: 'tickframe', environment: 'preview', mt5_connection: 'not_configured',
  data_source: 'simulated_examples', real_controls_available: false, generated_at: '2026-11-17T14:30:32.000Z',
};

test('status parser will not accept a response implying real data or unlocked controls', () => {
  assert.equal(isPreviewStatus(preview), true);
  for (const changes of [
    { mt5_connection: 'online' }, { real_controls_available: true }, { data_source: 'broker' },
    { schema_version: 2 }, { generated_at: '17 November' }, { service: 'other' },
  ]) assert.equal(isPreviewStatus({ ...preview, ...changes }), false);
  assert.equal(isPreviewStatus(null), false);
});

test('status requests are same-origin and read-only', async () => {
  const request = new AbortController();
  const result = await readPreviewStatus(request.signal, async (url, options) => {
    assert.equal(url, '/api/v1/status');
    assert.equal(url, STATUS_PATH);
    assert.equal(options.method ?? 'GET', 'GET');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, request.signal);
    return Response.json(preview);
  });
  assert.deepEqual(result, preview);
});

test('errors and invalid status payloads are distinct from online', async () => {
  await assert.rejects(readPreviewStatus(undefined, async () => new Response('', { status: 503 })), /HTTP 503/);
  await assert.rejects(readPreviewStatus(undefined, async () => new Response('<html>')), InvalidStatusResponse);
  await assert.rejects(readPreviewStatus(undefined, async () => Response.json({ ...preview, real_controls_available: true })), InvalidStatusResponse);
  await assert.rejects(readPreviewStatus(undefined, async () => new Response('{', { headers: { 'content-type': 'application/json' } })), InvalidStatusResponse);
});
