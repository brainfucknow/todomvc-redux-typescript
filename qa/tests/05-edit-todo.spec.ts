import { expect, expectShownActive, test } from './support/app-test';

// Procedure qa/procedures/05-edit-todo.md
test('double-click opens the editor and Enter saves; Escape does not cancel', async ({ page, openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await screen.openEditor('Buy milk');

  await expect(screen.editField).toHaveCount(1);
  await expect(screen.editField).toHaveValue('Buy milk');
  await expect(screen.editField).toBeFocused();
  await expect(screen.editingRow.locator('label')).toHaveCount(0);
  await expect(screen.editingRow.locator('input.toggle')).toHaveCount(0);
  await expect(screen.editingRow.locator('button.destroy')).toHaveCount(0);
  await expect(screen.rowLabels).toHaveText(['Write tests', 'Ship it']);

  await screen.editField.fill('Buy oat milk');
  await screen.editField.press('Escape');

  await expect(screen.editField).toHaveCount(1);
  await expect(screen.editField).toHaveValue('Buy oat milk');

  await screen.editField.press('Enter');

  await expect(screen.rowLabels).toHaveText(['Buy oat milk', 'Write tests', 'Ship it']);
  await expect(screen.editField).toHaveCount(0);
  await expectShownActive(screen, 'Buy oat milk');
  await expect(screen.count).toHaveText('2 items left');

  await page.reload();
  await expect(screen.rowLabels).toHaveText(['Buy oat milk', 'Write tests', 'Ship it']);
});
