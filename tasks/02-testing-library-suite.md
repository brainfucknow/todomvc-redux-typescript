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

**Second pass, on the project manager's finding about `toolchain dependencies 1`.**
Only `features/toolchain-dependencies.feature` and `qa/toolchain-commands.md` changed.

**The fix: the package name is inlined in step text, one scenario per package.**

- `toolchain dependencies 1` is back to `Then <location> contains no reference to
  react-scripts` over the three location rows - byte-identical to its task 01 form.
- `toolchain dependencies 3` is new and does the same for `react-shallow-renderer`.
  Index 3 because indexes are stable ids and 2 is taken; it sits last in the file so
  position and index agree.
- `<location>` stays a column. A mutated location names a path that cannot be read, so
  those cells die - the PM's own output shows them dying.
- No example cell now feeds an absence assertion, and no step handler changed.
- The feature is 15 executions again (3 + 9 + 3), so D5's total stays 30.

**Why two scenarios rather than one scenario with two `Then` steps.** Both shapes remove
the unkillable column, and the one-scenario shape is shorter. But the mutator's candidates
are example cells, and with two steps sharing one `<location>` column the first step fails
first, so no candidate's kill would depend on the second step: a weakened
`react-shallow-renderer` assertion would be invisible to mutation. One scenario per package
gives each assertion its own three cells and probes both. Six candidates, all expected to die.

**Why not the positive-set shape.** The PM's second option - assert that the declared
dependency set equals an expected set - is killable, but it reaches only `package.json`:
the lockfile's set is the whole transitive tree and `src` declares no set at all. It would
judge one of the three locations done criterion 1 names, while churning on every dependency
change in tasks 03-06. Inlining judges all three and costs nothing.

**One DRY finding, reviewed and kept.** `gherkin-ir-dry-checker --include-exact` reports 3
step occurrences, 3 unique, and one medium-confidence `possible-synonym` (score 0.571)
pairing the two `contains no reference to` steps. Its own suggested action is to normalise
only when the different wording is accidental drift. It is not drift: the two steps are one
template with two literals, and the literals cannot be a column. I checked the one-scenario
variant as well and it draws the same finding, so it follows from naming two packages, not
from how the scenarios are split. Renaming either step to duck the check would be gaming it.

**The rule is now in the feature file.** A comment under `Feature:` says why the package is
named in step text and never in a column, so the next editor meets it where the mistake gets
made rather than only in PLAN section 4.

**QA procedure.** Two edits to `qa/toolchain-commands.md`, both in procedure D:

- D5's breakdown is `3 + 9 + 3 for toolchain dependencies 1/2/3`, and it records which
  package each scenario reads. The total is unchanged at 30.
- **D3a is new**, and is the failing-direction row procedure D had for the component suite
  (D2a3-D2a5) but not for the acceptance tier. A scenario asserting an absence passes
  whenever the name is missing, which is also exactly what a scenario asserting nothing
  looks like; D3a tells them apart by writing a scratch `src/absence-probe.ts` carrying both
  names, re-running D3, and requiring exactly two failures - `toolchain dependencies
  1/example_3` and `3/example_3` - then deleting it and requiring 30 green again. Fail D if
  D3a stays green.

**Verified.** `bin/gherkin-parser` parses the edited feature. `gherkin-ir-dry-checker
--include-exact` as above. `npm run test:acceptance`: 5 files, 30 executions, all green.
Verbose breakdown confirms 3 / 9 / 3 for this feature. D3a executed exactly as written: with
the probe present the run exits 1 with exactly two failures, `"react-scripts" still appears
in src/absence-probe.ts` and `"react-shallow-renderer" still appears in src/absence-probe.ts`;
after deleting it, 30 green and `git status --porcelain` lists only my two files. I ran no
mutation, per the role brief - proving the replacement cells die is the Hardener's run.

**I checked the rest of `features/` for the same defect.** The only other absence step is
`production build 3`, whose literal is inlined and which has no examples table. No other
feature asserts an absence from an example cell.

**Left for the Coder.** Nothing for this fix: `src/`, `package.json` and the lockfile already
satisfy both scenarios, and the tier is green as the tree stands. The earlier pass's
leftovers were discharged and are not reopened.

**Left for the Hardener.** Expect 15 candidates for `toolchain-dependencies` and 0 survivors;
the six that survived were the `package` column, which no longer exists. Two things to expect
in the output: scenario 1's text is byte-identical to its task 01 form, so at `--level soft`
its stored record in `.mutation/gherkin/toolchain-dependencies.manifest` (3 candidates, 3
killed) may be reused rather than re-tested whenever the acceptance implementation
fingerprint has not moved, while scenario 3 is new and is tested either way. I did not touch
`.mutation/`.

