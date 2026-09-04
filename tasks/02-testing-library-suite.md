# Task 02: Replace shallow-renderer tests with Testing Library

Status: in progress

## Goal

Component tests assert on what a user can observe in rendered output, not on unrendered React element trees. `react-shallow-renderer` is gone from the project.

## Scope

- Rewrite `src/components/*.spec.tsx` against `@testing-library/react` and `@testing-library/user-event`: query by role, label, and text; drive behavior through simulated user interaction; assert on rendered DOM and on the callbacks the component was given.
- Every behavior currently asserted by a shallow-renderer test keeps an assertion. Where a shallow test asserted an implementation detail with no user-observable counterpart (which child component type an element is, the positional index of a child in `props.children`), replace it with the observable behavior that detail was standing in for, and say so in the handoff note.
- Remove `react-shallow-renderer`, `src/react-shallow-renderer.d.ts`, and the `@testing-library/dom` / `@testing-library/react` version pins that were installed but unused.
- Carried from task 01, for the Cleaner: bring the mutation runners' stamp logic under test. `scripts/acceptance-mutation.ts` and the language-mutation runner each compute and compare a hash that decides whether a mutation is re-tested, and no tier judges that logic. Task 01 found the previous stamp did not cover what it claimed to; the replacement is verified by demonstration only. Same treatment as `scripts/crap.mjs`.
- Container components rendered inside a component under test need a real store or a test wrapper; introduce one render helper rather than repeating provider setup per file.

## Out of scope

- Changing any component's behavior or markup to make it easier to test. If a component is genuinely untestable through rendered output, say so in the handoff note rather than changing it.
- Reducer, action, selector, and middleware tests. They do not use the shallow renderer.
- Upgrading React. Task 03.
- Removing `connect()`. Task 04.
- Converting class components. Task 05.

## Done criteria

1. `react-shallow-renderer` appears nowhere in the tree.
2. `npm test` passes, with coverage of component behavior no lower than before this task.
3. `npm run test:acceptance` passes.
4. Every behavior asserted by the old suite is still asserted, or its replacement is named and justified in the handoff note.
5. The E2E QA procedures pass when QA executes them.

## Project manager note before the chain starts

**The D2a floor does not bind this task, and the Specifier must replace it.** QA procedure D step D2a
in `qa/toolchain-commands.md` requires `npx vitest run src` to report at least 10 files and 54 tests,
and states that a drop is a regression that fails procedure D outright. That was written for task 01,
whose scope forbade adding or removing a single case; it is the wrong check for a task whose entire
purpose is to rewrite those ten files.

Do not preserve the number for its own sake, and do not weaken the check to nothing. What D2a exists
to protect is this task's done criterion 4: every behavior the old suite asserted is still asserted.
A raw count was a serviceable proxy for that while the suite was frozen. It is not a proxy for it
now, because a faithful rewrite may legitimately merge two element-tree assertions into one
user-visible one, or split one into several. The Specifier owns choosing what replaces it.

Record the pre-task inventory before anything changes, so the replacement check has a baseline to
name: the ten files under `src/**/*.spec.{ts,tsx}` and their 54 cases, and what each case asserts.

**One consequence worth stating.** `react-shallow-renderer` asserts against unrendered element trees,
so some existing cases assert things that have no user-observable counterpart at all - which child
component type an element is, the positional index of a child in `props.children`. Done criterion 4
already says these are replaced by the observable behavior they stood in for, with the substitution
named. That is a judgment about behavior, so it is the Specifier's to make and the Coder's to
implement, not something to settle by keeping a count equal.

## Handoffs

### Specifier

Owned `features/` and `qa/`; nothing else was touched.

**Baseline recorded first, as the PM note required.** `qa/component-behaviour-inventory.md`
is new. It records the suite as found at `da7d7c362c9c7ba161597aac567923d66fffc63a` -
ten files matching `src/**/*.spec.{ts,tsx}`, 54 cases - and says what each one asserts.
Forty of those cases are the component behaviours this task rewrites; they carry stable
ids `C01`-`C40`. The other fourteen (`src/actions/index.spec.ts` 6, `src/reducers/todos.spec.ts` 8)
use no shallow renderer, are outside this task's scope, and are frozen by name and count.

**What replaces the D2a floor.** `qa/toolchain-commands.md` D2a no longer asserts
"10 files and 54 tests". In its place:

- D2a runs `npx vitest run src` and records the totals rather than matching them. A
  rewrite legitimately moves that number in either direction.
- D2a1 is the real check: for every id in the inventory, the verbose run must print at
  least one **passing** test whose name contains that id. This is what done criterion 4
  says, checked directly instead of through a count proxy. Mapping is many-to-many -
  one test may carry several ids where the rewrite merges assertions, one id may be
  carried by several tests where it splits - and tests carrying no id are fine.
