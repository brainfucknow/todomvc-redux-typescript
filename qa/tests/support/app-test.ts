import { test as base } from '@playwright/test';
import { Screen } from './screen';
import { FixtureName, StubControl } from './stub-control';

interface AppFixtures {
  stub: StubControl;
  screen: Screen;
  openApp: (fixture: FixtureName) => Promise<void>;
}

export const test = base.extend<AppFixtures>({
  stub: async ({ request }, use) => {
    await use(new StubControl(request));
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
