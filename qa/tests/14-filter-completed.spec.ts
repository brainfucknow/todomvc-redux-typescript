import { expect, expectSelectedFilter, expectShownComplete, test } from './support/app-test';

// Procedure qa/procedures/14-filter-completed.md
test('Completed hides active todos and can show an empty list under a footer', async ({ openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await screen.filterLink('Completed').click();

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Write tests']);
  await expectShownComplete(screen, 'Write tests');
  await expectSelectedFilter(screen, 'Completed');
  await expect(screen.count).toHaveText('2 items left');

  await screen.checkboxOf('Write tests').click();

  await expect(screen.rows).toHaveCount(0);
  await expect(screen.footer).toBeVisible();
  await expect(screen.filterLinks).toHaveText(['All', 'Active', 'Completed']);
  await expect(screen.count).toHaveText('3 items left');
  await expect(screen.clearCompleted).toHaveCount(0);
  await expect(screen.toggleAllChevron).toBeVisible();
  await expect(screen.toggleAllCheckbox).not.toBeChecked();
});
