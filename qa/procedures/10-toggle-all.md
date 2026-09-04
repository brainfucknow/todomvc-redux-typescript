# 10 Toggle all todos

## Workflow

The chevron next to the new-todo field marks every todo complete, or marks every
todo active when they are already all complete. It never reaches the backend.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Observe the toggle-all state.
3. Click the toggle-all chevron.
4. Observe the list.
5. Click the toggle-all chevron again.
6. Observe the list.
7. Reload the page and wait for the list to hold 3 rows.

## Expected observable results

After step 2:

- Toggle-all reads unchecked, because not every todo is complete.

After step 4:

- All 3 rows are shown complete.
- The count reads "No items left".
- Toggle-all reads checked.
- The clear-completed button is present.

After step 6:

- All 3 rows are shown active, including "Write tests", which started complete.
- The count reads "3 items left".
- Toggle-all reads unchecked.
- The clear-completed button is gone.

After step 7:

- The list is back to the fixture: "Buy milk" and "Ship it" active, "Write tests"
  complete. Neither toggle-all click was saved.

## Notes

- Toggle-all is local only: no request is made and the change is lost on reload.
  Recorded as observed behavior.
- Toggle-all is a two-way switch driven by whether *every* todo is complete, so
  the second click clears rows that were complete before the first click.
- The chevron's checkbox is read-only and reflects "every todo is complete"; the
  clickable part is the chevron label beside it.
