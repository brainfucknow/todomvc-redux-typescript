import { expect, expectShownActive, expectShownComplete, test } from './support/app-test';

// Procedure qa/procedures/10-toggle-all.md
test('toggle-all marks all, unmarks all, and is lost on reload', async ({ page, openApp, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);
  await expect(screen.toggleAllCheckbox).not.toBeChecked();

  await screen.toggleAllChevron.click();

  await expect(screen.count).toHaveText('No items left');
  await expectShownComplete(screen, 'Buy milk');
  await expectShownComplete(screen, 'Write tests');
  await expectShownComplete(screen, 'Ship it');
  await expect(screen.toggleAllCheckbox).toBeChecked();
  await expect(screen.clearCompleted).toBeVisible();

  await screen.toggleAllChevron.click();

  await expect(screen.count).toHaveText('3 items left');
  await expectShownActive(screen, 'Buy milk');
  await expectShownActive(screen, 'Write tests');
  await expectShownActive(screen, 'Ship it');
  await expect(screen.toggleAllCheckbox).not.toBeChecked();
  await expect(screen.clearCompleted).toHaveCount(0);

  await page.reload();

  await expect(screen.rows).toHaveCount(3);
  await expectShownActive(screen, 'Buy milk');
  await expectShownComplete(screen, 'Write tests');
  await expectShownActive(screen, 'Ship it');
  await expect(screen.count).toHaveText('2 items left');
});
