# 13 The Active filter

## Workflow

Active hides complete todos.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Click "Active".
3. Wait for the list to hold 2 rows.
4. Click the checkbox on the row reading "Buy milk".
5. Wait for the list to hold 1 row.

## Expected observable results

After step 3:

- The list holds "Buy milk" and "Ship it", in that order.
- "Write tests" is not shown.
- Active is highlighted; All and Completed are not.
- The count reads "2 items left".
- The clear-completed button is still present, though the complete todo it acts
  on is hidden.

After step 5:

- The list holds only "Ship it": completing a todo removes it from this view.
- The count reads "1 item left".

## Notes

- The filter is not saved anywhere: reloading returns to All.
