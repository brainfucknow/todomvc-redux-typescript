import { expect, test } from './support/app-test';

// Procedure qa/procedures/08-delete-todo.md
test('the destroy button, hidden until the row is hovered, removes the todo', async ({ page, openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);
  await expect(screen.destroyButtonOf('Write tests')).toBeHidden();

  await screen.row('Write tests').hover();

  await expect(screen.destroyButtonOf('Write tests')).toBeVisible();
  await expect(screen.destroyButtonOf('Buy milk')).toBeHidden();
  await expect(screen.destroyButtonOf('Ship it')).toBeHidden();

  await screen.destroyButtonOf('Write tests').click();

  await expect(screen.rows).toHaveCount(2);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Ship it']);
  await expect(screen.count).toHaveText('2 items left');
  await expect(screen.clearCompleted).toHaveCount(0);

  await page.reload();
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Ship it']);
});
