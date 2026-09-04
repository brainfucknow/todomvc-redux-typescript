# 12 The All filter

## Workflow

All is the filter the app starts on, and returning to it shows every todo again.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Observe the filter links.
3. Click "Completed" and wait for the list to hold 1 row.
4. Click "All".

## Expected observable results

After step 2:

- All is highlighted; Active and Completed are not.
- The list holds all 3 rows.

After step 4:

- All is highlighted again, Completed is not.
- The list holds 3 rows: "Buy milk", "Write tests", "Ship it", in fixture order.
- The count reads "2 items left", unchanged by filtering.

## Notes

- The filter lives in memory only. It does not appear in the URL, the back button
  does not undo it, and reloading returns to All.
- The count always reports active todos across all todos, never the filtered
  subset.