**Left for QA.** `e2e/toolchain-commands.spec.ts` is still yours to move and still carries the
pre-task figures; for this change it needs the scenario breakdown `toolchain dependencies 1`
3, `2` 9, `3` 3, and a step for D3a. Everything the earlier note and the Cleaner's note left
you stands.

**Open questions.** None.

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

Owned `src/`, `package.json` and `package-lock.json`; `features/` and `qa/` untouched.

**What changed.** The eight component spec files are rewritten against
`@testing-library/react` and `@testing-library/user-event`, querying by role,
label, placeholder and text, driving behaviour through simulated interaction,
and asserting on rendered DOM and on the callbacks the component was given. Each
test name carries the inventory id it answers, as D2a1 requires. One new file,
`src/test-utils.tsx`, holds the render helper the scope asked for and two things
the specs would otherwise repeat.

- `react-shallow-renderer` is uninstalled and `src/react-shallow-renderer.d.ts`
  deleted. `grep -c` reports 0 in `package.json` and `package-lock.json`.
- The dead `@testing-library/dom` pin is gone. `@testing-library/react` is no
  longer a dead pin - it is imported - and I moved it from `^14.0.0` to
  `^16.3.3`, the current major, which is also the one React 19 needs in task 03.
  `@testing-library/dom` is RTL 16's peer, so npm installs it transitively; it
  is in the lockfile and in nothing that A7 reads. `@testing-library/user-event`
  `^14.6.7` is new and imported. A7's two sets are `{react, user-event}` both ways.
- No component was changed. `git status` shows only spec files, the two
  manifests, the deleted `.d.ts` and the new helper.

**`src/test-utils.tsx`** holds three things, all of them setup the specs share:

- `renderWithStore(ui, state?)` - the one provider setup, for `App`, `Footer` and
  `MainSection`, which all hold containers. It returns the store, a `userEvent`
  session and the render result.
- `mockTodoActions()` - a full `typeof TodoActions` of mocks, `satisfies
  Record<keyof typeof TodoActions, Mock>` so a new action cannot be forgotten.
- `pressEnter(field)` - see the `which` finding below.

It lives under `src/` deliberately: `scripts/architecture/packages.spec.ts`
treats every non-spec source under `src/` as an application source and forbids
it importing outside `src/`, which this satisfies, and the CRAP gate then
measures it like anything else (its one function scores cc 3, cov 100%).

**Two findings that changed how I implemented the spec.**

1. **`userEvent.keyboard('{Enter}')` does not reach `TodoTextInput`'s submit
   branch.** The ruling carried the Specifier's note that it would. The first half
   is right - React's synthetic `which` on keydown is the native `keyCode` - but
   user-event never sets `keyCode`: `grep -rn keyCode
   node_modules/@testing-library/user-event/dist/cjs/` returns nothing, its key map
   carries only `key` and `code`, and jsdom does not derive `keyCode` from `key`.
   So `which` was 0 and C37 and C38 failed on the first run, exactly the
   passing-for-the-wrong-reason hazard the note was warning about, one step
   further along. A real browser does send `keyCode` 13, so the fix is to send
   what a browser sends: `pressEnter` dispatches `fireEvent.keyDown(field, { key:
   'Enter', code: 'Enter', keyCode: 13, which: 13 })`. It is used by C11, C28,
   C29, C30, C37 and C38. Everything else - typing, clicking, double-clicking,
   moving focus - goes through `userEvent`. The component was not touched.
2. **The test store is seeded by dispatching, not by `preloadedState`.**
   `configureStore` cannot infer the preloaded-state type from `combineReducers`'
   reducer here - it settles on `undefined`, so any preloaded state is a type
   error, and the failure cascades into the middleware tuple as well
   (`npx tsc --noEmit` reproduces it). `createTestStore` therefore builds the
   store and dispatches `LOAD_TODO_SUCCESS` with the wanted todos and
   `setVisibilityFilter`. The todos always go in, because the todos reducer
   starts from one of its own. This is better than the alternative anyway: the
   app's own reducers decide the state shape, so no test can seed a state the
   app could not hold.

**Keeping unit tests off the network.** `renderWithStore`'s store carries a
`withoutTheNetwork` middleware in place of `callAPIMiddleware`. It recognises an
API action the same way the real one does - an action with a `types` array - and
answers it with nothing. `TodoList`'s mount effect, reachable now that rendering
is real, therefore dispatches into it and stops there. Nothing in the suite calls
`fetch`.

