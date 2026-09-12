import { expect, expectShownActive, test } from './support/app-test';

// Procedure qa/procedures/21-http-error-status-ignored.md, case A
test('a delete answered 500 still removes the row the server kept', async ({ page, openApp, stub, screen }) => {
  await openApp('THREE_MIXED');
  await expect(screen.rows).toHaveCount(3);

  await stub.armStatusFault('DELETE', '/api/todos/2', 500, 'boom');
  await screen.deleteTodo('Write tests');

  await expect(screen.rows).toHaveCount(2);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Ship it']);
  await expect(screen.count).toHaveText('2 items left');

  await stub.clearFaults();
  await page.reload();

  await expect(screen.rows).toHaveCount(3);
  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);
});

// Procedure qa/procedures/21-http-error-status-ignored.md, case B
test('a load answered 500 with a JSON body is rendered as the todo list', async ({ page, stub, screen }) => {
  await stub.reset('THREE_MIXED');
  await stub.armStatusFault('GET', '/api/todos/', 500, '[{"id":9,"text":"Server said 500","completed":false}]');

  await page.goto('/');

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Server said 500']);
  await expectShownActive(screen, 'Server said 500');
  await expect(screen.row('Use Redux')).toHaveCount(0);
  await expect(screen.count).toHaveText('1 item left');
});
