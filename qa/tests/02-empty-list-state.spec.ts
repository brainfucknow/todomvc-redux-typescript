import { expect, expectSelectedFilter, test } from './support/app-test';

// Procedure qa/procedures/02-empty-list-state.md
test('an empty list offers no footer, no filters and no toggle-all', async ({ openApp, screen }) => {
  await openApp('EMPTY');

  await expect(screen.rows).toHaveCount(0);
  await expect(screen.footer).toHaveCount(0);
  await expect(screen.count).toHaveCount(0);
  await expect(screen.filterLinks).toHaveCount(0);
  await expect(screen.clearCompleted).toHaveCount(0);
  await expect(screen.toggleAllChevron).toHaveCount(0);

  await expect(screen.newTodoField).toBeVisible();
  await expect(screen.newTodoField).toHaveValue('');
  await expect(screen.newTodoField).toBeFocused();

  await screen.addTodo('Buy milk');

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Buy milk']);
  await expect(screen.checkboxOf('Buy milk')).not.toBeChecked();

  await expect(screen.footer).toBeVisible();
  await expect(screen.count).toHaveText('1 item left');
  await expectSelectedFilter(screen, 'All');
  await expect(screen.toggleAllChevron).toBeVisible();
  await expect(screen.toggleAllCheckbox).not.toBeChecked();
  await expect(screen.clearCompleted).toHaveCount(0);
});