- D2a2 freezes the two out-of-scope files at 6 and 8 cases with the names the inventory lists.
- D2a3-D2a5 test that instrument in the failing direction, as PLAN section 4 requires:
  break one behaviour in `Footer.tsx`, `TodoItem.tsx`, `Link.tsx` in turn, confirm the run
  goes red and the failing test carries `C05` / `C25` / `C13`, revert. Without these,
  D2a1 could pass on tests that assert nothing.
- Consequential edits so procedure D stays self-consistent: D1 and D2 no longer name
  frozen totals or a literal file list (D2 now compares the run against the spec files
  present in the tree, so a split spec file passes only by agreeing); D2b/D2c/D8/D9
  counts became floors, with the rule that a rise must be recorded in a task's handoff
  note and a drop fails outright. D2c's floor note says task 02 raises it, because the
  Cleaner's stamp tests land under `scripts/`.

**Requiring the ids in test names is deliberate.** It is the same traceability device the
project already uses for scenarios (stable index in the name, repeated in a comment), and
it is what makes D2a1 mechanical rather than a judgement call. The inventory states the
rule; the Coder implements it.

**Done criterion 4 substitutions, named as the criterion requires.** Nine baseline cases
asserted something with no user-observable counterpart. Each row of the inventory carries
its replacement and the `qa/todo-app-regression.md` step that holds the whole-app truth:

- C01, C02 (`App`): child element type is `Header` / `MainSection` -> rendering `App` with
  a store shows the heading and new-todo input, and shows the todos, toggle-all and footer.
- C06 (`Footer`): each `li`'s child is a `FilterLink` with a given `filter` prop at a given
  index -> three filter controls in the order All, Active, Completed, and clicking one
  leaves the store on the matching visibility filter.
- C10 (`Header`, partly): child element type is `TodoTextInput` -> a textbox with the
  placeholder, carrying class `new-todo`.
- C19 (`MainSection`): child type is `Footer` with `completedCount` 1 and `activeCount` 1
  -> the rendered output reads `1 item left` and offers `Clear completed`. Those two
  readings are what the two props stood for.
- C21, C22 (`MainSection`): child type is `VisibleTodoList`, and positional filtering of
  `props.children` -> the todos appear between toggle-all and footer; with no todos,
  neither toggle-all nor any footer text is present and the empty list still renders.
- C27 (`TodoItem`): child type is `TodoTextInput` with `editing` true -> a textbox
  pre-filled with the todo's text carrying class `edit`, with checkbox, label and destroy
  control gone.
- C32 (`TodoList`): child type is `TodoItem`, `key` equal to the id, `todo` prop identical
  by reference -> one row per todo in the given order, each showing its own text and its
  own completed state.

**One behaviour the rewrite must add, `N01`.** `TodoList` calls `actions.loadTodos()` from
a `useEffect`. Shallow rendering never ran effects, so the pre-task suite passed while
supplying no `loadTodos` at all - the props in `TodoList.spec.tsx` do not have it. A real
render runs the effect and will throw unless the Coder supplies it. Since it must be
supplied, it is asserted: mounting the list calls `loadTodos` once, and not again on a
re-render with an unchanged `actions`. Its whole-app counterpart is F1.

**Acceptance tier.** `features/toolchain-dependencies.feature` scenario 1 now parameterises
the package name as well as the location: `react-scripts` and `react-shallow-renderer`
against `package.json`, `package-lock.json` and `src`, 6 examples. No step handler change
was needed - the existing pattern already takes the reference as a parameter. Procedure D5
goes from 27 scenario executions to 30 (`toolchain dependencies 1` from 3 to 6).

**Verified.** `bin/gherkin-parser` parses the edited feature; `bin/gherkin-ir-dry-checker`
reports 0 findings over its IR (2 step occurrences, 2 unique). Regenerating the entry point
and running it gives 15 executions for that feature, of which the three
`react-shallow-renderer` rows fail today with `"react-shallow-renderer" still appears in
package-lock.json` / `... in src/components/*.spec.tsx, src/react-shallow-renderer.d.ts`,
and the three `react-scripts` rows pass. That is the acceptance tier judging done criterion
1 in the failing direction; it goes green when the Coder removes the package. `npm run
test:acceptance` is therefore red until then, by design, and D3 cannot pass before the
Coder's step. I ran no other tests. Only `features/toolchain-dependencies.feature`,
`qa/toolchain-commands.md` and the new `qa/component-behaviour-inventory.md` are modified;
`build/` holds a regenerated IR and entry point for that feature, which is gitignored and
is rewritten by the next pipeline run.

**Hazards the Coder should expect** (none of them justify changing a component - that is
out of scope, and if one turns out to, say so in the handoff rather than editing):

- `TodoList`'s effect, above. The render helper has to supply `loadTodos`.
- Container-backed components (`App`, `MainSection`, `Footer`, and `MainSection`'s
  `VisibleTodoList`) need a store. Rendering `App` or `VisibleTodoList` against a store
  carrying `callAPIMiddleware` will reach `fetch`; the helper needs to keep unit tests off
  the network, and no assertion in the inventory depends on an API round trip.
