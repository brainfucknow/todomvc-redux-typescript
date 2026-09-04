# Baseline inventory: component behaviours before task 02

This is a reference table, not a lettered procedure. Procedure D2a in
`qa/toolchain-commands.md` cites it; QA executes D2a, not this file.

It records the suite as found at commit `da7d7c362c9c7ba161597aac567923d66fffc63a`,
before task 02 changed anything: ten files matching `src/**/*.spec.{ts,tsx}`,
54 cases, and what each case asserts. Task 02 rewrites the eight component
files against `@testing-library/react`. Done criterion 4 says every behaviour
the old suite asserted is still asserted; the raw count of 54 was a proxy for
that while the suite was frozen and is not one for a task whose purpose is to
rewrite it. This table replaces the count.

## How the ids are used

Each `C..` id names one behaviour the pre-task suite asserted, and each row
states the assertion that must carry it afterwards, in terms of rendered output
and of the callbacks the component was given.

The rewritten suite carries the id in the **name** of the test that asserts the
behaviour, so D2a can attribute coverage without counting cases. This is the
same traceability device the project already uses for scenarios (a stable index
in the name, repeated in a comment). The mapping need not be one-to-one:

- one test may carry several ids, when the rewrite merges element-tree
  assertions into one user-visible one;
- one id may be carried by several tests, when the rewrite splits one;
- tests carrying no id are allowed and expected. Extra coverage is not a defect.

Ids are stable. Never renumber, never reuse a retired id.

## Files this task does not rewrite

These two use no shallow renderer and are out of task 02's scope. Their case
names and counts are frozen; D2a2 checks them.

| File | Cases | Case names |
| --- | --- | --- |
| `src/actions/index.spec.ts` | 6 | `addTodo should create ADD_TODO action`, `deleteTodo should create DELETE_TODO action`, `editTodo should create EDIT_TODO action`, `completeTodo should create COMPLETE_TODO action`, `completeAll should create COMPLETE_ALL action`, `clearCompleted should create CLEAR_COMPLETED action` |
| `src/reducers/todos.spec.ts` | 8 | `should handle initial state`, `should handle ADD_TODO`, `should handle DELETE_TODO`, `should handle EDIT_TODO`, `should handle COMPLETE_TODO`, `should handle COMPLETE_ALL_TODOS`, `should handle CLEAR_COMPLETED`, `should not generate duplicate ids after CLEAR_COMPLETED` |

## Reading the "detail only" column

`yes` marks a pre-task assertion with no user-observable counterpart: which
child component type an element is, the positional index of a child in
`props.children`, or the identity of an object passed as a prop. `partly` marks
a case that asserted one of those alongside something observable. Done criterion
4 requires these to be replaced by the observable behaviour they stood in for.
The replacement is the "required assertion" column of the same row. The
whole-app truth those details stood in for is already asserted end to end in
`qa/todo-app-regression.md`; the row names the procedure step that carries it.

## `src/components/App.spec.tsx` (2)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C01 | `Header should render` | first child of the rendered `div` is the `Header` container | yes | Rendering `App` with a store shows the heading `todos` and a textbox with placeholder `What needs to be done?`. Whole-app counterpart: F2. |
| C02 | `Mainsection should render` | second child is the `MainSection` container | yes | Rendering `App` with a store holding two todos shows both todo texts, the toggle-all checkbox, and the footer count. Whole-app counterpart: F3, F5, F6. |

## `src/components/Footer.spec.tsx` (7)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C03 | `should render container` | root element is `footer` with class `footer` | no | The rendered root is a `footer` element carrying class `footer`, and the count text, the filters, and the clear control are inside it. |
| C04 | `should display active count when 0` | count text is `No items left` | no | With `activeCount` 0 the footer reads `No items left`. |
| C05 | `should display active count when above 0` | count text is `1 item left` | no | With `activeCount` 1 the footer reads `1 item left`. |
| C06 | `should render filters` | `ul.filters` holds three `li`, each holding a `FilterLink` whose `filter` prop and child text match `SHOW_ALL`/`All`, `SHOW_ACTIVE`/`Active`, `SHOW_COMPLETED`/`Completed` by position | yes | The footer shows exactly three filter controls, in the order `All`, `Active`, `Completed`, each one clickable and inside a list. Which filter each one applies is asserted through the store, not through props: clicking `Active` leaves the store's visibility filter on the active value, and likewise for `Completed` and `All`. Whole-app counterpart: F5, J1-J3. |
| C07 | `shouldnt show clear button when no completed todos` | third child is `false` | no | With `completedCount` 0 no control named `Clear completed` is present. |
| C08 | `should render clear button when completed todos` | third child is `button.clear-completed` with text `Clear completed` | no | With `completedCount` above 0 a `button` named `Clear completed`, carrying class `clear-completed`, is present. |
| C09 | `should call onClearCompleted on clear button click` | invoking the button's `onClick` calls the prop | no | Clicking `Clear completed` calls `onClearCompleted` once. |