**Done criterion 4.** Every id in `qa/component-behaviour-inventory.md` is carried
by a passing test; I checked all 41 (`C01`-`C40` plus `N01`) mechanically against
the verbose run and none is missing. I implemented the nine substitutions the
Specifier named and made none of my own. Where a test asserts more than the
inventory's "required assertion" column - C10 also checks the `header.header`
root, C03 also checks that the count, the filters and the clear control are
inside the `footer`, C21 also checks the list sits between the toggle-all control
and the footer - that is the old case's observable part kept, not a substitution.

Two spots where a query by role or name was not available and I read the DOM
instead, both of them flagged in the inventory:

- C18's toggle-all label has no text and no `for`, so it has no accessible name;
  the test clicks `input.toggle-all`'s `nextElementSibling`. Not changed, per the
  out-of-scope rule.
- The footer count renders as `<strong>1</strong> item left`, so its words are in
  separate nodes and `getByText` (which reads direct text children only) cannot
  see `1 item left` as one string. C05, C19 and C02 read `.todo-count`'s
  `textContent`.

**Verified.**

- `npm test`: 23 files, 229 tests, 0 failing, 0 skipped.
- Buckets: `npx vitest run src` 10 files / 55 tests, `acceptance` 5 / 63,
  `scripts` 8 / 111. 10+5+8 = 23 and 55+63+111 = 229, so D2c's sum check holds.
  No floor moved: D2b and D2c are where they were, and this task adds no test
  under `acceptance/` or `scripts/`.
- D2a1 checked directly: every `C..` and `N01` id appears in the name of at least
  one passing test in `npx vitest run src --reporter=verbose`.
- D2a3-D2a5 run in the failing direction, one at a time, each reverted before the
  next: the `items` mutation in `Footer.tsx` fails C05 (and C03, C19, C02); the
  `todo.id + 1` mutation in `TodoItem.tsx` fails C25 and nothing else; dropping
  `selected` in `Link.tsx` fails C13 and nothing else. `git status --porcelain`
  clean after each revert.
- `npm run test:acceptance`: 5 files, 30 scenario executions, all passing. The
  three `react-shallow-renderer` rows of `toolchain dependencies 1` that the
  Specifier left red are green. Done criterion 1 and 3.
- `npx tsc --noEmit` clean. `npm run build` succeeds. `npm run test:property`
  14 / 141, `npm run test:hardening` 12 / 128.
- `npm ci` from the edited lockfile, in a scratch directory, installs cleanly and
  brings in no `react-scripts` and no `react-shallow-renderer` (A1-A5).
- CRAP gate over `src`: every function in `src/components/` is at 100% coverage
  and scores at or under 4. Two functions are over the gate,
  `src/middlewares/callapimiddleware.ts:18` (cc 5, cov 0%, CRAP 30.0) and
  `src/reducers/apis.ts:4` `executing` (cc 13, cov 100%, CRAP 13.0). Both are
  pre-existing, in files this task does not touch, and neither is component code.

**Left for the Cleaner.** The carried stamp-logic work in
`scripts/acceptance-mutation.ts` and the language-mutation runner, which is what
raises D2c's floor - the floor rule asks you to record the new counts. I found
nothing under `src/` that needed cleaning: no component changed, and the spec
files share their setup through `src/test-utils.tsx` rather than repeating it.
`.mutation/test-tier.json` is untouched and stays valid - the mutation tier lists
`acceptance`, `scripts`, `hardening` and `property`, and none of them changed.

**Left for the Hardener.** The inventory's "Gaps in the baseline" section still
stands in full; the rewrite covers none of those five and does not claim to.
Worth knowing: `Footer`'s plural branch and `TodoItem`'s completed-todo row are
now cheap to reach through the helpers in `src/test-utils.tsx`.

**Left for QA.** The D2a totals to record are 10 files and 55 tests under `src`.
D2a2's two out-of-scope files are unchanged at 6 and 8 with the inventory's
names. `e2e/toolchain-commands.spec.ts` is still yours to move, as the Specifier
said; A7's answer is now `@testing-library/react` and `@testing-library/user-event`
in both directions.

**Open questions.** None blocking. Two judgements I made rather than asked:
bumping `@testing-library/react` to `^16.3.3` (the Specifier left the version to
me), and using `fireEvent` for the Enter key, which is the only way to reach a
branch that reads `which` without changing the component that reads it.