- `MainSection`'s toggle-all handler is on an empty `<label>` with no text and no `for`, so
  the checkbox has no accessible name and the label cannot be found by role or by name.
  Find it in the rendered DOM. C18 says so explicitly.
- `TodoTextInput.handleSubmit` branches on `e.which`. I checked
  `node_modules/react-dom`: React's synthetic `which` on `keydown` is the native
  `keyCode`, so `userEvent.keyboard('{Enter}')` (keyCode 13) reaches the branch. A bare
  `fireEvent.keyDown(el, { key: 'Enter' })` with no `keyCode` will not - C37 and C38 would
  fail for a reason that is not the component's.

**Left for the Coder.** Rewrite the eight component spec files to the inventory's "required
assertion" column, carrying each id in the name of the test that asserts it, plus `N01`.
Introduce the one render helper the scope asks for. Remove `react-shallow-renderer`,
`src/react-shallow-renderer.d.ts` and the dead testing-library pins; procedure A7 is the
dead-pin check and reads "every `@testing-library/*` package `package.json` declares is
imported somewhere in the checkout", in both directions.

**Left for the Cleaner.** The carried stamp-logic work raises D2c's floor; record the new
counts in the handoff note, which is what the floor rule asks for.

**Left for the Hardener.** `qa/component-behaviour-inventory.md` ends with a "Gaps in the
baseline" section: five behaviours the old suite never asserted (Footer's plural branch,
`Link` inactive, `TodoItem` for a completed todo, `TodoTextInput` trimming, `Header`
rejecting whitespace-only input). None is a done criterion of this task; they are recorded
so the rewrite is not credited with covering them.

**Left for QA.** `e2e/toolchain-commands.spec.ts` is the executable form of a procedure
that changed, and it is yours to move: A3-A7 (both package names, the missing `.d.ts`, the
dead-pin set comparison), D1/D2/D2a and the new D2a1/D2a2/D2a3-D2a5, the D2b/D2c/D8/D9
floors and the sum check, D3's total and D5's breakdown at 30. `qa/todo-app-regression.md`
is unchanged: this task changes no application behaviour, so F-K stand as written and are
the whole-app counterpart the substitutions above lean on.

**Open questions.** None that block. One judgement I made rather than asked: the scope
line "remove the `@testing-library/dom` / `@testing-library/react` version pins that were
installed but unused" does not say whether `@testing-library/react` should then be
re-declared at a current version, so A7 checks the invariant that matters - declared if and
only if imported - and leaves the version to the Coder.

### Project manager rulings on the Specifier handoff

Verified independently: `npm run test:acceptance` is red exactly as designed, `3 failed | 27 passed
(30)`, the three failures being the new `react-shallow-renderer` rows; `gherkin-ir-dry-checker
--include-exact` reports 0 findings on the edited feature; the inventory carries 40 `C..` ids; only
`features/`, `qa/` and this task file changed. Accepted.

The D2a replacement is the right answer to the note it was given, and better than what the note asked
for. Recording totals instead of matching them, tracing every inventory id to a passing test name,
freezing the two out-of-scope files by name and count, and then **breaking three behaviours and
requiring the id-carrying test to go red** gives the check teeth that a count never had. D2a3-D2a5
apply this project's standing guidance to the instrument this task depends on most.

Stating that the id mapping need not be one-to-one is the substance of the ruling implemented
correctly: a faithful rewrite may merge two element-tree assertions into one user-visible one, and
attribution by id survives that where arithmetic does not.

Turning D2b, D2c, D8 and D9 into floors with a recorded-rise rule is accepted, and it removes a
recurring cost from task 01: roles that add tests but cannot edit `qa/` no longer strand the
procedure at a stale number until a reconciliation pass.

Three findings are carried into the Coder's step rather than left in the note:

- **`TodoList.spec.tsx` never supplied `loadTodos`,** because shallow rendering never ran the effect.
  A real render will throw without it. `N01` asserting the mount-time load is a behaviour the suite
  should always have had; adding it is not scope creep, it is the effect becoming reachable.
- **`TodoTextInput` branches on `e.which`,** and React's synthetic `which` on keydown is the native
  `keyCode`, so `userEvent.keyboard('{Enter}')` works where a bare `fireEvent.keyDown(el, {key:
  'Enter'})` does not. That is exactly the sort of thing that produces a test which passes for the
  wrong reason.
- **`MainSection`'s toggle-all handler sits on an empty `<label>`** with no text and no `for`, so it
  is not findable by role or name and must be found in the DOM. The Specifier is right that this is
  not a reason to change the markup: task 02's out-of-scope section bars changing a component to make
  it easier to test, and the correct response is to record it, which it did.

Leaving the acceptance tier red is correct and is the same shape task 01 used for `production build 4`:
the Specifier writes the failing check, the Coder makes it pass.


### Coder

### Cleaner

### Architect

### Hardener

### QA
