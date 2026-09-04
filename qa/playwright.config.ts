import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.QA_STUB_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  outputDir: './.artifacts/test-results',
  reporter: [['list'], ['html', { outputFolder: './.artifacts/report', open: 'never' }]],

  // One stub backend serves the whole suite, so tests must not overlap.
  workers: 1,
  fullyParallel: false,

  // A retry would hide the flake this suite exists to rule out.
  retries: 0,
  forbidOnly: !!process.env.CI,

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'node stub/main.js',
    url: `${baseURL}/__qa/faults`,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