## `src/components/Header.spec.tsx` (2)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C10 | `should render correctly` | root is `header.header`; children are `h1` with text `todos` and a `TodoTextInput` with `newTodo` true and the placeholder | partly | The rendered header shows a level-1 heading reading `todos` and a textbox with placeholder `What needs to be done?` carrying class `new-todo`. |
| C11 | `should call addTodo if length of text is greater than 0` | `onSave('')` does not call `addTodo`; `onSave('Use Redux')` does | no | Pressing Enter on the empty input calls nothing. Typing `Use Redux` and pressing Enter calls `addTodo` once with `Use Redux`. |

## `src/components/Link.spec.tsx` (3)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C12 | `should render correctly` | root is `a`, `style.cursor` is `pointer`, child text is the given label | no | The rendered element is an anchor showing the given label, with a pointer cursor. |
| C13 | `should have class selected if active` | class is `selected` when `active` | no | With `active` true the anchor carries class `selected`. |
| C14 | `should call setFilter on click` | invoking `onClick` calls the prop | no | Clicking the anchor calls `setFilter` once. |

## `src/components/MainSection.spec.tsx` (8)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C15 | `should render container` | root is `section.main` | no | The rendered root is a `section` carrying class `main`. |
| C16 | `toggle all input should render` | first grandchild is `input.toggle-all` of type `checkbox`, unchecked | no | With `todosCount` 2 and `completedCount` 1 a checkbox carrying class `toggle-all` is present and unchecked. |
| C17 | `should be checked if all todos completed` | that input's `checked` is true when `completedCount === todosCount` | no | With `completedCount` equal to `todosCount` the toggle-all checkbox is checked. |
| C18 | `should call completeAllTodos on change` | invoking the sibling label's `onClick` calls `actions.completeAllTodos` | no | Clicking the toggle-all control calls `completeAllTodos` once. The control the user clicks is the label beside the checkbox, which has no text and no `for`; find it in the rendered DOM rather than by role or name. Do not add a label, a name, or a handler to make it queryable - that is out of scope. |
| C19 | `footer should render` | third child is the `Footer` component with `completedCount` 1 and `activeCount` 1 | yes | With `todosCount` 2 and `completedCount` 1 the rendered output reads `1 item left` and shows a `Clear completed` control. Those two readings are what the two props were standing for. Whole-app counterpart: F5. |
| C20 | `onClearCompleted should call clearCompleted` | invoking the footer's `onClearCompleted` prop calls `actions.clearCompleted` | no | Clicking `Clear completed` calls `clearCompleted` once. |
| C21 | `visible todo list should render` | second child is the `VisibleTodoList` container | yes | With a store holding two todos, both todo texts are shown inside a list, between the toggle-all control and the footer. Whole-app counterpart: F3. |
| C22 | `toggle all input and footer should not render if there are no todos` | filtering `false` out of `props.children` leaves one child, of type `VisibleTodoList` | yes | With `todosCount` 0 no toggle-all checkbox, no `items left` text, no filter controls and no `Clear completed` control are present, and the (empty) todo list is still rendered. Whole-app counterpart: I6. |

