# 09 Complete and reactivate one todo

## Workflow

A row's checkbox flips that todo's complete state, after a backend round trip.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Click the checkbox on the row reading "Buy milk".
3. Wait for the count to read "1 item left".
4. Click the checkbox on the row reading "Buy milk" again.
5. Wait for the count to read "2 items left".

## Expected observable results

After step 3:

- "Buy milk" is shown complete: its checkbox reads checked and its label is
  struck through.
- The row keeps its position, first of three.
- The other rows are unchanged.

After step 5:

- "Buy milk" is shown active again: checkbox unchecked, no strikethrough.
- Reloading the page shows "Buy milk" active: both changes reached the backend.

## Notes

- The checkbox only changes once the backend has answered; it does not flip
  optimistically. Between the click and the response it still reads its old
  value.
- The row is replaced by the object the backend returns, so a backend that
  echoes different text would change the label as a side effect of toggling.
