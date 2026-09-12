# 07 Editing a todo to empty deletes it

## Workflow

Committing an edit with no text removes the todo instead of saving it.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

An empty edit field.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Double-click the label of the row reading "Ship it".
3. Clear the edit field.
4. Press Enter.
5. Wait for the list to hold 2 rows.

## Expected observable results

- The remaining rows read "Buy milk" and "Write tests".
- No row is in edit mode.
- The count reads "1 item left".
- Reloading the page still shows 2 rows: the deletion reached the backend.

## Notes

- The same happens when the field holds only spaces and Enter is pressed, because
  Enter trims before the emptiness check.
- Clicking away from an empty edit field also deletes the row, without trimming;
  a field holding only spaces and committed that way is saved as spaces instead,
  per procedure 06.
