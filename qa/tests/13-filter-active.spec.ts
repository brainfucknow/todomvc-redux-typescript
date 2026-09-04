import { expect, expectSelectedFilter, test } from './support/app-test';

// Procedure qa/procedures/13-filter-active.md
test('Active hides complete todos', async ({ openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await screen.filterLink('Active').click();

  await expect(screen.rows).toHaveCount(2);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Ship it']);
  await expectSelectedFilter(screen, 'Active');
  await expect(screen.count).toHaveText('2 items left');
  await expect(screen.clearCompleted).toBeVisible();

  await screen.checkboxOf('Buy milk').click();

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Ship it']);
  await expect(screen.count).toHaveText('1 item left');
});
