# 02 Empty list state

## Workflow

With no todos, the app shows only the header and an empty list. The controls that
act on todos are absent, not disabled.

## Preconditions

- Fixture **EMPTY**.
- No faults.

## Inputs

The text `Buy milk` for the final step.

## Steps

1. Open the app at the site root.
2. Wait for the todo list to be empty.
3. Type `Buy milk` into the new-todo field and press Enter.
4. Wait for the todo list to hold 1 row.

## Expected observable results

After step 2:

- The list holds no rows.
- No footer: no count, no filter links, no clear-completed button.
- No toggle-all chevron.
- The new-todo field is present, empty, and focused.

After step 4:

- The list holds one row reading "Buy milk", not complete.
- The footer has appeared, the count reads "1 item left", All is highlighted.
- The toggle-all chevron has appeared and reads unchecked.
- There is no clear-completed button, because nothing is complete.

## Notes

- The toggle-all control and the footer are rendered only while at least one todo
  exists, so an empty list offers no way to reach the filters.
