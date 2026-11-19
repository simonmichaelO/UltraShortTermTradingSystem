import { defineConfig } from '@playwright/test';

// Build the UI and start the integrated FastAPI preview in another terminal first.
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
