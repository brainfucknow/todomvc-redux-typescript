# 19 Toggling one todo fails

## Workflow

When the toggle request fails, the checkbox stays as it was.

## Preconditions

- Fixture **ONE_ACTIVE**.
- Fault **transport(PATCH, api/todos/1)** armed after the app has loaded.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 1 row.
2. Arm the fault.
3. Click the checkbox on the row reading "Buy milk".
4. Wait until the stub reports the faulted request (synchronization only).
5. Observe the row.

## Expected observable results

- The row's checkbox reads unchecked and its label is not struck through.
- The count still reads "1 item left".
- The toggle-all chevron still reads unchecked.
- No error message appears.

## Notes

- Nothing flips and then flips back: the checkbox is driven by stored state, not
  by the click, so a failed toggle looks exactly like a click that never landed.
