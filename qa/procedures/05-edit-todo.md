# 05 Edit a todo, committed with Enter

## Workflow

Double-clicking a row's label opens an edit field; Enter saves the new text.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

The text `Buy oat milk`, replacing `Buy milk`.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Double-click the label of the row reading "Buy milk".
3. Observe the row.
4. Select all text in the edit field and type `Buy oat milk`.
5. Press Escape.
6. Observe the row.
7. Press Enter.
8. Wait for the row's label to read "Buy oat milk".

## Expected observable results

After step 3:

- The row shows an edit field instead of its label, checkbox and destroy button.
- The edit field holds `Buy milk` and has keyboard focus.
- The other two rows are unchanged and still show their labels.

After step 6:

- The row is still in edit mode and the edit field still reads `Buy oat milk`:
  Escape neither cancels the edit nor restores the old text.

After step 8:

- The row shows a label again, reading "Buy oat milk".
- The row keeps its position, first of three.
- Its complete state is unchanged: not complete.
- The count still reads "2 items left".
- Reloading the page still shows "Buy oat milk".

## Notes

- Escape doing nothing is a departure from the TodoMVC reference behavior, where
  Escape abandons the edit. Recorded, not fixed.
- Surrounding spaces are trimmed when Enter commits. Committing by clicking away
  does not trim; see procedure 06.
- Only one row can be in edit mode at a time in practice, because opening an edit
  on another row first commits nothing and each row tracks its own mode; this
  procedure does not exercise two rows at once.
