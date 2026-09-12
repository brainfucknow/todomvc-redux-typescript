# 21 HTTP error statuses are treated as success

## Workflow

The client never looks at the HTTP status code. A request answered with 500 is
applied as though it had succeeded, provided the body is shaped as the client
expects.

This is a recorded defect. It is characterized here so later work cannot change
it by accident.

## Case A: a delete answered 500 still removes the row

### Preconditions

- Fixture **THREE_MIXED**.
- Fault **status(DELETE, api/todos/2, 500, "boom")** armed after the app has
  loaded.

### Steps

1. Open the app and wait for the list to hold 3 rows.
2. Arm the fault.
3. Hover the row reading "Write tests" and click its destroy button.
4. Wait for the list to hold 2 rows.
5. Clear the fault, reload the page, and wait for the list to settle.

### Expected observable results

After step 4:

- The list holds "Buy milk" and "Ship it".
- "Write tests" is gone from the screen.
- The count reads "2 items left".

After step 5:

- All 3 rows are back, "Write tests" among them: the backend never deleted it.
  The user was shown a deletion that did not happen.

## Case B: a load answered 500 with a JSON body is rendered

### Preconditions

- Fixture **THREE_MIXED**.
- Fault **status(GET, api/todos/, 500, `[{"id":9,"text":"Server said 500","completed":false}]`)**
  armed before the browser opens the app.

### Steps

1. Open the app at the site root.
2. Wait for the list to hold 1 row.

### Expected observable results

- The single row reads "Server said 500" and is not complete.
- The seed row "Use Redux" is gone: the 500 response replaced the list exactly as
  a 200 would.
- The count reads "1 item left".

## Notes

- The two cases fail differently underneath and that difference is user-visible:
  a delete is applied whatever the body, because the client never reads a delete
  response; a load, add, edit or toggle is applied only when the body parses as
  JSON. A 500 carrying an HTML error page is therefore treated as a failure for
  those verbs and produces the screens of procedures 16 to 19, while a 500
  carrying JSON is treated as success. That variant is not executed here because
  its observable outcome is identical to procedure 16.
