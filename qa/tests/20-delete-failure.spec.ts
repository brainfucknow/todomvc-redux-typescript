import { expect, expectNoErrorUi, expectShownComplete, test, waitForFaultedRequest } from './support/app-test';

// Procedure qa/procedures/20-delete-failure.md
test('a delete that fails at the transport level keeps the row', async ({ page, openApp, stub, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await stub.armTransportFault('DELETE', '/api/todos/2');
  await screen.deleteTodo('Write tests');
  await waitForFaultedRequest(stub, 'DELETE', '/api/todos/2');

  await expect(screen.rows).toHaveCount(3);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);
  await expectShownComplete(screen, 'Write tests');
  await expect(screen.count).toHaveText('2 items left');
  await expectNoErrorUi(page);
});