**Second pass, after the chain resumed from the Specifier.** I changed nothing. The
rewritten component suite from the first pass is committed and unaffected by the
Specifier's fix, which touched only `features/toolchain-dependencies.feature` and
`qa/toolchain-commands.md`; `src/`, `package.json` and the lockfile already satisfy both
absence scenarios. Everything below is verification, and `git status --porcelain` is empty.

**The step-handler question, decided independently.** The ruling asked me not to take the
Specifier's reading on trust. No handler change is needed, and adding one would be wrong.
The two step texts differ only by the package literal:

- `<location> contains no reference to react-scripts`
- `<location> contains no reference to react-shallow-renderer`

Both are matched by the one handler `/^(\S+) contains no reference to (\S+)$/`, which takes
location and reference as regex captures and passes them to `filesReferencing` /
`nothingReferences`. That is one behaviour - a named location holds no occurrence of a
named string - so it gets one handler, and a literal handler per package would be a copy
differing only in a captured value. No other pattern in `acceptance/steps.ts` matches that
text, so the resolution is unambiguous.

**I proved the handler can fail for scenario 3, not just for scenario 1.** A handler shared
by two scenarios could be reached by only one of them and nothing would say so. With a
scratch `src/absence-probe.ts` carrying both names, the tier exits 1 with exactly two
failures - `toolchain dependencies 1/example_3` (`"react-scripts" still appears in
src/absence-probe.ts`) and `toolchain dependencies 3/example_3` (same for
`react-shallow-renderer`) - so each scenario reaches the assertion with its own operand and
reports its own package. Deleting the probe returns 30 green with a clean tree. This is
D3a's shape; running it is what earns the "no change needed" conclusion above.

**Done criteria, checked as the tree stands.**

1. `react-shallow-renderer` appears nowhere outside the files whose job is to name it:
   `features/toolchain-dependencies.feature`, `qa/toolchain-commands.md`, `PLAN.md` and
   this task file. Nothing in `src/`, `package.json` or `package-lock.json`.
2. `npm test`: 26 files, 263 tests, all passing.
3. `npm run test:acceptance`: 5 files, 30 executions, all passing. Per-scenario breakdown
   for this feature is 3 / 9 / 3, which is what D5 now expects.
4. D2a1 by hand over `npx vitest run src --reporter=verbose`: all 41 ids (`C01`-`C40`,
   `N01`) appear in the name of a passing test, none missing.

**Failing-direction runs, since the suite is the instrument this task delivers.** One
mutation at a time, each reverted before the next, tree clean after each: `Footer`'s item
word forced to `items` fails C05 (and C03, C19, C02); `deleteTodo(todo.id + 1)` in
`TodoItem` fails C25 and nothing else; dropping `selected` from `Link`'s `classnames` call
fails C13 and nothing else. Same results the Cleaner recorded, re-run against the tree as I
leave it.

**Other tiers, unmoved:** `npx tsc --noEmit` clean, `npm run build` succeeds,
`npm run test:property` 14 / 141, `npm run test:hardening` 12 / 129. Buckets `src` 10 / 55,
`acceptance` 5 / 63, `scripts` 11 / 145, so D2c's sum check holds at 26 / 263. No floor
moved on this pass. I ran no mutation, per the role brief.

**Left for the Cleaner.** Nothing new. The carried stamp work was discharged on the first
pass and is not reopened; no source changed on this one.

**Left for the Hardener.** The six survivors that resumed the chain were the `<package>`
column, which no longer exists. Expect 15 candidates for `toolchain-dependencies` and none
surviving, and expect scenario 1's stored record to be reused at `--level soft` because its
text is byte-identical to its task 01 form.

**Left for QA.** Unchanged from the Cleaner's note: D2a 10 / 55, D2b 5 / 63, D2c 11 / 145,
D1 26 / 263, D8 14 / 141, D9 12 / 129, D3 30 with the breakdown 3 / 9 / 3 for
`toolchain dependencies 1/2/3`. A7's answer is `@testing-library/react` and
`@testing-library/user-event` in both directions.

**Open questions.** None.

### Project manager rulings on the Coder handoff

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 23 files / 229 tests;
`npx vitest run src` 10 / 55; `npm run test:acceptance` green at 30 / 30, so the three rows the
Specifier left red now pass; `react-shallow-renderer` appears nowhere in `package.json`, the
lockfile or `src/`. I ran QA step D2a1 myself: all **41** inventory ids appear in passing test names,
none missing. I also ran D2a3 myself: forcing `Footer`'s item word to `items` fails a test whose name
carries `C05`, and reverting returns 55 passing. Accepted.

