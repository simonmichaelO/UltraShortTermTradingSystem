import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './SampleHistory/tests',
  testMatch: '**/*.spec.js',
  workers: 2,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.SAMPLE_HISTORY_BASE_URL || 'http://127.0.0.1:5178',
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
  },
});
