# 16 Initial load fails

## Workflow

When the app cannot load todos it shows its built-in seed row and says nothing
about the failure.

## Preconditions

- Fixture **THREE_MIXED**.
- Fault **transport(GET, api/todos/)** armed before the browser opens the app.

## Inputs

None beyond navigation.

## Steps

1. Open the app at the site root.
2. Wait until the stub reports the faulted request (synchronization only).
3. Observe the screen.
4. Clear the fault, reload the page, and wait for the list to hold 3 rows.

## Expected observable results

After step 3:

- The list holds exactly one row, reading "Use Redux", not complete.
- None of the fixture's todos are shown.
- The count reads "1 item left".
- The footer, filters and toggle-all chevron are all present, as for any
  single-todo list.
- No error message, banner, retry control or loading indicator appears anywhere
  on the page.

After step 4:

- The list holds the 3 fixture rows, showing the fixture was never the problem.

## Notes

- "Use Redux" is the store's hardcoded seed. A failed load leaves it in place,
  so a user who is offline sees a todo they never created, on a row that behaves
  like any other: its checkbox and destroy button would address id 0, which the
  backend does not have. Recorded, not fixed.
- Under the dev server both StrictMode load attempts fail; the screen is the same
  either way.
- The failure is silent: nothing in the UI reads the error state the app records.