**Finding 1 corrects my own ruling, and the correction is right.** I passed on the Specifier's note
that React's synthetic `which` on keydown is the native `keyCode`. True as far as it goes, but
`@testing-library/user-event` v14 never sets `keyCode` at all, and jsdom does not derive it, so
`userEvent.keyboard('{Enter}')` yields `which === 0` and the Enter-key behaviours failed on the first
run. The Coder found that by reading the library's own source rather than inferring it, and fixed it
with a shared `pressEnter()` dispatching what a real browser sends.

Reaching for `fireEvent` at that one point is a deviation from "drive behavior through simulated user
interaction", and it is the correct deviation. `TodoTextInput` branches on `e.which`; the only way to
keep `userEvent` throughout would be to change the component, which this task's Out of scope
explicitly bars. Confining the deviation to one named helper, with everything else on `userEvent`,
is the right shape.

That said, `e.which` is deprecated, and a component readable only through a synthetic property that
modern testing libraries no longer populate is a real defect rather than a quirk of the test.
`tasks/05-function-components.md` is amended to replace it with `e.key` when that component is
converted, which is a behavior-preserving change at the moment the file is already being rewritten.

**Finding 2 is accepted as good judgment.** Seeding the test store by dispatching the app's own
actions rather than fighting `configureStore`'s `preloadedState` inference means the app's reducers
decide the state shape, so the helper cannot drift from the real store. Replacing `callAPIMiddleware`
with a middleware that swallows API actions is the right way to keep `TodoList`'s now-reachable mount
effect off `fetch`, and it keeps the network stub at the boundary the settled scope decision names.

Putting `src/test-utils.tsx` under `src/` so the architecture rule and the CRAP gate both reach it is
correct, and better than a top-level helper that no instrument would judge.

No test count floor moved; nothing is routed back.


### Cleaner

Owned `src/` and `scripts/`; `features/`, `qa/` and `e2e/` untouched, and no component,
action, reducer, selector or middleware was changed. No behaviour was added.

**The carried stamp work is done, and both runners are now shells over a tested
package.** `scripts/mutation-reuse/` is new. It holds what the two mutation runners
record between runs and what it takes to believe it, which is the logic task 01 found
no tier judging:

- `fingerprint.ts` (core) - which entries of a directory listing a stamp covers
  (`selectedFiles`) and the digest over their paths and contents (`fingerprint`).
  The selection is the part worth testing: the defect task 01 found was a stamp that
  did not cover what it claimed to, and that is a selection defect, not a hashing one.
- `stamp.ts` (core) - the record itself. `resultsAreReusable` gates on the version and
  the field, `stampText` writes it, `reachedVerdict` says whether a run earned the
  right to be stamped. The two runners' stamps differ only by the field they are
  written under, so they are two values of one `Stamp` type rather than two copies.
- `manifest.ts` (core) - the gherkin manifest block travelling in and out of a staged
  feature. Untested pure text handling in the same shell, closing the same gap.
- `files.ts` (shell) - the two file reads both runners share. Declared a shell in the
  layer map, so the CRAP gate and Stryker skip it and no core module can import it.

`scripts/acceptance-mutation.ts` and `scripts/mutation.ts` keep the environment: they
list, read, spawn and write. `scripts/acceptance-mutation.ts` no longer imports
`implementationHash` from the acceptance package.

**Behaviour preservation is demonstrated, not assumed.** Both stamps hash to exactly
what is committed under `.mutation/`: the refactored acceptance path recomputes
`sha256:ca92e55f...`, the value in `.mutation/acceptance-implementation.json`, so the
stored gherkin manifests stay reusable across this change; and the tier fingerprint
computed the old way and the new way agree on the tree as it stands. The sort was the
only thing that could have moved (`localeCompare` where `mutation.ts` used a default
sort) and it does not, on this file set. `node scripts/mutation.ts --help` runs the
refactored shell end to end - it fingerprints the tier, reads the stamp, reports
correctly that the tier has moved, and spawns Stryker with `--force`; I restored
`.mutation/test-tier.json` afterwards and `git status` on `.mutation/` is clean.

**The new specs were tested in the failing direction,** as PLAN section 4 requires,
one mutation at a time and each reverted: dropping the version gate in `stamp.ts`
fails "disbelieves a stamp from a version that covered something else"; dropping the
`without` filter in `selectedFiles` fails "leaves out the entries the selection
excludes"; dropping the sort in `fingerprint` fails "does not move with the order the
files were listed in"; taking the end marker out of `manifestBlock`'s slice fails
three of its four cases; making `reachedVerdict` unconditional fails "does not count
a run that never exited on its own".

