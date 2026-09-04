# 01 Initial load

## Workflow

Opening the app replaces its built-in seed row with whatever the backend holds.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.
- Browser not yet on the app.

## Inputs

None beyond navigation.

## Steps

1. Open the app at the site root.
2. Wait for the todo list to hold 3 rows.

## Expected observable results

- The rows read, top to bottom: "Buy milk", "Write tests", "Ship it".
- "Write tests" is shown complete; "Buy milk" and "Ship it" are not.
- No row reads "Use Redux".
- The count reads "2 items left".
- The filter links read All, Active, Completed, and All is highlighted.
- The clear-completed button is present.
- The new-todo field is empty and holds keyboard focus.

## Notes

- The store starts with a hardcoded row `{id:0, text:"Use Redux", completed:false}`
  and a successful load replaces the whole array. That seed row is briefly on
  screen before the response arrives; it is not asserted here because making the
  window deterministic would need the stub to hold a response open. Procedure 16
  characterizes the seed row where it is stable.
- Under the dev server the load request is issued twice (StrictMode). Both
  responses produce the same screen, so nothing here distinguishes them.
- Row order is the array order the backend returned; the app does not sort.
