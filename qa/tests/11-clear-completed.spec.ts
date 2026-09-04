import { expect, expectShownComplete, test } from './support/app-test';

// Procedure qa/procedures/11-clear-completed.md
test('clear-completed removes complete rows locally and is lost on reload', async ({ page, openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);
  await expect(screen.clearCompleted).toBeVisible();

  await screen.clearCompleted.click();

  await expect(screen.rows).toHaveCount(2);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Ship it']);
  await expect(screen.count).toHaveText('2 items left');
  await expect(screen.clearCompleted).toHaveCount(0);

  await page.reload();

  await expect(screen.rows).toHaveCount(3);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);
  await expectShownComplete(screen, 'Write tests');
});
