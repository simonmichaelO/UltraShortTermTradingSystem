// The browser uses its own origin; the hosted API is never a localhost URL.
export const STATUS_PATH = '/api/v1/status';
export const STATUS_POLL_MS = 12_000;
export const STATUS_TIMEOUT_MS = 3_500;

export class InvalidStatusResponse extends Error {}

export function isPreviewStatus(value) {
  return !!value && value.schema_version === 1 && value.service === 'tickframe'
    && value.environment === 'preview' && value.mt5_connection === 'not_configured'
    && value.data_source === 'simulated_examples' && value.real_controls_available === false
    && typeof value.generated_at === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/.test(value.generated_at)
    && Number.isFinite(Date.parse(value.generated_at));
}

export async function readPreviewStatus(signal, fetchStatus = globalThis.fetch) {
  const response = await fetchStatus(STATUS_PATH, {
    headers: { Accept: 'application/json' }, cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error(`Status API returned HTTP ${response.status}.`);
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new InvalidStatusResponse('Status API did not return JSON.');
  }
  let body;
  try { body = await response.json(); } catch (cause) {
    throw new InvalidStatusResponse('Unreadable status response.', { cause });
  }
  if (!isPreviewStatus(body)) throw new InvalidStatusResponse('Unsupported or unsafe preview status schema.');
  return body;
}
