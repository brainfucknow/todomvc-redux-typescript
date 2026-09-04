# 18 Editing a todo fails

## Workflow

When the edit request fails, the row leaves edit mode and reverts to its old
text.

## Preconditions

- Fixture **ONE_ACTIVE**.
- Fault **transport(PATCH, api/todos/1)** armed after the app has loaded.

## Inputs

The text `Buy oat milk`.

## Steps

1. Open the app and wait for the list to hold 1 row.
2. Arm the fault.
3. Double-click the label of the row reading "Buy milk".
4. Select all text in the edit field, type `Buy oat milk`, and press Enter.
5. Wait until the stub reports the faulted request (synchronization only).
6. Observe the row.

## Expected observable results

- The row is out of edit mode and shows a label.
- The label reads "Buy milk": the typed text was discarded.
- The count still reads "1 item left".
- No error message appears.

## Notes

- Edit mode closes on Enter regardless of the outcome, so the only sign of
  failure is the text snapping back. Recorded, not fixed.
