import { expect, expectNoErrorUi, expectShownActive, test, waitForFaultedRequest } from './support/app-test';

// Procedure qa/procedures/19-toggle-failure.md
test('a failed toggle never moves the checkbox', async ({ page, openApp, stub, screen }) => {
  await openApp('ONE_ACTIVE');
  await expect(screen.rows).toHaveCount(1);

  await stub.armTransportFault('PATCH', '/api/todos/1');
  await screen.checkboxOf('Buy milk').click();
  await waitForFaultedRequest(stub, 'PATCH', '/api/todos/1');

  await expectShownActive(screen, 'Buy milk');
  await expect(screen.count).toHaveText('1 item left');
  await expect(screen.toggleAllCheckbox).not.toBeChecked();
  await expectNoErrorUi(page);
});
