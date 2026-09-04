import { expect, test } from './support/app-test';

// Procedure qa/procedures/06-edit-todo-blur-commit.md
test('clicking away saves the edit, untrimmed', async ({ openApp, screen }) => {
  await openApp('ONE_ACTIVE');
  await expect(screen.rows).toHaveCount(1);

  await screen.openEditor('Buy milk');
  await screen.editField.fill('  Buy oat milk  ');
  await screen.heading.click();

  await expect(screen.editingRow).toHaveCount(0);
  await expect(screen.rowLabels).toHaveText(['Buy oat milk']);
  await expect(screen.count).toHaveText('1 item left');

  await screen.openEditor('Buy oat milk');
  await expect(screen.editField).toHaveValue('  Buy oat milk  ');
});
