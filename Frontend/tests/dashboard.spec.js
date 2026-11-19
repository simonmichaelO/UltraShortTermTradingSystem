import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('dashboard identifies samples and changes equity range without an API', async ({ page }) => {
  const errors = [];
  const apiCalls = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (['xhr', 'fetch'].includes(request.resourceType())) apiCalls.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByText('Example data only. This dashboard cannot place orders.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Select \w+ for preview$/ })).toHaveCount(8);
  await expect(page.getByRole('button', { name: '7D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '30D', exact: true }).click();
  await expect(page.getByRole('button', { name: '30D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', { name: /Simulated equity, 30D/ }).press('ArrowLeft');
  await expect(page.locator('.chart-tooltip')).toContainText('UTC · Sample');
  expect(errors).toEqual([]);
  expect(apiCalls).toEqual([]);
});

test('preview instrument and custom intensity persist, with caps validated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Trading controls', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Trading controls' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Active instrument').selectOption('GBPUSD');
  await dialog.getByRole('button', { name: 'Responsive', exact: true }).click();
  await expect(dialog.getByRole('slider')).toHaveValue('80');
  await dialog.getByRole('slider').fill('72');
  await dialog.getByLabel('Risk per trade (%)').fill('11');
  await dialog.getByRole('button', { name: 'Apply preview settings' }).click();
  await expect(dialog.getByLabel('Risk per trade (%)')).toHaveAttribute('aria-invalid', 'true');
  await dialog.getByLabel('Risk per trade (%)').fill('7.5');
  await dialog.getByRole('switch', { name: 'Shadow mode' }).click();
  await dialog.getByRole('button', { name: 'Apply preview settings' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: /current GBPUSD/ })).toBeVisible();
  await expect(page.getByText('Monitoring only', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /current GBPUSD/ })).toBeVisible();
  await page.getByRole('button', { name: 'Trading controls', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Trading controls' });
  await expect(dialog.getByRole('slider')).toHaveValue('72');
  await expect(dialog.getByLabel('Risk per trade (%)')).toHaveValue('7.5');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('emergency is a persistent preview latch and does not remove positions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Emergency stop preview', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Test emergency stop?' });
  await expect(dialog).toContainText('No broker connected');
  await dialog.getByRole('button', { name: 'Apply preview stop' }).click();
  await expect(page.getByText('Emergency stop', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review EURUSD sample position' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Emergency stop', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Emergency stop preview', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Clear preview stop?' });
  await dialog.getByRole('button', { name: 'Clear preview stop', exact: true }).click();
  await expect(page.getByText('Shadow only', { exact: true })).toBeVisible();
  await expect(page.getByText('Locked', { exact: true })).toBeVisible();
});

test('history filters and exports only sample data; analytics reports sample counts', async ({ page }) => {
  await page.goto('/#history');
  await expect(page.getByRole('heading', { name: 'Trade history', exact: true })).toBeVisible();
  await page.getByLabel('Filter history by instrument').selectOption('NZDUSD');
  await expect(page.getByText('No matching sample trades')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sample CSV' })).toBeDisabled();
  await page.getByLabel('Filter history by instrument').selectOption('EURUSD');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sample CSV' }).click();
  const file = await exported;
  expect(file.suggestedFilename()).toBe('tickframe-simulated-history.csv');
  const text = await readFile(await file.path(), 'utf8');
  expect(text).toContain('SIMULATED_FIXTURE');
  expect(text).not.toContain('XAUUSD');
  await page.getByRole('navigation').getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Per-instrument results' })).toBeVisible();
  await expect(page.locator('.analytics-table tbody tr')).toHaveCount(8);
});

test('alerts, shadow navigation and preview reset are usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  const alerts = page.getByRole('dialog', { name: 'Notifications' });
  await expect(alerts.getByText('2 unread')).toBeVisible();
  await alerts.getByRole('button', { name: 'Mark all read' }).click();
  await expect(alerts.getByText('0 unread')).toBeVisible();
  await alerts.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Select USDJPY for preview' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Shadow mode' }).click();
  await expect(page.getByRole('heading', { name: 'Shadow workspace' })).toBeVisible();
  await expect(page.locator('.shadow-status')).toContainText('USDJPY');
  await page.getByRole('navigation').getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  await page.getByRole('dialog', { name: 'Reset preview settings?' }).getByRole('button', { name: 'Reset preview', exact: true }).click();
  await expect(page.locator('.settings-grid').getByText('EURUSD')).toBeVisible();
});

test('phone viewport has no page overflow and mobile menu opens position details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Positions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Positions', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review EURUSD sample position' }).click();
  const detail = page.getByRole('dialog', { name: 'EURUSD position' });
  await expect(detail.getByText('Momentum breakout')).toBeVisible();
  await expect(detail.getByText('1.08645')).toBeVisible();
  await detail.getByRole('button', { name: 'Close dialog' }).click();
  await expect(detail).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
