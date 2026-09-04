import { expect, expectSelectedFilter, test } from './support/app-test';

// Procedure qa/procedures/12-filter-all.md
test('All is the starting filter and returning to it shows every todo', async ({ openApp, screen }) => {
  await openApp('THREE_MIXED');

  await expect(screen.rows).toHaveCount(3);
  await expectSelectedFilter(screen, 'All');

  await screen.filterLink('Completed').click();
  await expect(screen.rows).toHaveCount(1);

  await screen.filterLink('All').click();

  await expectSelectedFilter(screen, 'All');
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);
  await expect(screen.count).toHaveText('2 items left');
});