**The rewritten suite, as my subject.** Every inventory id still names the test that
answers it, the mapping is unchanged, and `npx vitest run src` still reports 10 files
and 55 tests. What changed is the plumbing the eight spec files share:

- `src/test-utils.tsx` was doing two jobs and is split by them, with names that say
  which: `src/test-render.tsx` (how a component under test is mounted, driven and
  handed its actions - `createTestStore`, `renderWithStore`, `mockTodoActions`,
  `pressEnter`) and `src/test-queries.ts` (how rendered output is read when a role or
  a name will not reach it).
- `renderComponent(ui, options?)` is new, and is the store-less sibling of
  `renderWithStore`. Four spec files were each calling `userEvent.setup()` themselves;
  now one place decides how a user session is made, and `renderWithStore` is written
  in terms of it.
- `rootOf(rendered)` replaces five copies of `container.firstElementChild as
  HTMLElement`. Each spec still names its own root (`footer`, `anchor`, `section`,
  `header`, `list`), so the tests read as they did.
- `countText` and the clear-completed control were spelled twice, once with the
  explanation of why the count cannot be read by text and once without. They are now
  read the same way wherever they are read, with the explanation in one place.
  `shownTodoTexts` does the same for the three spellings of "the todos the user sees"
  in `App`, `MainSection` and `TodoList`.
- `TodoItem.spec.tsx` no longer imports `userEvent` only to spell a type; `TestUser`
  comes from the render helper.

**Verified.**

- `npm test`: 26 files, 263 tests, 0 failing, 0 skipped. Buckets: `src` 10 / 55,
  `acceptance` 5 / 63, `scripts` 11 / 145. 10+5+11 = 26 and 55+63+145 = 263, so D2c's
  sum check holds.
- D2a1 by hand: all 41 ids (`C01`-`C40`, `N01`) appear in the name of a passing test.
- D2a3-D2a5 in the failing direction, one at a time, each reverted and the tree clean
  after: `Footer`'s item word forced to `items` fails C05 (and C03, C19, C02);
  `deleteTodo(todo.id + 1)` in `TodoItem` fails C25 and nothing else; dropping
  `selected` in `Link` fails C13 and nothing else.
- `npm run test:acceptance` 5 files / 30 executions green. `npm run test:property`
  14 / 141. `npm run test:hardening` 12 / 129. `npx tsc --noEmit` clean.
  `npm run build` succeeds.
- CRAP gate over the whole tree: 45 files, 261 functions, 2 over the gate. Everything
  new and changed is at 100% coverage and scores at or under 3. The two over the gate
  are the two the Coder reported, unchanged and untouched:
  `src/middlewares/callapimiddleware.ts:18` (cc 5, cov 0%, CRAP 30.0), which this
  task's Out of scope bars me from testing, and `src/reducers/apis.ts:4` `executing`
  (cc 13, cov 100%), a single switch answering one question, which is the exception
  the shared CRAP definition names.
- Mixed-job scan, by Stryker mutant count on a dry run into a scratch incremental file
  (no mutants were tested, and `.mutation/` is untouched): `fingerprint.ts` 25,
  `manifest.ts` 19, `stamp.ts` 30, against 60-64 for the existing single-job modules
  `scripts/crap/options.ts`, `scripts/crap/score.ts` and
  `scripts/architecture/packages.ts`. Nothing indicates a source doing more than one
  job, so nothing was split further.
- No mutation run and no gherkin mutation, per the role brief.

**Floors that moved, which the D2b/D2c/D8/D9 floor rule asks me to record.**

- **D2c rises from 8 files / 111 tests to 11 files / 145 tests.** The three new spec
  files under `scripts/mutation-reuse/` are the stamp logic this task carried; D2c's
  floor note already anticipated the rise.
- **D9 rises from 128 to 129 tests, in the same 12 files.** One row, and not a test I
  wrote: `hardening/packages.hardening.ts` runs `test.each(PACKAGES)` for the pure
  dependencies a package grants, and there is now a fourth package. It passes, which
  says `scripts/mutation-reuse` grants exactly `node:crypto` and `node:path` and its
  core modules import exactly those.
- D2a (10 / 55), D2b (5 / 63) and D8 (14 / 141) are unmoved.

