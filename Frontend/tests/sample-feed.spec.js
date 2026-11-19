import { expect, test } from '@playwright/test';

const SAMPLE = '/api/v1/sample-snapshot';
const ROUTE = '**/api/v1/sample-snapshot';
const REQUEST_MARKER = 'x-tickframe-sample-request';
const echo = route => ({ [REQUEST_MARKER]: route.request().headers()[REQUEST_MARKER] });
const status = (page, label) => page.getByRole('status', { name: `Sample data feed: ${label}`, exact: true });
const ledger = page => page.getByRole('region', { name: /^Open positions/ });
const metrics = page => page.locator('.stats-grid .stat-value');
const values = ['$2,486.72', '+$86.72', '$1,942.48', '0.72%'];

async function openFresh(page) {
  await page.goto('/');
  await expect(status(page, 'Fresh')).toBeVisible();
  await expect(metrics(page)).toHaveText(values);
}

test('dashboard displays account and position fields from the API, not the bundled chart', async ({ page }) => {
  await page.route(ROUTE, async route => {
    const original = await route.fetch();
    const body = await original.json();
    for (const key of ['balance_cents', 'equity_cents', 'free_margin_cents', 'peak_equity_cents']) body.sample.account[key] += 5000;
    body.sample.positions[0].strategy = 'API-only example strategy';
    await route.fulfill({ response: original, json: body });
  });
  await page.goto('/');
  await expect(status(page, 'Fresh')).toBeVisible();
  await expect(metrics(page).first()).toHaveText('$2,536.72');
  await page.getByRole('button', { name: 'Review EURUSD sample position' }).click();
  await expect(page.getByRole('dialog', { name: 'EURUSD position' })).toContainText('API-only example strategy');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Account snapshot' })).toContainText('$2,492.92');
  await expect(page.getByText('Prewritten example · not the sample feed')).toBeVisible();
});

test('the delivery test visibly switches Fresh, Stale, Unavailable and back without affecting the API badge', async ({ page }) => {
  await openFresh(page);
  const testMode = page.getByLabel('Delivery test', { exact: true });
  await testMode.selectOption('delayed');
  await expect(status(page, 'Stale')).toBeVisible();
  await expect(metrics(page)).toHaveText(values);
  await expect(ledger(page)).toContainText('Stale sample');
  await expect(page.getByText('Simulated delay. Showing an older sample, not current data.')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Web API: Online' })).toBeVisible();
  await testMode.selectOption('outage');
  await expect(status(page, 'Unavailable')).toBeVisible();
  await expect(metrics(page)).toHaveText(['—', '—', '—', '—']);
  await expect(ledger(page)).toContainText('Sample positions unavailable');
  await expect(ledger(page).locator('.count-tag')).toHaveCount(0);
  await expect(page.getByText('Locked', { exact: true })).toBeVisible();
  await testMode.selectOption('normal');
  await expect(status(page, 'Fresh')).toBeVisible();
  await expect(metrics(page)).toHaveText(values);
  await expect(ledger(page).locator('tbody tr')).toHaveCount(3);
  // The test choice is not saved across reloads.
  await testMode.selectOption('outage');
  await expect(status(page, 'Unavailable')).toBeVisible();
  await page.reload();
  await expect(testMode).toHaveValue('normal');
  await expect(status(page, 'Fresh')).toBeVisible();
});

test('a failed refresh marks retained values and open position details stale, then recovers', async ({ page }) => {
  let online = true;
  await page.route(ROUTE, route => online ? route.continue() : route.abort('failed'));
  await openFresh(page);
  await page.getByRole('button', { name: 'Select GBPUSD for preview' }).click();
  online = false;
  await page.getByRole('button', { name: 'Check now', exact: true }).click();
  await expect(status(page, 'Stale')).toBeVisible();
  await expect(metrics(page)).toHaveText(values);
  await page.getByRole('button', { name: 'Review EURUSD sample position' }).click();
  await expect(page.getByRole('dialog', { name: 'EURUSD position' })).toContainText('stale simulated sample');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  online = true;
  await page.getByRole('button', { name: 'Check now', exact: true }).click();
  await expect(status(page, 'Fresh')).toBeVisible();
  await expect(page.getByRole('button', { name: /current GBPUSD/ })).toBeVisible();
});

test('invalid or missing initial data is unavailable, not a zero balance or zero positions', async ({ page }) => {
  await page.route(ROUTE, route => route.fulfill({ headers: echo(route), json: { schema_version: 1, real_controls_available: true } }));
  await page.goto('/');
  await expect(status(page, 'Unavailable')).toBeVisible();
  await expect(page.getByText('The response could not be verified.', { exact: false })).toBeVisible();
  await expect(metrics(page)).toHaveText(['—', '—', '—', '—']);
  await expect(ledger(page).locator('.count-tag')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('link', { name: 'Analytics', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Account snapshot' }).locator('dd')).toHaveText(['—', '—', '—', '—']);
  await page.getByRole('navigation').getByRole('link', { name: 'Positions', exact: true }).click();
  await expect(page.getByText('Sample positions unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('No sample positions', { exact: true })).toHaveCount(0);
});

test('a valid empty sample is Fresh and explicitly reports zero example positions', async ({ page }) => {
  await page.route(ROUTE, async route => {
    const original = await route.fetch();
    const body = await original.json();
    body.sample.positions = [];
    const account = body.sample.account;
    account.floating_pl_cents = 0;
    account.equity_cents = account.balance_cents;
    account.free_margin_cents = account.equity_cents - account.used_margin_cents;
    await route.fulfill({ response: original, json: body });
  });
  await page.goto('/');
  await expect(status(page, 'Fresh')).toBeVisible();
  await expect(ledger(page).locator('.count-tag')).toHaveText('0');
  await expect(ledger(page)).toContainText('The available sample was received and has no open positions.');
});

test('a reused response ages out at 30 seconds even though the API still replies', async ({ page }) => {
  await page.clock.install();
  const fixed = await (await page.request.get(SAMPLE)).json();
  await page.route(ROUTE, route => route.fulfill({ headers: echo(route), json: fixed }));
  await openFresh(page);
  await page.clock.fastForward(31_000);
  await expect(status(page, 'Stale')).toBeVisible();
  await expect(metrics(page)).toHaveText(values);
  await expect(page.getByText('Showing a sample past its freshness limit.', { exact: false })).toBeVisible();
});


test('a reply for an earlier page is unavailable on first load', async ({ page }) => {
  const prior = await page.request.get(SAMPLE, { headers: { [REQUEST_MARKER]: '1a'.repeat(16) } });
  const fixed = await prior.json();
  await page.route(ROUTE, route => route.fulfill({ headers: { [REQUEST_MARKER]: '1a'.repeat(16) }, json: fixed }));
  await page.goto('/');
  await expect(status(page, 'Unavailable')).toBeVisible();
  await expect(metrics(page)).toHaveText(['—', '—', '—', '—']);
});
