# 06 Edit a todo, committed by clicking away

## Workflow

Leaving an open edit field saves it. The text is saved exactly as typed, without
the trimming Enter applies.

## Preconditions

- Fixture **ONE_ACTIVE**.
- No faults.

## Inputs

The text `  Buy oat milk  ` (two leading and two trailing spaces).

## Steps

1. Open the app and wait for the list to hold 1 row.
2. Double-click the label of the row reading "Buy milk".
3. Select all text in the edit field and type `  Buy oat milk  `.
4. Click the header heading "todos".
5. Wait for the row to leave edit mode.
6. Double-click the row's label again.

## Expected observable results

After step 5:

- The row is out of edit mode and shows a label.
- The label's visible text is "Buy oat milk".
- The count still reads "1 item left".

After step 6:

- The edit field holds `  Buy oat milk  ` with both leading and trailing spaces
  intact, showing the saved text was never trimmed.

## Notes

- Enter and click-away take different paths: Enter saves the trimmed text,
  clicking away saves the raw field value. Recorded as observed.
- Clicking away with an empty field deletes the row; see procedure 07.