**Left for the Architect.** One duplication I could not remove without deciding a
boundary, which is yours. `fingerprint()` and `acceptance/generator.ts`'s
`implementationHash()` are the same digest, and the layer rules bar any cross-package
import, so neither package can reach the other's copy. The count of copies is
unchanged by my work - `scripts/mutation.ts` had its own inline digest before - but
one of them is now a tested module and the other is not the acceptance package's to
give away. Related: both runner shells still import `projectRoot` from
`acceptance/project-files.ts`, so the language-mutation runner depends on the
acceptance pipeline for one constant.

**Left for the Hardener.** `scripts/mutation-reuse/`'s three core modules are in
`modulesIn('core')`, so Stryker now mutates them; the mutation tier's own fingerprint
has moved as well, so the next `npm run test:mutation` is a full run by design.
`files.ts` is declared a shell and is deliberately outside both the gate and the
mutate set. The inventory's "Gaps in the baseline" section still stands in full and
the rewrite covers none of those five.

**Left for QA.** The numbers above are the ones procedure D wants: D2a 10 files / 55
tests, D2b 5 / 63, D2c 11 / 145, D1 26 / 263, D8 14 / 141, D9 12 / 129.
`e2e/toolchain-commands.spec.ts` still carries the pre-task figures (54 under `src`,
111 under `scripts`, the sum 228, hardening 128) and an explicit list of the eight
`scripts/` spec files; the three new ones are `scripts/mutation-reuse/fingerprint.spec.ts`,
`manifest.spec.ts` and `stamp.spec.ts`. Moving that file is yours, as the Specifier said.

**Open question, for the project manager.** `tasks/05-function-components.md` tells its
Coder to delete `pressEnter()` from `src/test-utils.tsx`. That helper now lives in
`src/test-render.tsx`, and `src/test-utils.tsx` is gone. The instruction still holds as
written otherwise; I did not edit another task's file to say so.

### Project manager rulings on the Cleaner handoff

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 26 files / 263 tests; `npx vitest run
src` unchanged at 10 / 55; `npx vitest run scripts` 11 / 145; hardening 129; acceptance tier 30 / 30;
all 41 inventory ids still appear in passing test names. Accepted.

The stamp package is the right discharge of the carried item, and for the right reason: it puts
`selectedFiles` - *which* entries a stamp covers - in the tested core, and that selection is exactly
where task 01's defect lived. The two runners' stamps becoming two values of one `Stamp` type rather
than two copies is what stops the defect recurring in only one of them. Declaring the package in
`scripts/architecture/packages.ts` so the boundary check, the CRAP gate and Stryker all reach it is
what task 01 established, and demonstrating behavior preservation by showing both fingerprints still
equal the values committed in `.mutation/` is the correct evidence.

Splitting `test-utils.tsx` into mount-and-drive versus read-rendered-output is a real cohesion split
rather than a file-size one, and removing five `firstElementChild as HTMLElement` casts removes a
class of test that breaks on markup changes it should not care about.

Its open question is answered by amendment, not argument: `tasks/05-function-components.md` referred
to `pressEnter()` in `src/test-utils.tsx`, which no longer exists. The reference is corrected to
`src/test-render.tsx`. It was right not to edit another task's file.

Floors moved as recorded: D2c 8 / 111 -> 11 / 145, D9 128 -> 129. D2a, D2b and D8 unmoved. Under the
recorded-rise rule the Specifier introduced, these need no procedure edit.


### Architect

### Hardener

### QA


### Project manager finding: `toolchain dependencies 1` has six live mutation survivors

Found during verification of the Cleaner handoff, not reported by any role. The Cleaner's brief bars
it from running mutation, so it could not have seen this; it is the Specifier's defect and the
Specifier owns the fix.

`node scripts/acceptance-mutation.ts` **exits 1**. On `toolchain-dependencies`, 12 candidates,
6 killed, **6 survived**. The pattern is uniform:

```
killed   $.scenarios[0].examples[0].location: package.json -> packagE.json
survived $.scenarios[0].examples[0].package:  react-scripts -> react-sCripts
```

The `<location>` column dies because a mutated location cannot be read. The `<package>` column
survives because the step asserts an **absence**: "`package.json` contains no reference to
`react-sCripts`" is true of any string that is not there, so every mutation of that operand keeps the
assertion true. The scenario cannot fail for the reason the new rows exist.

**This is the rule task 01 already recorded, violated by the change that introduced these rows.**
`PLAN.md` section 4 carries it, and the task 01 Specifier stated it when it chose to assert the
presence of production-build markers rather than the absence of development ones: an absence cannot
be mutation tested, because a dithered copy of a missing string is still missing, so such rows
survive by arithmetic. Parameterising the package name converted a safe inlined literal into exactly
that shape.

