# 17 Adding a todo fails

## Workflow

When the add request fails, the typed text is gone and no row appears.

## Preconditions

- Fixture **ONE_ACTIVE**.
- Fault **transport(POST, api/todos/)** armed after the app has loaded.

## Inputs

The text `Write tests`.

## Steps

1. Open the app and wait for the list to hold 1 row.
2. Arm the fault.
3. Type `Write tests` into the new-todo field and press Enter.
4. Wait until the stub reports the faulted request (synchronization only).
5. Observe the screen.

## Expected observable results

- The list still holds one row, "Buy milk".
- No row reads "Write tests".
- The new-todo field is empty: the text the user typed is not recoverable from
  the screen.
- The count still reads "1 item left".
- No error message appears.

## Notes

- The field is cleared by the Enter keystroke, before any response, so a failed
  add costs the user their text with no indication that anything went wrong.
  Recorded, not fixed.
