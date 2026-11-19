import { createHmac, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';

const API = '/api/v1/auth';
const WORKSPACE = '/api/v1/lab/workspace';
const HOSTED = Boolean(process.env.AUTH_LAB_TLS_TEST_PORT);
const PROFILE_API = HOSTED ? `${API}/tab` : API;
const CREATE_LABEL = HOSTED ? 'Create test account without cookies' : 'Create test account';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Independent RFC 6238/4226 calculation for a key generated inside each test.
// No test passwords, keys, browser traces, storage snapshots or codes are saved.
function totp(secret, step = Math.floor(Date.now() / 30_000)) {
  let buffer = 0;
  let bits = 0;
  const key = [];
  for (const letter of secret) {
    const index = alphabet.indexOf(letter);
    if (index < 0) throw new Error('Unexpected test key format.');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      key.push((buffer >> bits) & 255);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac('sha1', Buffer.from(key)).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

async function createIdentity(page) {
  const response = page.waitForResponse(res => new URL(res.url()).pathname === PROFILE_API + '/enroll' && res.request().method() === 'POST');
  await page.getByRole('button', { name: CREATE_LABEL, exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Set up your authenticator' })).toBeVisible();
  return result.json();
}

async function pairIdentity(page, setup) {
  const step = Math.floor(Date.now() / 30_000);
  await page.getByLabel('Six-digit code').fill(totp(setup.manual_key, step));
  await page.getByRole('button', { name: 'Pair authenticator' }).click();
  await expect(page.getByRole('heading', { name: 'Enter your test credentials' })).toBeVisible();
  return step;
}

async function submitCorrectPassword(page) {
  await page.getByRole('button', { name: 'Use generated test password' }).click();
  await page.getByRole('button', { name: 'Continue to authenticator' }).click();
  await expect(page.getByRole('heading', { name: 'Enter your authenticator code' })).toBeVisible();
}

async function submitFreshCode(page, setup, pairStep) {
  const step = Math.max(pairStep + 1, Math.floor(Date.now() / 30_000));
  await page.getByLabel('Six-digit code').fill(totp(setup.manual_key, step));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Test workspace.' })).toBeVisible();
}

test('loopback cookie sign-in requires two checks, persists on reload and signs out', async ({ page: labPage, context }) => {
  test.skip(HOSTED, 'The hosted UI uses tab-only sessions.');
  await labPage.goto('/');
  await expect(labPage.getByRole('heading', { name: /Test your two-step sign-in/ })).toBeVisible();
  await labPage.getByRole('link', { name: 'Open sign-in lab' }).click();
  await expect(labPage).toHaveURL(/\/lab$/);
  await expect(labPage.getByText('Create a test account', { exact: true }).first()).toBeVisible();
  expect(await labPage.evaluate(path => fetch(path).then(response => response.status), WORKSPACE)).toBe(401);
  const setup = await createIdentity(labPage);
  const qr = labPage.getByRole('img', { name: 'QR code for your test authenticator' });
  await expect(qr).toBeVisible();
  await expect.poll(() => qr.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
  const step = await pairIdentity(labPage, setup);
  expect(await labPage.evaluate(path => fetch(path).then(response => response.status), WORKSPACE)).toBe(401);
  await labPage.getByLabel('Test password').fill(randomBytes(16).toString('hex'));
  await labPage.getByRole('button', { name: 'Continue to authenticator' }).click();
  await expect(labPage.getByRole('alert')).toContainText('The username or password did not match.');
  await submitCorrectPassword(labPage);
  expect(await labPage.evaluate(path => fetch(path).then(response => response.status), WORKSPACE)).toBe(401);
  await labPage.getByLabel('Six-digit code').fill(totp(setup.manual_key, step));
  await labPage.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(labPage.getByRole('alert')).toContainText('Try the newest six-digit code.');
  await submitFreshCode(labPage, setup, step);
  await expect(labPage.getByText('Locked', { exact: true })).toBeVisible();
  await expect(labPage.getByText('Not connected', { exact: true })).toBeVisible();
  await expect(labPage.getByText('Two-step sign-in verified', { exact: true })).toBeVisible();
  expect(await labPage.evaluate(() => !document.cookie.includes('lab-') && localStorage.length === 0 && sessionStorage.length === 0)).toBe(true);
  const cookies = await context.cookies(labPage.url());
  const session = cookies.find(item => item.name.endsWith('-lab-session'));
  const isTLS = labPage.url().startsWith('https:');
  expect(!!session?.httpOnly && session.sameSite === (isTLS ? 'None' : 'Strict')).toBe(true);
  if (isTLS) expect(session.secure && session.name.startsWith('__Host-') && !!session.partitionKey).toBe(true);
  await labPage.reload();
  await expect(labPage.getByRole('heading', { name: 'Test workspace.' })).toBeVisible();
  await labPage.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(labPage.getByRole('status')).toContainText('Signed out.');
  expect(await labPage.evaluate(path => fetch(path).then(response => response.status), WORKSPACE)).toBe(401);
  await labPage.reload();
  await expect(labPage.getByRole('button', { name: CREATE_LABEL, exact: true })).toBeVisible();
});

test('mobile lab keeps credential and manual authenticator setup in view', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open sign-in lab' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/lab');
  await createIdentity(page);
  await page.getByText('Use a manual setup key', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy Setup key' })).toBeVisible();
  await page.getByRole('button', { name: 'Show Setup key' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('Six-digit code')).toHaveAttribute('inputmode', 'numeric');
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('button', { name: CREATE_LABEL, exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'QR code for your test authenticator' })).toHaveCount(0);
});

test('an unavailable lab keeps the workspace closed and setup can recover', async ({ page }) => {
  const path = HOSTED ? '**/api/v1/auth/tab/enroll' : '**/api/v1/lab/workspace';
  await page.route(path, route => route.fulfill({ status: 503, json: { error: 'busy' } }));
  await page.goto('/lab');
  if (HOSTED) await page.getByRole('button', { name: CREATE_LABEL, exact: true }).click();
  else await expect(page.getByRole('heading', { name: 'The lab is unavailable' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('The lab is busy.');
  await expect(page.getByRole('heading', { name: 'Test workspace.' })).toHaveCount(0);
  await page.unroute(path);
  if (!HOSTED) await page.getByRole('button', { name: 'Retry session check' }).click();
  await createIdentity(page);
});

test('the visible workspace closes when a background session check shows expiry', async ({ page }) => {
  await page.clock.install();
  await page.goto('/lab');
  const setup = await createIdentity(page);
  const step = await pairIdentity(page, setup);
  await submitCorrectPassword(page);
  await submitFreshCode(page, setup, step);
  await page.route(`**${PROFILE_API}/session`, route => route.fulfill({ status: 401, json: { error: 'signed_out' } }));
  await page.clock.fastForward(16_000);
  await expect(page.getByRole('heading', { name: 'Enter your test credentials' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('The test session ended.');
  await expect(page.getByRole('heading', { name: 'Test workspace.' })).toHaveCount(0);
});


test('loopback flags a missing setup cookie before showing secrets', async ({ page }) => {
  test.skip(HOSTED, 'The hosted UI never probes for a setup cookie.');
  await page.route('**/api/v1/auth/setup', route => route.fulfill({ status: 401, json: { error: 'setup_cookie_unavailable' } }));
  await page.goto('/lab');
  await page.getByRole('button', { name: CREATE_LABEL, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This browser did not keep the test setup cookie.');
  await expect(page.getByRole('img', { name: 'QR code for your test authenticator' })).toHaveCount(0);
});

test('the hosted iframe works without third-party cookies and does not share a session with another tab', async ({ page, context, baseURL }) => {
  test.skip(!HOSTED, 'Requires the local TLS replay of the Arena host.');
  const parent = 'https://preview.arena.ai/tickframe-local-test';
  await context.route(parent, route => route.fulfill({
    contentType: 'text/html', body: `<iframe title="Preview" src="${baseURL}/"></iframe>`,
  }));
  await page.goto(parent);
  const frame = page.frameLocator('iframe[title="Preview"]');
  await frame.getByRole('link', { name: 'Open sign-in lab' }).click();
  const received = page.waitForResponse(res => new URL(res.url()).pathname === PROFILE_API + '/enroll');
  await frame.getByRole('button', { name: CREATE_LABEL, exact: true }).click();
  const res = await received;
  expect(res.status()).toBe(201);
  const setup = await res.json();
  await expect(frame.getByRole('heading', { name: 'Set up your authenticator' })).toBeVisible();
  const step = Math.floor(Date.now() / 30_000);
  await frame.getByLabel('Six-digit code').fill(totp(setup.manual_key, step));
  await frame.getByRole('button', { name: 'Pair authenticator' }).click();
  await frame.getByRole('button', { name: 'Use generated test password' }).click();
  await frame.getByRole('button', { name: 'Continue to authenticator' }).click();
  await expect(frame.getByRole('heading', { name: 'Enter your authenticator code' })).toBeVisible();
  await frame.getByLabel('Six-digit code').fill(totp(setup.manual_key, step + 1));
  await frame.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(frame.getByRole('heading', { name: 'Test workspace.' })).toBeVisible();
  const direct = await context.newPage();
  await direct.goto(`${baseURL}/lab`);
  await expect(direct.getByRole('button', { name: CREATE_LABEL, exact: true })).toBeVisible();
  await direct.close();
  await frame.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(frame.getByRole('status')).toContainText('Signed out.');
});

test('hosted form has one no-cookie creation button and completes two-factor sign-in', async ({ page, context }) => {
  test.skip(!HOSTED, 'Hosted mode is exercised in the separate local HTTPS test.');
  const cookieRequests = [];
  const capture = request => {
    const path = new URL(request.url()).pathname;
    if (path === WORKSPACE || (path.startsWith(API + '/') && !path.startsWith(PROFILE_API + '/'))) cookieRequests.push(path);
  };
  page.on('request', capture);
  await page.route('**/api/v1/auth/setup', route => route.fulfill({ status: 401, json: { error: 'setup_cookie_unavailable' } }));
  await page.goto('/lab');
  await expect(page.locator('meta[name="tickframe-lab-profile"]')).toHaveAttribute('content', 'arena');
  await expect(page.getByText('ISOLATED PREVIEW · v0.3.2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create test account', exact: true })).toHaveCount(0);
  const setup = await createIdentity(page);
  await expect(page.getByText('This tab only.', { exact: true })).toBeVisible();
  const step = await pairIdentity(page, setup);
  await submitCorrectPassword(page);
  await expect(page.getByRole('heading', { name: 'Test workspace.' })).toHaveCount(0);
  await page.getByLabel('Six-digit code').fill(totp(setup.manual_key, step));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Try the newest six-digit code.');
  await submitFreshCode(page, setup, step);
  await expect(page.getByText('Locked', { exact: true })).toBeVisible();
  expect((await context.cookies(page.url())).length).toBe(0);
  expect(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: CREATE_LABEL, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test workspace.' })).toHaveCount(0);
  expect(cookieRequests).toEqual([]);
});