**The chain resumes from the Specifier.** Directions, without settling the design, which is the
Specifier's:

- The goal - having the acceptance tier judge done criterion 1 - is right, and should be kept. What
  cannot stand is a mutable example cell whose mutation leaves the assertion true.
- Two shapes are available. Inline the package names back into the step text so no mutable cell
  exists, keeping `<location>` parameterised because mutating it does break the check. Or assert
  something positive that implies the absence, so a mutated cell breaks it - for instance that the
  declared dependency set equals an expected set, where changing any name makes the comparison fail.
  There may be others; choose on merit and record why.
- No skip list. That was refused in task 01 and is refused here for the same reason: a survivor is a
  finding, not something to filter.

Every downstream role runs again as a fresh agent: Specifier, then Coder, Cleaner, Architect,
Hardener, QA. The Hardener re-run is what proves the replacement rows die.

**Standing guidance strengthened.** `PLAN.md` section 4 now also says that a Gherkin step asserting
an absence must not take its operand from an example column, since the whole column is unkillable by
construction.


### Project manager rulings on the second Specifier pass

Verified independently: `npm run test:acceptance` green at 5 files / 30 executions;
`node scripts/acceptance-mutation.ts` now **exits 0 with zero survivors**, the three new candidates
all killed and scenario 1's record correctly reused because its text is byte-identical to its task 01
form; only `features/`, `qa/` and this task file changed. The defect is discharged. Accepted.

**Its rejection of my suggested alternative is correct, and I was wrong to offer it as an equal
option.** I proposed asserting that the declared dependency set equals an expected set. That reaches
only `package.json`: the lockfile's set is the whole transitive tree, and `src` declares no set at
all. It would therefore have judged one of the three locations done criterion 1 names, while churning
on every dependency change through tasks 03 to 06. Naming the package in step text is the better
answer, and the Specifier should be reasoning about which shape actually holds rather than taking a
project manager's example as a menu.

**The choice of two scenarios over one scenario with two `Then` steps is the sharp part.** Mutation
candidates are example cells. With both assertions sharing one `<location>` column, the first step
fails first, so no candidate's kill would ever depend on the second step, and a weakened
`react-shallow-renderer` assertion would be invisible to mutation. That is the same failure mode as
the defect being fixed, one level subtler, and it would have passed every check the project runs.

Two further things are right about this pass. It recorded the reason in a comment under `Feature:`,
so the next person to reach for a parameter there meets the argument rather than rediscovering it.
And it swept the rest of `features/` for the same shape, confirming `production build 3` is the only
other absence step and that its literal is inlined with no examples table.

Keeping the medium `possible-synonym` finding at 0.571 is accepted: the Specifier checked that the
one-scenario variant draws the identical finding, so it follows from naming two packages rather than
from how they are split, and it is not accidental drift. Using the dry checker's report as evidence
for a decision rather than as a list to zero out is the right use of it.

**D3a is a genuine gap closed.** Procedure D had failing-direction rows for the component suite
(D2a3-D2a5) but none for the acceptance tier, so nothing checked that the tier could fail at all. The
new row writes a scratch source carrying both package names, requires exactly two failures, then
requires 30 green after deleting it.

**The chain continues from the Coder.** The Specifier reports no step-handler change is needed; as in
task 01, that is its reading and not a dispensation, and the Coder reaches its own conclusion.


### Project manager rulings on the third Coder pass

Verified independently: only this task file changed; `npx tsc --noEmit` exits 0; `npm test`
26 files / 263 tests; `npx vitest run src` 10 / 55; `npm run test:acceptance` 30 / 30. Accepted as a
no-change pass.

The step-handler judgment is reached correctly and for the stated reason: the two absence scenarios
differ only by a package literal, both are matched by the one existing handler, and a per-package
literal handler would be a copy differing only in a captured value. That is the brief's rule applied,
not merely its conclusion agreed with.

**The verification that mattered is that it proved the shared handler fails for scenario 3, not only
for scenario 1.** A single probe carrying both names produced exactly two failures, `toolchain
dependencies 1/example_3` and `3/example_3`, each naming its own package. That is the direct answer
to the concern the Specifier raised when it split the scenarios: that a weakened second assertion
could be invisible because the first fails first. Confirming both fail independently closes it, and
running the three component failing-direction checks against the tree as this pass leaves it, rather
than trusting the earlier run, is the right standard.

Nothing is routed back. The chain continues from the Cleaner.

