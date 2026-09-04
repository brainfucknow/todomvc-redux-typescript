import { expect, expectShownActive, expectShownComplete, test } from './support/app-test';

// Procedure qa/procedures/09-toggle-todo.md
test('a row checkbox completes and reactivates that todo', async ({ page, openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await screen.checkboxOf('Buy milk').click();

  await expect(screen.count).toHaveText('1 item left');
  await expectShownComplete(screen, 'Buy milk');
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);
  await expectShownComplete(screen, 'Write tests');
  await expectShownActive(screen, 'Ship it');

  await screen.checkboxOf('Buy milk').click();

  await expect(screen.count).toHaveText('2 items left');
  await expectShownActive(screen, 'Buy milk');

  await page.reload();
  await expect(screen.rows).toHaveCount(3);
  await expectShownActive(screen, 'Buy milk');
});
