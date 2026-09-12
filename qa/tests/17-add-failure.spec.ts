import { expect, expectNoErrorUi, test, waitForFaultedRequest } from './support/app-test';

// Procedure qa/procedures/17-add-failure.md
test('a failed add loses the typed text and adds no row', async ({ page, openApp, stub, screen }) => {
  await openApp('ONE_ACTIVE');
  await expect(screen.rows).toHaveCount(1);

  await stub.armTransportFault('POST', '/api/todos/');
  await screen.addTodo('Write tests');
  await waitForFaultedRequest(stub, 'POST', '/api/todos/');

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Buy milk']);
  await expect(screen.row('Write tests')).toHaveCount(0);
  await expect(screen.newTodoField).toHaveValue('');
  await expect(screen.count).toHaveText('1 item left');
  await expectNoErrorUi(page);
});
