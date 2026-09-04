# 08 Delete a todo

## Workflow

The destroy button on a row removes that todo, after a backend round trip.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Hover the row reading "Write tests".
3. Observe the row.
4. Click that row's destroy button.
5. Wait for the list to hold 2 rows.

## Expected observable results

After step 3:

- The destroy button on the hovered row is visible. On rows that are not hovered
  it is not.

After step 5:

- The rows read "Buy milk" and "Ship it", in that order.
- The count reads "2 items left".
- The clear-completed button is gone, because the only complete todo was removed.
- Reloading the page still shows 2 rows.

## Notes

- The destroy button is hidden until its row is hovered. A driver that clicks
  without hovering first will still hit it, but the procedure states the hover
  because that is the user-visible affordance.
