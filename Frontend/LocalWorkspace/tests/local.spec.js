import { expect, test } from '@playwright/test';

const historyPath = '/api/v1/sample-history';
const nav = page => page.getByRole('navigation', { name: 'Trading workspace' });
const link = (page, name) => nav(page).getByRole('link', { name, exact: true });
const feed = (page, label) => page.getByRole('status', { name: `Sample data feed: ${label}`, exact: true });
const storage = (page, label) => page.getByRole('status', { name: `Sample storage: ${label}`, exact: true });
const details = page => page.getByRole('region', { name: 'Account snapshot', exact: true });
const saved = page => page.getByRole('region', { name: /^Saved snapshots/ });

async function openHistory(page) {
  await page.goto('/#sample-history');
  await expect(page.getByRole('heading', { level: 1, name: 'Sample History', exact: true })).toBeVisible();
}

test('overview, saved SQLite history and illustrative trade history share one read-only origin', async ({ page }) => {
  const calls = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) calls.push({ method: request.method(), url: new URL(request.url()) });
  });
  await page.goto('/');
  await expect(feed(page, 'Fresh')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Web API: Online', exact: true })).toBeVisible();
  await expect(page.getByText('MT5 not connected', { exact: true })).toBeVisible();
  const historyResponse = page.waitForResponse(response => new URL(response.url()).pathname === historyPath && response.ok());
  await link(page, 'Sample History').click();
  const { snapshots } = await (await historyResponse).json();
  await expect(page).toHaveURL(/#sample-history$/);
  await expect(storage(page, 'Available')).toBeVisible();
  await expect(saved(page).getByRole('button')).toHaveCount(2);
  await expect(details(page).getByText('$2,491.76', { exact: true })).toBeVisible();
  const stamps = details(page).locator('time');
  await expect(stamps).toHaveCount(2);
  await expect(stamps.nth(0)).toHaveAttribute('datetime', snapshots[0].as_of);
  await expect(stamps.nth(1)).toHaveAttribute('datetime', snapshots[0].stored_at_utc);
  const older = saved(page).getByRole('button', { name: /14:30:32 UTC/ });
  await older.click();
  await expect(older).toHaveAttribute('aria-pressed', 'true');
  await expect(details(page).getByText('$2,486.72', { exact: true })).toBeVisible();
  await expect(stamps.nth(0)).toHaveAttribute('datetime', snapshots[1].as_of);
  await expect(stamps.nth(1)).toHaveAttribute('datetime', snapshots[1].stored_at_utc);
  await expect(details(page).getByRole('rowheader', { name: 'XAUUSD', exact: true })).toBeVisible();
  await link(page, 'Trade history').click();
  await expect(page.getByRole('heading', { name: 'Closed trade ledger', exact: true })).toBeVisible();
  await expect(storage(page, 'Available')).toHaveCount(0);
  await link(page, 'Overview').click();
  await expect(feed(page, 'Fresh')).toBeVisible();
  expect(new Set(calls.map(call => call.url.pathname))).toEqual(new Set(['/api/v1/status', '/api/v1/sample-snapshot', historyPath]));
  for (const call of calls) {
    expect(call.method).toBe('GET');
    expect(call.url.origin).toBe(new URL(page.url()).origin);
  }
});

test('a failed archive read clears saved values, can retry, and does not take down Overview', async ({ page }) => {
  let down = false;
  await page.route('**' + historyPath, route => down ? route.fulfill({ status: 503, json: { error: 'sample_history_unavailable' } }) : route.continue());
  await openHistory(page);
  await expect(storage(page, 'Available')).toBeVisible();
  down = true;
  await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
  await expect(storage(page, 'Unavailable')).toBeVisible();
  await expect(saved(page)).toHaveCount(0);
  await expect(details(page)).toHaveCount(0);
  await link(page, 'Overview').click();
  await expect(feed(page, 'Fresh')).toBeVisible();
  await link(page, 'Sample History').click();
  await expect(storage(page, 'Unavailable')).toBeVisible();
  down = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(storage(page, 'Available')).toBeVisible();
  await expect(details(page).getByText('$2,491.76', { exact: true })).toBeVisible();
});

test('a valid zero-record archive remains distinct from unavailable', async ({ page }) => {
  await page.route('**' + historyPath, async route => {
    const resp = await route.fetch(); const body = await resp.json();
    await route.fulfill({ response: resp, json: { ...body, snapshots: [] } });
  });
  await openHistory(page);
  await expect(storage(page, 'Empty')).toBeVisible();
  await expect(page.getByText('No saved snapshots', { exact: true })).toBeVisible();
  await expect(details(page)).toHaveCount(0);
});

test('an invalid history reply cannot show saved amounts or claim live data', async ({ page }) => {
  await page.route('**' + historyPath, async route => {
    const resp = await route.fetch(); const body = await resp.json();
    await route.fulfill({ response: resp, json: { ...body, mt5_connection: 'connected' } });
  });
  await openHistory(page);
  await expect(storage(page, 'Unavailable')).toBeVisible();
  await expect(saved(page)).toHaveCount(0);
  await expect(details(page)).toHaveCount(0);
});

test('simulated Overview outage is independent of the saved history and the local preference', async ({ page }) => {
  await page.goto('/');
  await expect(feed(page, 'Fresh')).toBeVisible();
  await page.getByRole('button', { name: 'Select GBPUSD for preview' }).click();
  await page.getByLabel('Delivery test', { exact: true }).selectOption('outage');
  await expect(feed(page, 'Unavailable')).toBeVisible();
  await link(page, 'Sample History').click();
  await expect(storage(page, 'Available')).toBeVisible();
  await expect(saved(page).getByRole('button')).toHaveCount(2);
  await link(page, 'Overview').click();
  await expect(page.getByRole('button', { name: /current GBPUSD/ })).toBeVisible();
  await expect(feed(page, 'Unavailable')).toBeVisible();
  await expect(page.getByText('Locked', { exact: true })).toBeVisible();
});

test('mobile navigation and archived values fit the page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await link(page, 'Sample History').click();
  await expect(storage(page, 'Available')).toBeVisible();
  await saved(page).getByRole('button', { name: /14:30:32 UTC/ }).click();
  await expect(details(page).getByText('$2,486.72', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
