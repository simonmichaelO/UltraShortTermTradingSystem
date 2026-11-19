import { defineConfig } from '@playwright/test';

// Start the preview in another terminal before running this test suite.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: process.env.PREVIEW_BASE_URL || 'http://localhost:5173',
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
  },
});
