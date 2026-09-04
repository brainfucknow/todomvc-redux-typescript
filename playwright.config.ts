import { defineConfig } from '@playwright/test'

// The QA tier: the E2E procedures in `qa/`, executed. Every spec under `e2e/`
// is one procedure, and every `test.step` is one lettered row of it.
//
// Serial, one worker: the procedures start dev and preview servers, bind port
// 4000, and edit a source file to check hot reload. None of that survives being
// run twice at once.
//
// Chromium comes from the preinstalled browsers `PLAYWRIGHT_BROWSERS_PATH`
// points at, so the version here is pinned to the build that is there.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  reporter: 'list',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    browserName: 'chromium',
    headless: true,
  },
})
