# 03 Add a todo

## Workflow

Typing text and pressing Enter appends a todo, after a backend round trip.

## Preconditions

- Fixture **ONE_ACTIVE**.
- No faults.

## Inputs

The text `Write tests`.

## Steps

1. Open the app and wait for the list to hold 1 row.
2. Type `Write tests` into the new-todo field.
3. Press Enter.
4. Wait for the list to hold 2 rows.

## Expected observable results

- The rows read, top to bottom: "Buy milk", "Write tests". The new row is
  appended, not prepended.
- "Write tests" is not complete.
- The new-todo field is empty.
- The count reads "2 items left".
- Reloading the page still shows both rows in the same order.

## Notes

- The new-todo field clears as soon as Enter is pressed, before the backend has
  answered; the row appears only when the response arrives. The order of those two
  events is not asserted, since only the settled screen is stable.
- The id of the new row comes from the backend response, not from the client.
