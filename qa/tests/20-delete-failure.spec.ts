import { expect, expectNoErrorUi, expectShownComplete, test, waitForFaultedRequest } from './support/app-test';

// Procedure qa/procedures/20-delete-failure.md
//
// The one procedure that runs only under `npm run test:e2e`. It needs a
// transport failure, and no proxy can deliver one: Vite answers the stub's
// destroyed connection with a well-formed `502`. The client ignores HTTP status
// (procedure 21) and `removeTodo` is the single action creator with
// `json: false`, so it never reads a body either — nothing is left to tell that
// `502` apart from a successful delete, and the row goes. That is a property of
// proxying, not a defect in the app or in this procedure, and the fix is not to
// start checking `response.ok`: the ignored status is behavior `PLAN.md` records
// and tasks 09 and 10 preserve deliberately. The supported harness serves the
// app and the control channel on the stub's one origin, where the real
// condition reaches the browser and this procedure passes.
test('a delete that fails at the transport level keeps the row', async ({
  page,
  openApp,
  stub,
  screen,
  proxiedBackend,
}) => {
  test.skip(proxiedBackend, 'a proxy turns the transport fault into a 502, which this client reads as success');

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
