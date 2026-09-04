import { expect, test } from './support/app-test';

// Procedure qa/procedures/07-edit-todo-to-empty-deletes.md
test('committing an empty edit deletes the todo', async ({ page, openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await screen.openEditor('Ship it');
  await screen.editField.fill('');
  await screen.editField.press('Enter');

  await expect(screen.rows).toHaveCount(2);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests']);
  await expect(screen.editingRow).toHaveCount(0);
  await expect(screen.count).toHaveText('1 item left');

  await page.reload();
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests']);
});
