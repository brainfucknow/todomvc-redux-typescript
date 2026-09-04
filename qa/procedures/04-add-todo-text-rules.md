# 04 New-todo field text rules

## Workflow

What the new-todo field does with surrounding spaces, with blank input, and with
keys other than Enter.

## Preconditions

- Fixture **EMPTY**.
- No faults.

## Inputs

The texts `   Buy milk   `, `   ` (three spaces), and `Ship it`.

## Steps

1. Open the app and wait for the list to be empty.
2. Type `   Buy milk   ` into the new-todo field and press Enter.
3. Wait for the list to hold 1 row.
4. Type `   ` into the new-todo field and press Enter.
5. Type `Ship it` into the new-todo field, then press Escape.
6. Click the header heading "todos" to move focus off the field.

## Expected observable results

After step 3:

- One row, reading exactly `Buy milk`: leading and trailing spaces are dropped.

After step 4:

- The list still holds 1 row: blank input adds nothing.
- The new-todo field is empty: it clears even though nothing was added.
- The count still reads "1 item left".

After steps 5 and 6:

- The list still holds 1 row: Escape does not submit.
- The new-todo field still reads `Ship it`: Escape does not clear it, and neither
  does moving focus away.

## Notes

- Text is trimmed before the length check, so a field holding only spaces counts
  as empty and is discarded.
- The field is a plain text box with no maximum length and no other validation.
