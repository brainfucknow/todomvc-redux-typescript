import { expect, expectSelectedFilter, expectShownActive, expectShownComplete, test } from './support/app-test';

// Procedure qa/procedures/01-initial-load.md
test('a successful load replaces the seed row with the backend todos', async ({ openApp, screen }) => {
  await openApp('THREE_MIXED');

  await expect(screen.rows).toHaveCount(3);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);

  await expectShownComplete(screen, 'Write tests');
  await expectShownActive(screen, 'Buy milk');
  await expectShownActive(screen, 'Ship it');
  await expect(screen.row('Use Redux')).toHaveCount(0);

  await expect(screen.count).toHaveText('2 items left');
  await expect(screen.filterLinks).toHaveText(['All', 'Active', 'Completed']);
  await expectSelectedFilter(screen, 'All');
  await expect(screen.clearCompleted).toBeVisible();

  await expect(screen.newTodoField).toHaveValue('');
  await expect(screen.newTodoField).toBeFocused();
});
