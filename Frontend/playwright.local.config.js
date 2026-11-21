import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './LocalWorkspace/tests', testMatch: '**/*.spec.js', workers: 2, fullyParallel: true, reporter: 'list',
  use: { baseURL: process.env.LOCAL_WORKSPACE_BASE_URL || 'http://127.0.0.1:5182', browserName: 'chromium', viewport: { width: 1440, height: 900 } },
});
