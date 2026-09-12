# 20 Deleting a todo fails

## Workflow

When the delete request fails at the transport level, the row stays.

## Preconditions

- Fixture **THREE_MIXED**.
- Fault **transport(DELETE, api/todos/2)** armed after the app has loaded.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Arm the fault.
3. Hover the row reading "Write tests" and click its destroy button.
4. Wait until the stub reports the faulted request (synchronization only).
5. Observe the list.

## Expected observable results

- The list still holds 3 rows, in fixture order.
- "Write tests" is still present and still shown complete.
- The count still reads "2 items left".
- No error message appears.

## Notes

- Only a transport-level failure keeps the row. A delete answered with an HTTP
  error status removes the row anyway; procedure 21 characterizes that.
