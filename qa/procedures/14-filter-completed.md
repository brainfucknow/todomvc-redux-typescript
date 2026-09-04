# 14 The Completed filter

## Workflow

Completed hides active todos, and shows an empty list when nothing is complete.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Click "Completed".
3. Wait for the list to hold 1 row.
4. Click the checkbox on the row reading "Write tests".
5. Wait for the list to be empty.

## Expected observable results

After step 3:

- The list holds only "Write tests", shown complete.
- Completed is highlighted; All and Active are not.
- The count reads "2 items left".

After step 5:

- The list is empty: the todo left this view when it stopped being complete.
- The footer is still shown, with the filter links and the count reading
  "3 items left", because todos still exist even though none are visible.
- The clear-completed button is gone.
- The toggle-all chevron is still shown and reads unchecked.

## Notes

- An empty list under a filter looks like the empty-list screen of procedure 02
  but is not: there the footer is absent, here it remains.
