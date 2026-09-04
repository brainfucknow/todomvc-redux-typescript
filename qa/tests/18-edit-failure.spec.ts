import { expect, expectNoErrorUi, test, waitForFaultedRequest } from './support/app-test';

// Procedure qa/procedures/18-edit-failure.md
test('a failed edit closes edit mode and snaps the text back', async ({ page, openApp, stub, screen }) => {
  await openApp('ONE_ACTIVE');
  await expect(screen.rows).toHaveCount(1);

  await stub.armTransportFault('PATCH', '/api/todos/1');
  await screen.openEditor('Buy milk');
  await screen.editField.fill('Buy oat milk');
  await screen.editField.press('Enter');
  await waitForFaultedRequest(stub, 'PATCH', '/api/todos/1');

  await expect(screen.editingRow).toHaveCount(0);
  await expect(screen.rowLabels).toHaveText(['Buy milk']);
  await expect(screen.count).toHaveText('1 item left');
  await expectNoErrorUi(page);
});
