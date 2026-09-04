import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import type { AppOptions } from './tests/support/app-test';

type WebServer = PlaywrightTestConfig['webServer'];

/** The stub is the only backend, so it is also the only source of shared state. */
const STUB_BACKEND_PORT = Number(process.env.QA_STUB_BACKEND_PORT || 4000);

interface Suite {
  baseURL: string;
  /**
   * Where `/__qa/` lives. Empty when the stub serves the app too; the stub's own
   * origin when a Vite server serves it and proxies only `/api`.
   */
  controlOrigin: string;
  webServer: WebServer;
}

export function defineSuite({ baseURL, controlOrigin, webServer }: Suite) {
  return defineConfig<AppOptions>({
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

    use: { baseURL, controlOrigin, trace: 'retain-on-failure' },

    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

    webServer,
  });
}

const managed = {
  reuseExistingServer: !process.env.CI,
  stdout: 'pipe',
  stderr: 'pipe',
} as const;

export function stubServer(port: number) {
  return {
    ...managed,
    command: 'node stub/main.js',
    url: `http://127.0.0.1:${port}/__qa/faults`,
    env: { QA_STUB_PORT: String(port) },
  };
}

/**
 * The app served by Vite, with `/api` proxied to the stub. `dist/` must exist
 * either way: the stub refuses to start without a built app.
 */
export function defineProxiedSuite(script: 'dev' | 'preview', port: number) {
  return defineSuite({
    baseURL: `http://localhost:${port}`,
    controlOrigin: `http://127.0.0.1:${STUB_BACKEND_PORT}`,
    webServer: [
      stubServer(STUB_BACKEND_PORT),
      { ...managed, command: `npm run ${script} -- --port ${port} --strictPort`, cwd: '..', url: `http://localhost:${port}/` },
    ],
  });
}
