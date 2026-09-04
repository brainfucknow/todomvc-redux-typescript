import { expect, expectShownActive, test } from './support/app-test';

// Procedure qa/procedures/03-add-todo.md
test('Enter appends a todo through a backend round trip', async ({ page, openApp, screen }) => {
  await openApp('ONE_ACTIVE');
  await expect(screen.rows).toHaveCount(1);

  await screen.addTodo('Write tests');

  await expect(screen.rows).toHaveCount(2);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests']);
  await expectShownActive(screen, 'Write tests');
  await expect(screen.newTodoField).toHaveValue('');
  await expect(screen.count).toHaveText('2 items left');

  await page.reload();
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests']);
});
