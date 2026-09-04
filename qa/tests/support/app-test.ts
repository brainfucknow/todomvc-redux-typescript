import { test as base } from '@playwright/test';
import { Screen } from './screen';
import { FixtureName, StubControl } from './stub-control';

interface AppFixtures {
  stub: StubControl;
  screen: Screen;
  openApp: (fixture: FixtureName) => Promise<void>;
  proxiedBackend: boolean;
}

/** Set by each suite config; see `qa/suite-config.ts`. */
export interface AppOptions {
  controlOrigin: string;
}

export const test = base.extend<AppFixtures & AppOptions>({
  controlOrigin: ['', { option: true }],

  stub: async ({ request, controlOrigin }, use) => {
    await use(new StubControl(request, controlOrigin));
  },

  /**
   * The control channel lives on the stub's own origin exactly when a Vite
   * server is serving the app, which is also exactly when the browser's
   * connection terminates at a proxy rather than at the stub.
   */
  proxiedBackend: async ({ controlOrigin }, use) => {
    await use(controlOrigin !== '');
  },

  screen: async ({ page }, use) => {
    await use(new Screen(page));
  },

  openApp: async ({ page, stub }, use) => {
    await use(async (fixture: FixtureName) => {
      await stub.reset(fixture);
      await page.goto('/');
    });
  },
});

export { expect } from '@playwright/test';
export * from './screen';
export * from './stub-control';
