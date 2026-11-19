import { expect, test } from '@playwright/test';

const PATH = '/api/v1/sample-history';
const ROUTE = '**' + PATH;
const state = (page, label) => page.getByRole('status', { name: `Sample storage: ${label}`, exact: true });
const detail = page => page.getByRole('region', { name: 'Account snapshot', exact: true });
const saved = page => page.getByRole('region', { name: 'Saved snapshots', exact: true });

async function open(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sample History' })).toBeVisible();
  await expect(state(page, 'Available')).toBeVisible();
}

test('loads both saved snapshots and selection uses only the read-only same-origin API', async ({ page }) => {
  const api = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) api.push({ method: request.method(), url: new URL(request.url()) });
  });
  await open(page);
  await expect(saved(page).getByRole('button')).toHaveCount(2);
  await expect(saved(page).getByRole('button', { name: /14:31:32 UTC/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(detail(page).getByText('$2,491.76', { exact: true })).toBeVisible();
  await expect(detail(page).getByText('Saved to SQLite')).toBeVisible();
  await expect(detail(page).getByRole('rowheader', { name: 'XAUUSD' })).toBeVisible();
  const old = saved(page).getByRole('button', { name: /14:30:32 UTC/ });
  await old.click();
  await expect(old).toHaveAttribute('aria-pressed', 'true');
  await expect(detail(page).getByText('$2,486.72', { exact: true })).toBeVisible();
  await expect(detail(page).getByText('+$31.24', { exact: true })).toBeVisible();
  await expect(page.getByText('MT5 disconnected', { exact: true })).toBeVisible();
  await expect(page.getByText('Live entries locked', { exact: true })).toBeVisible();
  expect(api.length).toBeGreaterThan(0);
  for (const request of api) {
    expect(request.method).toBe('GET');
    expect(request.url.origin).toBe(new URL(page.url()).origin);
    expect(request.url.pathname).toBe(PATH);
  }
});

test('an outage clears displayed amounts, does not look empty, and can recover', async ({ page }) => {
  let down = false;
  await page.route(ROUTE, route => down ? route.fulfill({ status: 503, json: { error: 'sample_history_unavailable' } }) : route.continue());
  await open(page);
  down = true;
  await page.getByRole('button', { name: 'Refresh history' }).click();
  await expect(state(page, 'Unavailable')).toBeVisible();
  await expect(detail(page)).toHaveCount(0);
  await expect(saved(page)).toHaveCount(0);
  await expect(page.getByText('No saved snapshots', { exact: true })).toHaveCount(0);
  down = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(state(page, 'Available')).toBeVisible();
  await expect(detail(page).getByText('$2,491.76', { exact: true })).toBeVisible();
});

test('an empty store has a distinct empty state without any account amounts', async ({ page }) => {
  await page.route(ROUTE, async route => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, snapshots: [] } });
  });
  await page.goto('/');
  await expect(state(page, 'Empty')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No saved snapshots' })).toBeVisible();
  await expect(detail(page)).toHaveCount(0);
});

test('an inconsistent response never displays sample values', async ({ page }) => {
  await page.route(ROUTE, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.snapshots[0].account.balance_cents += 1;
    await route.fulfill({ response, json: body });
  });
  await page.goto('/');
  await expect(state(page, 'Unavailable')).toBeVisible();
  await expect(detail(page)).toHaveCount(0);
});

test('the phone layout fits and switching snapshots still updates selected amounts', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  await saved(page).getByRole('button', { name: /14:30:32 UTC/ }).click();
  await expect(detail(page).getByText('$2,486.72', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
