export class LabRequestError extends Error {
  constructor(status, code, waitSeconds = 0) {
    super(code);
    this.status = status;
    this.code = code;
    this.waitSeconds = waitSeconds;
  }
}

async function labRequest(path, { body, signal, credentials = 'same-origin' } = {}) {
  const writing = body !== undefined;
  const response = await fetch(`/api/v1/${path}`, {
    method: writing ? 'POST' : 'GET',
    credentials,
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

// Only mounted in the isolated HTTPS preview. Keep the current proof in a
// component-owned closure, never browser storage, the DOM, or a URL.
export function createTabLab() {
  let handle = null;
  let stage = null;
  const send = (step, body, signal) => labRequest(`auth/tab/${step}`, { body, signal, credentials: 'omit' });
  const clear = () => { handle = null; stage = null; };
  function requireStage(expected, error) {
    if (stage !== expected || !handle) throw new LabRequestError(401, error);
    return handle;
  }
  function adopt(result, nextStage) {
    const { handle: next, ...rest } = result ?? {};
    if (typeof next !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(next)) {
      clear();
      throw new LabRequestError(502, 'bad_response');
    }
    handle = next;
    stage = nextStage;
    return rest;
  }
  return Object.freeze({
    enroll: async () => adopt(await send('enroll', {}), 'setup'),
    confirmSetup: () => { requireStage('setup', 'setup_expired'); },
    pair: async code => {
      const result = await send('pair', { code, handle: requireStage('setup', 'setup_expired') });
      clear();
      return result;
    },
    password: async (username, password) => adopt(await send('password', { username, password }), 'challenge'),
    code: async code => adopt(await send('totp', { code, handle: requireStage('challenge', 'challenge_expired') }), 'session'),
    session: signal => send('session', { handle: requireStage('session', 'signed_out') }, signal),
    workspace: signal => send('workspace', { handle: requireStage('session', 'signed_out') }, signal),
    logout: async () => {
      if (handle) await send('logout', { handle });
      clear();
    },
    clear,
  });
}

export function readableLabError(error) {
  const messages = {
    invalid_credentials: 'The username or password did not match. Use credentials created in this lab, not a broker login.',
    invalid_code: 'That code didn’t work. Try the newest six-digit code. If you just used a code, wait for it to change.',
    setup_cookie_unavailable: 'This browser did not keep the test setup cookie.',
    setup_expired: 'This setup is no longer active. Create a new test account and pair it again.',
    challenge_expired: 'This verification step ended. Enter your test username and password again.',
    signed_out: 'This test session is not available. Sign in again with your test credentials.',
    invalid_request: 'Check the fields and try again.',
    invalid_origin: 'Return to the Tickframe sign-in lab from Arena’s live preview and try again.',
    lab_full: 'The test lab has reached its temporary account limit. Try again later.',
    no_access: 'This session cannot view the test workspace.',
    rate_limited: error?.waitSeconds ? `Too many attempts. Wait ${error.waitSeconds} seconds, then try again.` : 'Too many attempts. Wait a minute, then try again.',
    busy: 'The lab is busy. Wait a few seconds, then try again.',
  };
  return Object.hasOwn(messages, error?.code) ? messages[error.code] : 'The test lab didn’t respond as expected. Check the connection and try again.';
}
