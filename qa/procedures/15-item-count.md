# 15 The item count text

## Workflow

The footer counts active todos, in singular, plural and zero forms.

## Preconditions

- Fixture **THREE_MIXED**.
- No faults.

## Inputs

None beyond pointer actions.

## Steps

1. Open the app and wait for the list to hold 3 rows.
2. Observe the count.
3. Click the checkbox on "Buy milk" and wait for the count to change.
4. Click the checkbox on "Ship it" and wait for the count to change.
5. Click the checkbox on "Write tests" and wait for the count to change.

## Expected observable results

- After step 2 the count reads exactly "2 items left".
- After step 3 it reads exactly "1 item left": singular noun, no "No".
- After step 4 it reads exactly "No items left": the word "No" replaces the digit
  0, and the noun stays plural.
- After step 5 it reads exactly "1 item left" again.

## Notes

- The number, or the word "No", is emphasized; the rest is plain text. The
  assertion is on the text content of the count line, whitespace-normalized.
- The count ignores the current filter; procedures 13 and 14 assert that.
