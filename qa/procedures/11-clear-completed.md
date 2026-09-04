# 11 Clear completed todos

## Workflow

The clear-completed button removes every complete todo from the screen. It never
reaches the backend.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Observe the footer.
3. Click the clear-completed button.
4. Observe the list.
5. Reload the page and wait for the list to hold 3 rows.

## Expected observable results

After step 2:

- The clear-completed button is present, because one todo is complete.

After step 4:

- The list holds 2 rows, "Buy milk" and "Ship it".
- "Write tests" is gone.
- The count reads "2 items left".
- The clear-completed button is gone, because nothing is complete any more.

After step 5:

- All 3 rows are back, "Write tests" still complete. The clearing was not saved.

## Notes

- Clear-completed is local only: no request is made and the change is lost on
  reload. Recorded as observed behavior.
- The button is rendered only while at least one todo is complete; it is absent
  rather than disabled.
- Clearing every todo this way leaves an empty list but, because the backend
  still holds them, a reload restores them; the empty-list screen of procedure 02
  is reachable this way only until the next load.
