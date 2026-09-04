# E2E QA procedure: TodoMVC behaviour regression

Task 01 is a toolchain swap. The application must behave exactly as it did on
`react-scripts`. This procedure proves that through the browser only. It is the
baseline every later task re-runs.

Drive the real UI. Do not import project modules, read Redux state, or call a
project API. The only thing that is faked is the network boundary: intercept
`**/api/todos/**` and answer from the stub contract below.

Executable form: `e2e/todo-app-regression.spec.ts`, run by `npm run test:e2e`.
One test per procedure, one `test.step` per lettered row, named after it. The
procedure and the spec change together: neither is the copy.

## Stub contract

The interceptor keeps an in-memory list seeded with `SEED`:

```
SEED = [ {"id":1,"text":"Buy milk","completed":false},
         {"id":2,"text":"Walk the dog","completed":true} ]
```

| Request | Response |
| --- | --- |
| `GET /api/todos/` | `200`, `application/json`, the current list |
| `POST /api/todos/` | `200`, `application/json`, the created todo with a fresh integer `id`, `completed` false, and the posted `text` |
| `PATCH /api/todos/<id>` | `200`, `application/json`, the stored todo with the posted fields applied |
| `DELETE /api/todos/<id>` | `200`, empty body |

Record the method, URL, and request body of every intercepted call, so the
assertions below can name them.

## Preconditions

- The app is being served by `npm run dev` or `npm run preview`.
- The interceptor is installed before the first navigation.
- At the start of each procedure, reset the stub list to `SEED` and load the
  app URL afresh.

## Reading the request counts

`src/index.tsx` wraps the app in `React.StrictMode`, so a development build
mounts effects twice and the initial load fires `GET /api/todos/` twice. A
production build fires it once. Both are correct. Every other assertion below
counts requests exactly; only the initial load is exempt. The executable form
serves the app with `npm run preview`, so it sees one; F1 accepts either.

## Procedure F: initial render

| # | Action | Expected observable result |
| --- | --- | --- |
| F1 | Navigate to the app URL | `GET /api/todos/` is issued, and no other request to `api/todos` is. |
| F2 | Read the page | Tab title is `Redux TodoMVC Example`. A heading reads `todos`. A text input has placeholder `What needs to be done?` and holds keyboard focus. |
| F3 | Read the todo list | Two items, in seed order: `Buy milk`, then `Walk the dog`. |
| F4 | Read the item states | `Walk the dog` is shown as completed and its checkbox is checked. `Buy milk` is not completed and its checkbox is unchecked. |
| F5 | Read the footer | It reads `1 item left`. Filters `All`, `Active`, `Completed` are present, with `All` selected. A `Clear completed` control is present. |
| F6 | Read the toggle-all control | Present and unchecked. |

## Procedure G: adding

| # | Action | Expected observable result |
| --- | --- | --- |
| G1 | Type `Read a book` into the new-todo input and press Enter | One `POST /api/todos/` with body `{"text":"Read a book"}`. |
| G2 | Read the page | The list has three items, ending in `Read a book`. The input is empty. The footer reads `2 items left`. |
| G3 | Type `Trim me` with a leading and a trailing space and press Enter | The `POST` body text is `Trim me`, with no surrounding whitespace. |
| G4 | Press Enter on the empty input | No request is issued and no item is added. |
| G5 | Type `Never saved` and click elsewhere without pressing Enter | No request is issued and no item is added. The input still shows `Never saved`. |

## Procedure H: completing and clearing

| # | Action | Expected observable result |
| --- | --- | --- |
| H1 | Click the checkbox on `Buy milk` | One `PATCH /api/todos/1` with body `{"completed":true}`. The item is shown as completed, the toggle-all control is checked, and the footer reads `No items left`. |
| H2 | Click the checkbox on `Buy milk` again | One `PATCH /api/todos/1` with body `{"completed":false}`. The item is active again and the footer reads `1 item left`. |
| H3 | Click the toggle-all control | No request is issued. Both items are shown as completed and the footer reads `No items left`. |
| H4 | Click the toggle-all control again | No request is issued. Both items are shown as active and the footer reads `2 items left`. |
| H5 | Click the checkbox on `Walk the dog` | One `PATCH /api/todos/2` with body `{"completed":true}`. The item is shown as completed. |
| H6 | Click `Clear completed` | No request is issued. `Walk the dog` leaves the list, the footer reads `1 item left`, and the `Clear completed` control is gone. |
| H7 | Reload the app URL | Both items are listed again, `Buy milk` active and `Walk the dog` completed. H3, H4, and H6 changed client state only. This is existing behaviour and must not change in this task. |

## Procedure I: editing and deleting

| # | Action | Expected observable result |
| --- | --- | --- |
| I1 | Double-click the label of `Buy milk` | The row enters edit mode: an editable input replaces the label, pre-filled with `Buy milk` and holding focus. |
| I2 | Replace the text with `Buy oat milk` and press Enter | One `PATCH /api/todos/1` with body `{"text":"Buy oat milk"}`. Edit mode ends and the label reads `Buy oat milk`. |
| I3 | Double-click the label, replace the text with `Buy soy milk`, then click outside the input | One `PATCH /api/todos/1` with body `{"text":"Buy soy milk"}`. Edit mode ends and the label reads `Buy soy milk`. |
| I4 | Double-click the label, clear the input completely, press Enter | One `DELETE /api/todos/1`. The item leaves the list. |
| I5 | Click the destroy control on `Walk the dog` | One `DELETE /api/todos/2`. The item leaves the list. |
| I6 | Read the page now that no items remain | The toggle-all control and the footer are both gone. |

## Procedure J: filtering

| # | Action | Expected observable result |
| --- | --- | --- |
| J1 | Click `Active` | No request is issued. Only `Buy milk` is listed. `Active` is the selected filter. The browser URL is unchanged. |
| J2 | Click `Completed` | No request is issued. Only `Walk the dog` is listed. `Completed` is the selected filter. The browser URL is unchanged. |
| J3 | Click `All` | No request is issued. Both items are listed and `All` is the selected filter. |
| J4 | Click `Active`, then add `Read a book` | The `POST` is issued and `Read a book` appears in the list, because a new todo is active. |
| J5 | Click `Completed`, then reload the app URL | The selected filter is `All` again. Filter state is not persisted and not carried in the URL. |

## Procedure K: backend failure

| # | Action | Expected observable result |
| --- | --- | --- |
| K1 | Make the interceptor abort `GET /api/todos/` at the network level, then load the app URL | The page still renders the header, the list, the toggle-all control, and the footer. |
| K2 | Read the todo list | It holds the single built-in item `Use Redux`, active, and the footer reads `1 item left`. |
| K3 | Look for an error message on the page | There is none. The app surfaces no error text to the user. This is existing behaviour and must not change in this task. |
| K4 | Read the browser console | An error is logged. |

## Pass criteria

The task passes when every row above produces the stated observable result and
no browser console error appears outside K4.