## `src/components/TodoItem.spec.tsx` (8)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C23 | `initial render` | root `li` with class `''`; child `div.view`; inside it an unchecked `input`, a `label` with the todo text, and `button.destroy` | no | For an active todo the rendered row shows an unchecked checkbox, the todo's text, and a destroy control carrying class `destroy`, and the row carries neither the `completed` nor the `editing` class. |
| C24 | `input onChange should call completeTodo` | invoking the checkbox's `onChange` calls `completeTodo(0, true)` | no | Clicking the checkbox on an active todo calls `completeTodo` once with the todo's id and `true`. |
| C25 | `button onClick should call deleteTodo` | invoking the button's `onClick` calls `deleteTodo(0)` | no | Clicking the destroy control calls `deleteTodo` once with the todo's id. |
| C26 | `label onDoubleClick should put component in edit state` | after `onDoubleClick`, the `li` class is `editing` | no | Double-clicking the todo's text puts the row in edit mode: the row carries class `editing`. |
| C27 | `edit state render` | in edit state the only child is a `TodoTextInput` with `text` the todo text and `editing` true | yes | In edit mode the row shows a textbox pre-filled with the todo's text and carrying class `edit`, and the checkbox, the plain text label and the destroy control are gone. Whole-app counterpart: I1. |
| C28 | `TodoTextInput onSave should call editTodo` | invoking the input's `onSave` with text calls `editTodo(0, 'Use Redux')` | no | In edit mode, submitting non-empty text calls `editTodo` once with the todo's id and that text. |
| C29 | `TodoTextInput onSave should call deleteTodo if text is empty` | invoking `onSave('')` calls `deleteTodo(0)` | no | In edit mode, clearing the text and submitting calls `deleteTodo` once with the todo's id, and does not call `editTodo`. |
| C30 | `TodoTextInput onSave should exit component from edit state` | after save the `li` class is `''` | no | After a successful submit the row leaves edit mode: the todo's text is shown again and the row no longer carries class `editing`. |

## `src/components/TodoList.spec.tsx` (2)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C31 | `should render container` | root is `ul.todo-list` | no | The rendered root is a list carrying class `todo-list`. |
| C32 | `should render todos` | two children, each of type `TodoItem`, each `key` equal to the todo's id and each `todo` prop the same object as the input | yes | The list shows one row per todo, in the order given, each showing its own todo's text and its own completed state - so a list of an active `Use Redux` and a completed `Run the tests` renders two rows in that order, the first unchecked and the second checked. Whole-app counterpart: F3, F4. |

## `src/components/TodoTextInput.spec.tsx` (8)

| id | pre-task case | what it asserted | detail only | required assertion |
| --- | --- | --- | --- | --- |
| C33 | `should render correctly` | placeholder, value `Use Redux`, class `''` | no | The rendered textbox shows the given placeholder, holds the given text as its value, and carries neither the `edit` nor the `new-todo` class. |
| C34 | `should render correctly when editing=true` | class is `edit` | no | With `editing` true the textbox carries class `edit`. |
| C35 | `should render correctly when newTodo=true` | class is `new-todo` | no | With `newTodo` true the textbox carries class `new-todo`. |
| C36 | `should update value on change` | after `onChange`, the value is the typed text | no | Typing into the textbox replaces its displayed value with what was typed. |
| C37 | `should call onSave on return key press` | `onKeyDown` with `which` 13 calls `onSave` with the field's value | no | Pressing Enter in the textbox calls `onSave` once with the field's text. |
| C38 | `should reset state on return key press if newTodo` | after Enter with `newTodo`, the value is `''` | no | With `newTodo` true, pressing Enter empties the textbox. |
| C39 | `should call onSave on blur` | `onBlur` calls `onSave` with the field's value | no | Moving focus away from the textbox calls `onSave` once with the field's text. |
| C40 | `shouldnt call onSave on blur if newTodo` | `onBlur` does not call `onSave` when `newTodo` | no | With `newTodo` true, moving focus away from the textbox calls nothing. |

## New behaviours required by the rewrite

`N..` ids are carried in test names exactly as `C..` ids are, and D2a1 checks
them the same way.

| id | behaviour | why it is required now |
| --- | --- | --- |
| N01 | Mounting the todo list calls `loadTodos` exactly once for a stable `actions` object, and does not call it again on a re-render that leaves `actions` unchanged. | `TodoList` requests the todos from a `useEffect`. Shallow rendering never ran effects, so the pre-task suite passed while supplying no `loadTodos` at all. A real render runs the effect, so the rewrite has to supply it, and once supplied it is asserted rather than ignored. Whole-app counterpart: F1. |

## Gaps in the baseline, for the Hardener

These are behaviours the pre-task suite did **not** assert. They are recorded
so the rewrite is not credited with covering them and so a later tier can close
them. None of them is a done criterion of task 02.

- Footer with `activeCount` above 1 reads `2 items left` - the plural branch of
  `itemWord` is untested; only 0 and 1 were.
- `Link` with `active` false was rendered but never asserted to lack the
  `selected` class.
- `TodoItem` for a completed todo - a checked checkbox and the `completed`
  class on the row - was never rendered; every case used an active todo.
- `TodoTextInput` trims before saving (`G3` asserts this end to end); no unit
  case ever submitted text with surrounding whitespace.
- `Header` rejects whitespace-only input, because the trim happens before the
  length check; only the empty string was tried.
