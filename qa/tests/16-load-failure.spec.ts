import {
  expect,
  expectNoErrorUi,
  expectShownActive,
  test,
  waitForFaultedRequest,
} from './support/app-test';

// Procedure qa/procedures/16-load-failure.md
test('a failed load leaves the hardcoded seed row on screen, silently', async ({ page, stub, screen }) => {
  await stub.reset('THREE_MIXED');
  await stub.armTransportFault('GET', '/api/todos/');

  await page.goto('/');
  await waitForFaultedRequest(stub, 'GET', '/api/todos/');

  await expect(screen.rows).toHaveCount(1);
  await expect(screen.rowLabels).toHaveText(['Use Redux']);
  await expectShownActive(screen, 'Use Redux');
  await expect(screen.count).toHaveText('1 item left');
  await expect(screen.footer).toBeVisible();
  await expect(screen.filterLinks).toHaveText(['All', 'Active', 'Completed']);
  await expect(screen.toggleAllChevron).toBeVisible();
  await expectNoErrorUi(page);

  await stub.clearFaults();
  await page.reload();

  await expect(screen.rowLabels).toHaveText(['Buy milk', 'Write tests', 'Ship it']);
});
