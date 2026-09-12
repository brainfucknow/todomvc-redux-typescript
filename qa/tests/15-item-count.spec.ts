import { expect, test } from './support/app-test';

// Procedure qa/procedures/15-item-count.md
test('the count reads plural, singular and "No items left"', async ({ openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await expect(screen.count).toHaveText('2 items left');

  await screen.checkboxOf('Buy milk').click();
  await expect(screen.count).toHaveText('1 item left');

  await screen.checkboxOf('Ship it').click();
  await expect(screen.count).toHaveText('No items left');

  await screen.checkboxOf('Write tests').click();
  await expect(screen.count).toHaveText('1 item left');
});
