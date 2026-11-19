export class LabRequestError extends Error {
  constructor(status, code, waitSeconds = 0) {
    super(code);
    this.status = status;
    this.code = code;
    this.waitSeconds = waitSeconds;
  }
}

async function labRequest(path, { body, signal } = {}) {
  const writing = body !== undefined;
  const response = await fetch(`/api/v1/${path}`, {
    method: writing ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    headers: writing ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: writing ? JSON.stringify(body) : undefined,
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new LabRequestError(response.status, 'bad_response');
  }
  const data = await response.json();
  if (!response.ok) {
    const waitSeconds = Math.min(60, Number.parseInt(response.headers.get('retry-after'), 10) || 0);
    throw new LabRequestError(response.status, data?.error ?? 'bad_response', waitSeconds);
  }
  return data;
}

export const lab = Object.freeze({
  enroll: () => labRequest('auth/enroll', { body: {} }),
  confirmSetup: () => labRequest('auth/setup'),
  pair: code => labRequest('auth/pair', { body: { code } }),
  password: (username, password) => labRequest('auth/password', { body: { username, password } }),
  code: code => labRequest('auth/totp', { body: { code } }),
  session: signal => labRequest('auth/session', { signal }),
  workspace: signal => labRequest('lab/workspace', { signal }),
  logout: () => labRequest('auth/logout', { body: {} }),
});

export function readableLabError(error) {
  const messages = {
    invalid_credentials: 'The username or password did not match. Use credentials created in this lab, not a broker login.',
    invalid_code: 'That code didn’t work. Try the newest six-digit code. If you just used a code, wait for it to change.',
    setup_cookie_unavailable: 'This browser did not keep the test setup cookie. Try the preview’s open-in-new-tab option, or allow cookies for the preview and try again.',
    setup_expired: 'This setup is no longer active. Create a new test account and pair it again.',
    challenge_expired: 'This verification step ended. Enter your test username and password again.',
    signed_out: 'The session was not available. Try signing in again with cookies allowed for the preview.',
    invalid_request: 'Check the fields and try again.',
    invalid_origin: 'Return to the Tickframe sign-in lab from Arena’s live preview and try again.',
    lab_full: 'The test lab has reached its temporary account limit. Try again later.',
    no_access: 'This session cannot view the test workspace.',
    rate_limited: error?.waitSeconds ? `Too many attempts. Wait ${error.waitSeconds} seconds, then try again.` : 'Too many attempts. Wait a minute, then try again.',
    busy: 'The lab is busy. Wait a few seconds, then try again.',
  };
  return Object.hasOwn(messages, error?.code) ? messages[error.code] : 'The test lab didn’t respond as expected. Check the connection and try again.';
}
