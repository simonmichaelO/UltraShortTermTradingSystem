import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.AUTH_LAB_BASE_URL ?? 'http://127.0.0.1:5175';
const tlsTestPort = process.env.AUTH_LAB_TLS_TEST_PORT;
// Only used to exercise the hosted cookie policy with a local self-signed
// certificate. Route the preview-style test host to loopback, never to E2B.
if (tlsTestPort && (!/^\d{1,5}$/.test(tlsTestPort) || new URL(baseURL).origin !== 'https://5174-tickframe-qa.e2b.app')) {
  throw new Error('Use the documented synthetic preview host for the TLS browser test.');
}
const localTLS = tlsTestPort ? {
  ignoreHTTPSErrors: true,
  launchOptions: { args: [
    '--no-proxy-server',
    `--host-resolver-rules=MAP 5174-tickframe-qa.e2b.app 127.0.0.1:${tlsTestPort}`,
    '--test-third-party-cookie-phaseout',
    // The mock public parent embeds a loopback TLS endpoint in this QA run.
    '--disable-features=LocalNetworkAccessChecks',
  ] },
} : {};

// Start the isolated loopback Access Lab on 5175 before running this suite.
export default defineConfig({
  testDir: './AuthLab/tests',
  timeout: 30_000,
  workers: 1,
  outputDir: 'test-results/auth',
  use: {
    baseURL, ...localTLS,
    trace: 'off', screenshot: 'off', video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
