# Task 11: Convert class components to functions and extract their input rules

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task creates a testable module for the text-input rules.

**Status:** in progress

## Goal

Convert the two remaining class components to function components with hooks, and move the editing and submission rules they encode into a testable module.

## Context

`src/components/TodoTextInput.tsx` is a `PureComponent` holding `{ text }` state seeded from `props.text || ''`. Its rules:

- `handleSubmit` fires on `keyDown`. It trims the raw input value. It acts only when `e.which === 13`. It calls `onSave(trimmed)`. It clears its own state to empty only when `newTodo` is set.
- `handleBlur` calls `onSave(e.target.value)` with the **untrimmed** value, and only when `newTodo` is not set.
- `handleChange` writes the raw value to state.
- It renders with `autoFocus`, class `edit` when `editing`, class `new-todo` when `newTodo`.

That asymmetry between the trimmed submit path and the untrimmed blur path is current behavior. Preserve it exactly and record it in the specifier's note as a candidate defect for the project manager.

`src/components/TodoItem.tsx` is a `PureComponent` holding `{ editing }`. Its rules:

- Double-clicking the label sets editing.
- `handleSave(id, text)` deletes the todo when `text.length === 0` and edits it otherwise, then leaves editing in both cases.
- The `<li>` carries class `completed` from the todo and `editing` from state.
- The checkbox calls `completeTodo(todo.id, !todo.completed)`.

Note the empty-text rule differs by caller: `Header` refuses to add when `text.length === 0` and never calls `addTodo`, while `TodoItem` deletes on empty. Both are current behavior.


## Inherited: class field semantics changed silently in task 05

Task 05 moved `target` from ES5 to ES2022. TypeScript turns
`useDefineForClassFields` on by default at ES2022, and nothing in this
repository pins it, so class field initialization changed from `[[Set]]` to
`[[Define]]` without anyone asking for it. Task 05's QA found this by diffing
the built bundle: the *entire* byte difference between the two builds was class
field lowering in `TodoItem` and `TodoTextInput`, the only two class components
left.

It is safe as things stand, and QA established why: every field in both classes
has an initializer, neither redeclares `props`, and `React.Component` exposes no
accessor for `state` or `propTypes`. Those are the conditions under which the
two semantics agree. Do not assume they still hold after you change these
classes.

This task deletes both classes outright, which retires the question rather than
answering it. Two consequences. The lowering difference should vanish from the
bundle entirely; if it does not, something else is using class fields and you
should say so. And `state = { ... }` and `handleX = () => {}` class fields are
precisely what you are converting to `useState` and plain functions, so read the
built output once to confirm the conversion is faithful rather than trusting the
source diff.

## Inherited from task 10

**A feature file is missing a phrasing, and it is the specifier's to add.**
`features/todo-state-operations.feature` offers only "marking todo `<id>`
complete", so acceptance structurally cannot ask for `completed: false`. The
application has both halves of that operation and the feature describes one.
Not a hole today, because the flag is pinned unit-side, but a specifier touching
`features/` should close it.

**A standing rule for `src/actions/api.ts`, earned four times over.** A claim
about *an* operation is written as a claim about *every* operation. Task 09
found one of five request specs free; task 10's main hardening run found two
operation type prefixes free; its pass-2 hardener found three of five wrappers
able to bypass a seam with every gate green; and its final pin found two
wrappers held only by a browser test. The five operations are peers, and any
test naming one of them invites the other four to drift.

**Two calls, not one, when pinning a pass-through.** Task 10's QA proposed
closing the last of those with one assertion per wrapper. That would not have
worked: whichever value a single call passes, a mutant freezing to that value
matches it. Each wrapper is now driven twice with arguments differing in every
field.

## Scope

- Specifier: Gherkin for the input rules being extracted. The trim asymmetry, the enter-key rule, the clear-on-newTodo rule, the blur rule, and the empty-text-deletes rule.
- Coder: a testable module owning those decisions, with no React import and no DOM type in its signature. It answers questions such as what a submission with a given raw value, a given `newTodo` flag, and a given key should produce.
- Coder: rewrite both components as functions using `useState`. They call the module for decisions and do nothing but render and wire events.
- Coder: React 19's `memo` replaces `PureComponent` where the shallow-prop-comparison behavior matters. Decide whether it does, and say why in the handoff.
- Update the component test suites to the new implementations without weakening what they assert.

## Out of scope

- Changing keyboard handling, focus behavior, or the trim asymmetry. All preserved.
- Changing how the components are connected to the store. That is task 12.
- Changing markup, class names, or the DOM the user sees.
- Adding validation, debouncing, or controlled-input changes.

## Done criteria

- No class component remains in `src/`.
- A testable module owns the input and editing decisions, with no UI, filesystem, network, framework, or device dependency.
- Unit tests fail a plausible wrong implementation, including one that trims on blur.
- Acceptance tests generated from the Gherkin pass.
- Property tests pass, per the architect's assessment.
- Mutation survivors killed on the new module, per the hardener.
- `npm run lint`, format check, `npm run typecheck`, `npm test`, and `npm run build` pass.
- The regression suite from `qa/procedures/` passes unchanged.

## Handoffs

### Specifier

Wrote the Gherkin for the input and editing rules this task moves into a
testable module, and closed the phrasing gap task 10 routed here. Nothing else
changed: no source, no unit test, no QA procedure, no config, no manifest.

**Added**

- `features/todo-input-commits.feature` (6 scenarios, 11 executions): what a
  todo text field hands on, and when. Opening text, Enter trimming, clearing on
  the new-todo field only, losing focus committing untrimmed on the edit field
  only, and Enter being the only key that acts.
- `features/todo-input-effects.feature` (4 scenarios, 5 executions): what a
  committed text does. Added, refused, edited, deleted, and the editor closing.

**Changed**

- `features/todo-state-operations.feature`: the vocabulary now offers `marking
  todo <id> active` alongside `marking todo <id> complete`, and a new scenario 9
  drives both. Scenario 4's comment claimed to cover a marking and did not; it
  now points at 9. The manifest at the top of that file is now stale by my edit,
  which is expected - I did not touch it, and the hardener's tool regenerates
  it.

`todo-input-*` is a third feature family alongside `todo-api-*` and
`todo-state-*`, and it needs a third step vocabulary. The naming says so.

**The Context section in this task file is correct.** I read both components
before trusting it and every claim holds. Two notes on wording rather than
substance:

- `handleSubmit` trims *before* it tests `e.which === 13`, not after. The task
  text lists them in the other order. Nothing observable turns on it - a
  non-Enter key discards the trimmed value unread - but a coder extracting
  "trim, then decide" versus "decide, then trim" should know the source does the
  first and either is faithful.
- `TodoTextInput` seeds its state from `props.text || ''` once, at construction,
  and never re-reads the prop. Nothing in the Context says otherwise, but it is
  the rule `todo-input-commits 1` pins and it is easy to lose: `useState(props.text)`
  would put `undefined` into a controlled input the first time `Header` mounts
  one.

**Candidate defect for the project manager, as this task's Context asks**

The trim asymmetry is a defect, not a feature. `handleSubmit` saves
`value.trim()`; `handleBlur` saves `e.target.value`. So a todo edited to
`"  Buy oats  "` and committed with Enter is stored as `"Buy oats"`, and the
same edit committed by clicking away is stored with all four spaces. Worse at
the empty end: an edit field committed with Enter holding only spaces trims to
`""` and *deletes* the todo, while the same field committed by clicking away
holds three characters and *saves three spaces* as the todo's text, leaving a
row whose label renders blank. `qa/procedures/06` and `07` already record both
halves as observed. This task preserves it exactly and specifies it exactly:
`todo-input-commits` 2, 3 and 4 and `todo-input-effects` 3. Fixing it is a
behavior change and belongs to a task that is allowed to make one.

**The acceptance run is red on purpose.** `npm run acceptance` now reports
`Test Files 3 failed | 6 passed`, `Tests 17 failed | 58 passed` of 75. Sixteen
of the seventeen are `Unsupported step`, one per new step form; the seventeenth
is `Not an operation: marking todo 2 active` from scenario 9's second row. The
57 executions from tasks 09 and 10 still pass, and scenario 9's first row passes
already, which is the check that the new scenario describes the app as it is
rather than as I imagine it. That is the acceptance target: it goes green when
the coder has the rules module, the step handlers for it, and one widened
phrase. Nothing in CI runs `npm run acceptance`, so no gate is red meanwhile.

**What the features pin, read out of the source rather than the task text**

Verified against `src/components/TodoTextInput.tsx`, `src/components/TodoItem.tsx`
and `src/components/Header.tsx`.

- A field opened on a text holds it; opened on none, it holds `""`.
  commits 1, whose second row is the `undefined` case.
- Enter commits `value.trim()`. commits 2 row 1 and commits 3.
- Enter clears the field when and only when it is the new-todo field. commits 2
  asserts the clear, commits 3 asserts the edit field is left alone.
- The field runs no emptiness check of its own: a field of spaces commits `""`
  and still clears. commits 2 row 2. This is `qa/procedures/04` step 4, where
  the field empties and nothing is added.
- Losing focus commits `e.target.value`, untrimmed, and only when it is not the
  new-todo field. commits 4 and 5. commits 4's second row saves three spaces,
  which is `qa/procedures/07`'s closing note.
- No key but Enter does anything, Escape included, in either field. commits 6.
  That is a departure from the TodoMVC reference; `qa/procedures/04` and `05`
  record it as observed and the scenario comment says so.
- `Header` refuses `text.length === 0` and never calls `addTodo`. effects 2.
- `TodoItem` deletes on `text.length === 0` and edits otherwise. effects 3 and 4.
  Length, not blankness: effects 3's second row edits a todo to three spaces
  where a trimming rule would have deleted it.
- A commit leaves editing in both branches. effects 3 and 4 both close the
  editor.

**What is deliberately not specified**

- Double-clicking a label to open the editor. It is UI wiring, this task's Scope
  does not list it among the rules being extracted, and `qa/procedures/05`
  already owns it.
- `autoFocus`, the `edit` and `new-todo` class names, and the `li`'s `completed`
  and `editing` classes. Markup, explicitly out of scope, and pinned unit-side.
- The checkbox's `completeTodo(todo.id, !todo.completed)`. It is a toggle in the
  component, not an input rule, and `qa/procedures/09` owns the observable half.
- Whether the module is one file or two, what its functions are called, and
  whether `Header`'s half lives in it or stays in `Header.tsx`. The features ask
  the app a question and read its answer; how the coder routes it is theirs.
- Anything about `memo` or re-render counts. Not observable.

**Step vocabulary the coder implements**

Sixteen forms. `todo-input-commits`: `a field is opened on <text>`; `the field
starts holding <text>`; `the <kind> field holds <text>`, whose kinds are
`new-todo` and `edit`; `the <key> key is pressed`; `the field loses focus`; `the
text <text> is committed`; `nothing is committed`; `the field is cleared`; `the
field is left as it is`. `todo-input-effects`: `the text <text> is committed
from the new-todo field`; `the text <text> is committed from the edit field for
todo <id>`; `the todo <text> is added`; `no todo is added`; `todo <id> is edited
to <text>`; `no todo is edited`; `todo <id> is deleted`; `no todo is deleted`;
`the editor is closed`.

Five things about them.

- Every text is written as JSON, quotes included, because this whole family is
  about surrounding spaces and an examples cell is trimmed before you see it.
  `| "  Ship it  " |` survives the parser with both pairs of spaces; `|   Ship
  it   |` does not. I confirmed that on the real `gherkin-parser`: the IR holds
  `"\"  Ship it  \""`. The handlers must parse the cell as JSON rather than
  take it literally, and `undefined` in commits 1 is a bare word, not JSON, in
  the practice `todo-api-refusals` already uses for `null` and `undefined`.
- **Do not write the field pattern as `^(.+) holds (.+)$`.** It matches
  `the todo list holds 2 todos` from `todo-state-operations`, and the runtime
  reports an ambiguous step rather than running either. `^the (.+) field holds
  (.+)$` covers the two literal forms and the `<kind>` outline and collides with
  nothing.
- `^the text (.+) is committed$` must stay anchored, or it swallows
  `the text ... is committed from the new-todo field`. The two families use
  deliberately different sentences for the same event seen from two sides; keep
  them that way.
- `the field starts holding` is worded apart from `the ... field holds` on
  purpose, so no pattern can match both.
- I checked all 27 distinct new step texts against the 64 patterns in
  `acceptance/steps/todo-api.ts` and `acceptance/steps/todo-state.ts`. The only
  hit is the intended one: `the app starts marking todo <id> <flag>` matches
  `^the app starts (.+)$`, which is how that family already routes its five
  operations. Nothing else collides in either direction.

**The routed job from task 10, closed**

`todo-state-operations` offered `marking todo <id> complete` and nothing else,
so acceptance could not ask for `completed: false`. I closed it by putting both
directions in the vocabulary and adding scenario 9, which drives each of them
through a full start/in-flight/answer/settle cycle. It is numbered 9 rather than
inserted after 4 so that no existing handle moves; the comment says where it
belongs.

Two things the next reader should know rather than rediscover.

- The `flag` column in scenario 9 is a free input and I declared it in the file.
  State-side the two directions of a marking are the same operation: the list
  takes whatever the backend confirms, so `complete` and `active` produce
  identical state for identical answers. What actually differs is the request,
  and the request is `todo-api-requests` 4, which already covers `true` and
  `false`. That feature's own header draws the line - "what the operation sends
  ... is todo-api-requests; this feature starts where those stop" - so a step
  here that read the outgoing request would break the family's charter. I did
  not add one.
- What scenario 9 does buy, beyond the phrasing, is real: scenario 4's comment
  claimed an edit *and a marking* replace the todo whole, and only the edit was
  ever driven. Now both are.
- The step handler at `acceptance/steps/todo-state.ts:146` is
  `/^marking todo (.+) complete$/` with `true` hard-coded at line 149. Widening
  it to carry the flag is the coder's one-line change, and until it lands
  scenario 9's second row is the seventeenth acceptance failure.

**Declared free columns, so the hardener reads them as declared**

- commits 4's `committed`: the text the assertion expects back, in the practice
  `todo-api-requests` records for its `id` column. It varies to say the text is
  carried untouched, and both rows go red against a field that trims on blur.
- effects 3's `text`: the same, and both rows go red against a rule that trims
  before measuring emptiness.
- commits 6's `kind` and `key`: both free, unavoidably. The claim is a negative
  universal - no key but Enter commits, in either field - so no cell can be
  written that a correct implementation fails. They vary to name the class.
- operations 9's `flag`, for the reason above.
- Every other column is the answer to its row's question: commits 1's `held`
  from `text`, commits 2's `committed` from `held`, operations 9's `answer` and
  `list`.

**ir-dry-checker**

Used `.aps/bin/gherkin-ir-dry-checker`, the real one, and reimplemented nothing.
Per feature, in the prescribed order: wrote the Gherkin, pruned the parameters,
parsed with `.aps/bin/gherkin-parser`, dry-checked, reviewed, considered
`Background`, wrote the note.

The report drove two edits.

- One `placeholder-variant` finding at high confidence: `the text <committed> is
  committed` and `the text <held> is committed` were one step form wearing two
  slot names. Renaming commits 4's column to `committed` cleared it, and the
  Given now reads `the edit field holds <committed>`, which states the scenario's
  claim outright - what the field holds is what gets committed.
- commits 6 originally had a `Tab` row. Tab moves focus, which fires the blur
  rule, so that row would have asserted the key rule and the focus rule at once
  and been wrong about the second in a real browser. It is `ArrowUp` now, and
  the comment says why Tab is absent.

No `duplicate-in-scenario` finding remains in either new file, and my edit to
`todo-state-operations` introduced no finding kind that file did not already
have. What is left everywhere is `possible-synonym` and `near-duplicate` between
steps that are one form with different data - the checker's own guidance is not
to merge on similarity alone.

**Background**

None, in either new feature, and not by omission. `--include-exact` reports no
repeated `Given` at all: commits 1 to 6 each open a different field on a
different text, and every effects scenario is a single `When`. The exact
duplicates the checker does list are actions and assertions - `the Enter key is
pressed`, `the field is left as it is`, `the editor is closed` - which are not
setup and cannot be hoisted. `todo-state-operations` keeps the Background it
already had; scenario 9 starts from it like every other scenario in that file.

**QA procedures**

None changed, as this task predicted. Everything specified here is already
recorded as observed in `qa/procedures/04`, `05`, `06`, `07` and `09`, and I
added no user surface and removed none. Those five are worth reading beside the
new features: they are the same rules seen through the UI, and if the coder's
conversion moves any of them, the E2E suite goes red before the acceptance suite
does.

**Verified**

`gherkin-parser` exit 0 on all nine feature files. `gherkin-ir-dry-checker`
clean of actionable findings on the three I touched, with and without
`--include-exact`. `npm run acceptance`: 58 passed, 17 failed, all seventeen
accounted for above. `npm run format:check` and `npm run lint` pass with the new
files present. I did not run `npm test`, `npm run build`, `npm run typecheck`,
`npm run properties`, `npm run hardening` or the E2E suites: no source changed,
so there was nothing for them to verify. I wrote nothing under `build/` that
survives - the IR and reports I generated went to a scratch directory, because
`build/` is only partly gitignored.

**Open questions for the project manager**

None blocking. Two recorded rather than guessed at.

1. `todo-input-effects` specifies `Header`'s refusal and `TodoItem`'s delete as
   two answers to one question, which is what makes the asymmetry testable in
   one place. That invites the coder to route `Header` through the new module
   even though `Header` is already a function component and this task's Scope
   names only the two classes. I judged the acceptance target right and the
   implementation open: the steps ask the app, not a named function. Say if you
   would rather `Header`'s half stayed out of the module.
2. The trim asymmetry above is specified as it stands and I did not specify a
   fix. It is the second finding in this project that is a defect preserved on
   purpose, after the `console.log` task 10 removed. If it is ever to be fixed,
   `qa/procedures/06` and `07` and `todo-input-commits` 4 are the three places
   that would have to move together, and a specifier has to move them first.

**Left for the coder**

The acceptance target is the two new feature files, the 16 executions they
generate, and scenario 9's second row. The rules module, the step handlers, the
third world in `acceptance/steps/`, and the widened marking phrase are yours. I
wrote no source, no handler and no manifest.

### Coder

Both classes are gone. `src/todo-input/` holds the rules they encoded, the two
components and `Header` ask it, and the acceptance suite drives it with no React
in the way. `npm run acceptance` is 75 of 75.

**Added**

- `src/todo-input/field.ts`: what a field hands on, and when. `openingText`,
  `commitOnKey(field, held, key)`, `commitOnBlur(field, held)`. A commit is
  `{ text, clearsField }`, and `null` is "nothing is committed, the field is
  left as it is". `FieldKind` is `'new-todo' | 'edit'`, so which field is asking
  is an argument rather than a component's private business.
- `src/todo-input/effects.ts`: what a committed text does.
  `commitFromNewTodoField(text)` answers `add` or `refuse`;
  `commitFromEditField(id, text)` answers `{ change, closesEditor }` where the
  change is `edit` or `delete`. Both call one `isEmpty`, which is the point: the
  two callers ask the same question and get opposite answers, and the shared
  predicate is where that is visible.
- `src/todo-input/field.spec.ts` and `effects.spec.ts`: 18 tests, written before
  either module existed and red for the right reason first.
- `acceptance/steps/todo-input.ts`: the third step vocabulary, 18 patterns, its
  own world, registered in `acceptance/steps/index.ts` beside the other two.

**Changed**

- `TodoTextInput` and `TodoItem` are function components. `Header` now asks the
  module instead of testing `text.length !== 0` inline.
- `acceptance/steps/todo-state.ts`: `/^marking todo (.+) complete$/` is now
  `/^marking todo (.+) (complete|active)$/` and carries the flag through the
  `completedFlag` helper that was already there for `every todo in the list
  reads`. That is the seventeenth failure, closed.
- `scripts/architecture/rules.mjs`: the acceptance suite's allow list gains
  `src/todo-input/*`, with the reason rewritten to say three families and why.
  Nothing else in the graph moved.
- Component specs: six tests added, none changed or removed. They pin what only
  a rendered component can pin - that the right rule is wired to the right event
  - because acceptance never renders anything. A field opened on no `text` prop
  holds `""`; Enter saves trimmed; blur saves untrimmed; Enter leaves a non-new
  field alone; no other key saves; and a `TodoItem` blurred on three spaces
  edits rather than deletes, which is the project manager's sharp end seen
  through the component.

**The one implementation detail that changed: `e.which === 13` is now
`e.key === 'Enter'`.** The rule had to leave the component, and a module that
takes a DOM key code would be taking a DOM detail into a testable module while
the feature file says `the Enter key is pressed`. The two identify the same key
in every browser this app runs in, `which` is deprecated, and both harnesses
that press keys send both: `src/test-support/keyboard.ts` sets `key`, `code`,
`keyCode` and `which`, and Playwright's `press('Enter')` sets all of them too.
All three E2E suites pass unchanged, which is where a real key event is what
gets pressed. If you consider this out of scope under "no keyboard handling
changes", say so - the alternative is a `keyCode` in a module signature.

**`memo` on `TodoItem`, nothing on `TodoTextInput`.** The two `PureComponent`s
were not equal in what shallow comparison bought them.

- `TodoItem`'s props are `todo` - one object out of the store - and the bound
  action creators, which `connect` builds once per store because
  `mapDispatchToProps` here takes no `ownProps`. `TodoList` re-renders on every
  store change and maps every todo, so the comparison really did skip rows whose
  own todo had not changed. React 19 does not memoize on its own here (no
  compiler in this build), so dropping it would re-render every row on every
  change. `memo` keeps it.
- `TodoTextInput` is handed a fresh `onSave` closure by both callers on every
  render. Its shallow comparison could never succeed, so `PureComponent` never
  skipped a render of it and `memo` would only add a comparison that always
  fails. Left off deliberately, not forgotten.

Neither is observable, so nothing in the suites asserts it. Both files say which
they are and why.

**Task 05's class-field question is retired, and the bundle says so.** I built
before and after and read the output rather than the source diff. The old bundle
carried `class extends x.PureComponent{state={...};handleSubmit=e=>{...}}` -
exactly the two class fields task 05's QA diffed - and three occurrences of
`PureComponent`. The new one has neither: one `PureComponent`, which is React's
own definition, and both components emitted as arrow functions. Four class
declarations remain in the whole bundle and all four are dependencies (immer's
`Immer`, RTK's `MiddlewareArray` and its two `_type` carriers), compiled by their
own builds and not by this repository's `useDefineForClassFields`. No file under
`src/` contains the word `class` as a declaration any more. So the lowering
difference did vanish, as the task predicted, and nothing else was using class
fields.

**What the acceptance handlers do and do not decide.** The step file plays the
part `TodoTextInput` plays: it asks a rule what an event commits and then does
what the answer says, including emptying the field when `clearsField` says to.
It decides nothing itself - every assertion reads a value some function in
`src/` returned. Text cells are parsed as JSON, per the features' declaration,
and `undefined` is the bare word. The field pattern is
`^the (.+) field holds (.+)$` as the specifier instructed; I did not write the
`^(.+) holds (.+)$` form. No step is ambiguous: the runtime reports ambiguity
rather than guessing, and all 75 executions run.

**Verified**

`npm run acceptance` 9 files / 75 tests, all passing. `npm test` 21 files / 193
tests (was 19 / 169: two new spec files, 18 module tests and six component
tests). `npm run lint`, `npm run format:check`, `npm run typecheck` (six
projects, 0 errors), `npm run build`. `npm run properties` 6 / 48. `npm run
hardening` 7 / 61. `npm run test:e2e` 22 passed; `test:e2e:dev` and
`test:e2e:preview` 21 passed, 1 skipped. No dependency installed, lockfile
untouched, nothing committed.

**Left for the next roles**

- Cleaner: `wholeNumber` is now copied in all three step files - `todo-api.ts`,
  `todo-state.ts` and mine. I added the third copy rather than restructure two
  files I was otherwise not touching; whether the three families should share a
  cell vocabulary (`wholeNumber`, and the JSON-text reader mine adds) is yours to
  decide. Nothing else I wrote is duplicated.
- Architect: two allow lists to consider. `properties/**` and `hardening/**` do
  not name `src/todo-input/*`, so neither suite can reach the new modules until
  one of you widens them - the hardener will need `hardening/**` widened to drive
  a mutation scan at all. And there is a rule this repository would now support
  that it does not have: `src/todo-input/**` imports nothing, in the shape of
  "the todo API policy depends on nothing". I did not add it, because writing a
  new boundary rule is yours; the graph is ready for it.
- Hardener: the two modules are small and total, and the specs already drive
  every peer as a set - both fields for every claim that holds for both, both
  ids and two texts for every pass-through, both branches for `closesEditor`.
  What I have not proved is that no survivor remains.
- QA: no procedure changed and none needed to. `qa/procedures/04`, `05`, `06`,
  `07` and `09` are the same rules seen through the UI, and all three E2E suites
  pass.

**Open questions**

None blocking. One judgment recorded above rather than guessed at: the
`which` -> `key` change, which I made because the rule had to leave the DOM
behind and the feature file names keys by name.

### Cleaner

Behavior-preserving cleanup of what the coder left. One split, one DRY pass, one
unreachable branch removed and one doc comment added. No feature file, no QA
procedure, no manifest, no config and no dependency changed; the suites that
read them were all run.

**The branch had moved, and I left it alone.** The coder's note ends "nothing
committed"; the branch is at `3977066`, which is that work committed, and the
working tree was clean when I started. I read the commit as the coder's change
and cleaned it in place. I committed nothing and reset nothing; my changes are
in the working tree.

**The routed job: `wholeNumber`. Shared, narrowly, and the module says what may
follow it in.**

`acceptance/steps/cells.ts` now holds `wholeNumber`, `text` and `textOrNothing`,
and the four step files import what they need. Task 10's cleaner left the two
copies alone and gave a reason worth answering rather than overruling silently:
a shared cell module would hold one of the three flag parsers and invite the
other two in after it, merging vocabularies the specifier separated on purpose.

The answer is that the reason applies to `flag` and not to `wholeNumber`. The
three `flag`-shaped parsers differ because the features differ - `todo-api-*`
spells a missing flag as `null` and `undefined`, `todo-state-*` takes `true` and
`false` only, and `completedFlag` beside it reads the words `complete` and
`active`. `wholeNumber` differs in nothing: three independent authorings
produced the same six lines with the same error message, because "this cell is a
whole number" is a question about how the feature files spell a number and not
about what any family means. A todo id, a count and an HTTP status are one
reading. Divergence there would be a defect, not a dialect.

So the module's doc states its charter and names what stays out and why, which
is where task 10's warning now lives instead of in a task file: what belongs is
a reading that asks one question no matter which feature file asks it; the three
flag parsers are named as the thing that must not follow it in.

`text` and `textOrNothing` moved too. They are the JSON-text convention the
`todo-input-*` features declare, and after the split below they have two callers
rather than one, so leaving them in one of the two files would have made that
file the other's library.

**The mixed-job scan: the third step vocabulary was two.**

Mutants counted with Stryker's instrumenter, not run - no mutation testing, per
the brief, and no test executes.

| source | before | after |
| --- | --- | --- |
| `src/todo-input/field.ts` | 21 | 21 |
| `src/todo-input/effects.ts` | 16 | 16 |
| `src/components/TodoTextInput.tsx` | 16 | 16 |
| `src/components/TodoItem.tsx` | 20 | **18** |
| `src/components/Header.tsx` | 7 | 7 |
| `acceptance/steps/todo-input.ts` | 172 | split |
| `acceptance/steps/todo-input-commits.ts` | - | 81 |
| `acceptance/steps/todo-input-effects.ts` | - | 69 |
| `acceptance/steps/cells.ts` | - | 25 |
| `acceptance/steps/todo-api.ts` | 253 | 242 |
| `acceptance/steps/todo-state.ts` | 274 | 263 |
| `acceptance/steps/index.ts` | 12 | 13 |

The two new `src/todo-input/` modules are small and each has one subject, so
neither was split - splitting `effects.ts` in particular would destroy the thing
it exists for, which is that both callers of `isEmpty` are visible in one file.
The one source the scan flagged is `acceptance/steps/todo-input.ts`: 172
mutants, eight times the next new file, in two neighbourhoods with nothing
between them.

It is the same shape as task 10's `apis.ts`. Its world held six fields in two
groups - `field`, `held`, `heldBefore`, `event` on one side, `added` and
`edited` on the other - and no handler, helper or assertion read across the line.
The two halves import different modules, bind different feature files, and throw
error messages that are meaningless to each other. It is now
`acceptance/steps/todo-input-commits.ts` and
`acceptance/steps/todo-input-effects.ts`, named after the feature files a reader
arrives from, with `acceptance/steps/index.ts` composing four worlds where it
composed three. All 18 step patterns are byte-identical to the coder's and no
handler body changed; I diffed them both ways to be sure.

**Why this is not the split task 09 and task 10 declined.** Both declined to
split a step file, and both gave the same reason: one job, bind a feature
vocabulary to the thing it describes. That reason holds for `todo-api.ts`, whose
three feature files build a request and then execute it through one world, and
for `todo-state.ts`, whose four drive one store. The unit that has actually held
constant across this suite is not one file per family - it is **one file per
world**, and a world is whatever one module under test needs remembered between
steps. `todo-input.ts` was the first file holding two, because its two feature
files cut the pipeline in half on purpose: `todo-input-commits` stops at the
text a field hands on and `todo-input-effects` starts there, using deliberately
different sentences for the one event so that no pattern matches both. Splitting
the file restores the convention rather than breaking it, and `index.ts` now
says so in as many words.

What the split shows that the combined file hid is small but real: the commits
half never reads a todo id, and the effects half never knows a field exists. The
`todo-input-*` family is one family asked of two modules that do not import each
other, and the vocabulary is now shaped like the thing it describes.

**One unreachable branch, in `TodoItem`.** `commitFromEditField` always answers
`closesEditor: true`, so `if (closesEditor) setEditing(false)` had a false arm
nothing could reach - the one uncovered branch in `src/components/` and the
reason that directory sat at 95.83%. It is `setEditing(!closesEditor)`, which is
the same behavior for the answer the module gives and the same behavior for the
answer it does not: a commit only happens while the editor is open, so "editing
is now whatever the rule left it" and "close it if the rule said to, otherwise
leave it" are the same statement. `src/components/` is at 100% on all four
measures. **This is the only edit I made that touches a code path rather than a
name, a file boundary or a comment, and it is the one to look at first if
anything downstream disagrees.**

**`Header` says why it asks the module.** The other two components got doc
comments explaining their relationship to `src/todo-input/`; `Header` was left
with a bare `commitFromNewTodoField` call and a reader has to guess why a
component defers a `length` test. It now says: refusing an empty commit is the
module's answer rather than a test in this file, because the edit field asks the
same question and is answered the other way. See the warning below - that
sentence is deliberate, and it is the asymmetry stated out loud.

**Coverage.** Provider installed and not persisted, the established route:
`npm install --no-save @vitest/coverage-v8@5.0.0`, `package.json` md5
`4fad73d5...` and `package-lock.json` md5 `29184ac9...` identical before and
after, finished with `npm ci`. Whether to persist it is task 14's question.

`src/`, under the unit suite, before this pass 95.55% statements / 88.7%
branches / 97.63% functions; after 95.53% / 90% / 97.63%. The one statement and
the two branch arms that left are the `if` above. `src/components/` drops off
the report entirely: every file in it is at 100%. Every remaining uncovered line
in `src/` belongs to a later task, unchanged from task 10's list except that
`TodoTextInput`'s branch is now covered - `src/index.tsx` (the entry adapter),
`src/containers/FilterLink.ts` line 21 (task 12), `src/selectors/index.ts` 15-19
(task 13).

Acceptance-side, after the split: `todo-input-commits.ts` 90.9% statements,
`todo-input-effects.ts` 91.3%, `cells.ts` 70%, `todo-api.ts` 94.93%,
`todo-state.ts` 93.26%, `runtime.ts` 88.23%. Every uncovered line in all of them
is a `throw` - the vocabulary refusing a phrase no feature file uses - which is
the same reading task 10 recorded. `cells.ts` looks worst at 70% because it is
nine lines of parsing and two of those throws.

**CRAP, measured.** Complexity from ESLint's own rule at `max: 1`, which reports
every function:

    npx eslint src acceptance scripts qa properties hardening \
      --rule '{"complexity":["error",{"max":1}]}'

189 functions exceed complexity 1 across the whole repository: 111 at 2, 48 at
3, 19 at 4, 6 at 5, 2 at 6, 2 at 7, one at 8 and one at 9. Everything this task
created or changed is at complexity 1 or 2 and at 100% coverage, so CRAP 1 or 2;
`TodoItem`'s `save` went from 3 to 2. Above complexity 4, and with coverage in
hand: `classifyRun` at 9 and `readRunReport` at 8 are in
`scripts/acceptance/runner-protocol.mjs` at 97.95% statements / 100% lines, so
CRAP 9.0 and 8.0; `forAll` at 7 in `properties/tiny-check.ts` at 96.8%, CRAP
7.0; `boundaries.mjs`'s `walk` and `todo-state.ts`'s `isRunning` at 5, CRAP 5.0.
Nothing is at the gate.

The functions above complexity 4 that no unit suite covers are all adapter
shells that a suite runs as a process rather than imports - `runner-worker.mjs`,
`aps.mjs`, `qa/stub/`. That is task 09's arrangement working as intended: the
decisions were pulled out into `runner-protocol.mjs`, which is the module at
98%, and the brief says to keep the shells out of the test tooling. I left them.

**What I did not do, deliberately**

- **Nothing specified was made kinder.** Enter trims and blur does not; `Header`
  refuses an empty commit and `TodoItem` deletes on one; Escape does nothing in
  either field; an edit committed with Enter on three spaces deletes the todo
  while the same edit committed by clicking away saves three spaces and leaves a
  row whose label renders blank. All of it is exactly where the coder left it.
- **Two of my edits make the asymmetry easier to see, which is the point of
  saying so here.** `todo-input-effects.ts` is now a file whose entire content
  is the two opposite answers to one question, with nothing else in it, and the
  `Header` doc comment states in one sentence that the edit field asks the same
  question and is answered the other way. A reader who did not know now finds out
  in two places instead of none. That makes it more tempting to fix and no more
  fixable: the project manager's ruling stands, `qa/procedures/06` and `07`,
  `todo-input-commits 4` and `todo-input-effects 3` all pin it, and a fix needs
  a specifier to move first.
- **`memo` on `TodoItem` and not on `TodoTextInput`, and `FieldKind` as an
  argument, are untouched** - both comments, both reasons, both files. They are
  the two places where consistency would have been worse than the asymmetry.
- **`TodoTextInput` still reads the DOM for the value it already holds.**
  `onBlur` passes `e.target.value` and `onKeyDown` passes `e.currentTarget.value`
  to rules the acceptance suite drives with the held text, and the component
  holds that same text in `held`. Feeding both from `held` would be tidier and
  would make the component and the step handler feed the rule identically. I did
  not, because they are not provably identical under an IME: React can leave
  state a composition behind the DOM value, and the current code commits what
  the user sees. The two ways of reading it are forced apart by React's types -
  `KeyboardEvent.target` is untyped, which is why the class cast it - not by
  anything this repository chose.
- **`e.which` to `e.key` was not revisited.** The project manager accepted it in
  the second round; `src/test-support/keyboard.ts` still sends `key`, `code`,
  `keyCode` and `which` together, which is what a real Enter carries. Worth one
  note for the hardener: because the helper still sends all four, the unit suite
  cannot tell a `key`-reading component from a `which`-reading one. Nothing is
  wrong today - the rule lives in a module that has no DOM in its signature at
  all - but a mutation of that reading is not something the component specs can
  catch.
- **The component specs were not restyled.** `setup` in three of them still uses
  `Object.assign` and `props: props`. It is pre-existing shape from task 02,
  identical in all three, and rewriting one of the three would have made the set
  less consistent, not more.
- **`field.spec.ts` still lists `Tab` among the keys that commit nothing**, where
  `todo-input-commits 6` deliberately does not. That is right at the module's
  level: `commitOnKey` has never heard of focus, and the specifier's reason for
  dropping the row - a Tab in a browser also blurs, so the scenario would assert
  two rules at once - applies to the scenario and not to the function.
- **`scripts/architecture/rules.mjs` is unchanged.** Its acceptance reason talks
  about three families of feature, which is still true after the split; the file
  layout is `index.ts`'s story and that is where I put it.

**Verified**

`npm run lint`, `npm run format:check`, `npm run typecheck` (six projects, 0
errors), `npm test` 21 files / 193 tests, `npm run build`, `npm run acceptance` 9
files / 75 tests, `npm run properties` 6 / 48, `npm run hardening` 7 / 61,
`npm run test:e2e` 22 passed, `test:e2e:dev` and `test:e2e:preview` 21 passed / 1
skipped. Every count is the one the coder left. All 18 step patterns diffed
identical across the split, and the handler bodies diffed to nothing but the
reordering and one parameter rename. Lockfile and `package.json` byte-unchanged,
nothing committed, nothing reset.

**Left for the next roles**

- Architect: the two allow lists the coder routed to you are still as he left
  them - `properties/**` and `hardening/**` do not name `src/todo-input/*`, and
  the hardener needs the second widened before it can scan the new modules at
  all. The `acceptance/**` list already covers the files I added, because it
  allows `acceptance/**`. The "`src/todo-input/**` depends on nothing" rule the
  coder says the graph would support is still yours to write, and it is still
  true: neither module imports anything.
- Hardener: the mutant counts above are a scan, not a run - `field.ts` 21 and
  `effects.ts` 16 - and nothing has been proved about survivors. Two places to
  look that this pass created rather than inherited: `setEditing(!closesEditor)`
  in `TodoItem`, and `cells.ts`, whose three parsers are now the only copy in the
  suite and are reached by all four step vocabularies.
- QA: no procedure changed and no user-visible surface moved. The acceptance run
  still reports 9 files and 75 tests named after the feature files, so the split
  is invisible in its output; what moved is which file a step handler lives in.

**Open questions**

None blocking. One judgment recorded rather than guessed at: the `if
(closesEditor)` branch, removed because nothing could reach its false arm. If
the architect or the hardener would rather the component tested the answer than
assigned it, it is a one-line revert and the only cost is one uncoverable branch
coming back.

### Architect

The architecture the coder and the cleaner left is right, and I changed no
source file in `src/`. What was missing was the checking: two allow lists that
would have blocked the next role, a boundary this task claims and nothing could
see, and properties for two modules that are total functions over a small space.
All three are now in place. `npm run properties` is 7 files / 67, up from 6 / 48.

**Review, in the order the brief sets.** UI/core separation: every input rule
lives in exactly one place. `grep` for `trim()`, `length === 0`, `=== 13` and
`.which` across `src/` outside the specs returns two lines, both in
`src/todo-input/`. No component re-decides anything the module owns, and no
module in `src/todo-input/` is reachable only from a test - all five exported
functions have a component caller. Dependency rule: no cycles, no violations,
and the acceptance step files decide nothing either - `todo-input-commits.ts`
applies `clearsField` exactly as `TodoTextInput` does and asserts values that
`src/` returned. Information hiding: `field.ts` and `effects.ts` are one subject
each and the cleaner was right not to split `effects.ts`, whose whole point is
that both answers to one question are visible in one file. I found nothing to
move.

**1. Both allow lists widened, and the reasons say why.** `properties/**` and
`hardening/**` now name `src/todo-input/*`. I needed the first for the property
file below, so the widening is not speculative in either case: the property
suite reaches the modules today and the hardener's mutation scan cannot start
without the second. Each reason names task 11 and what it added, in the practice
task 10 set - `rules.mjs`'s own doc says a list is widened in the same change as
the call and the reason carries the why, so that the graph and the claim never
drift apart.

**2. The "depends on nothing" rule is written, and it arrives with the test that
binds it.** `the todo input rules depend on nothing`, over `src/todo-input/**`,
excepting the specs, `allow: []`. Task 09's lesson is that a rule nobody
violates on purpose is indistinguishable from no rule, and this repository
already answered that objection rather than living with it:
`hardening/rules.hardening.test.ts` breaks every rule deliberately and its last
test asserts the table names every rule there is, so a rule cannot arrive
unproven. The cost of a new boundary here is four planted violations, and I paid
it. The rule refuses `react`, a component, the store and a domain type; it
refuses `src/todo-input/editing.ts`, a module the directory does not have yet,
so the rule is about the directory and not about two filenames; it is content
with the two modules as they stand; and it lets each spec import the module it
drives.

That fourth test earned its place immediately. My first draft excepted
`src/todo-input/**/*.spec.ts`, and it went red: `**` expands to `.*` between two
separators, so that pattern requires a subdirectory and does not match
`src/todo-input/field.spec.ts` sitting directly in the directory. It is the same
trap `rules.mjs`'s doc already records in its other shape - `a/**` matches what
is under `a` and not `a` itself. The except is now both patterns and the reason
says why. Had I written the rule without the test, the specs would have been
silently in violation of a rule the repository was passing.

**3. The boundary was re-checked with a tool that can see it, and the claim
holds.** `src/todo-input/field.ts` and `effects.ts` compile clean under
`types: []`, `typeRoots: []` and `lib: ["ES2022"]` - no ambient type package at
all, not merely no DOM lib. That is the distinction task 09 got wrong. I proved
the config can say no before trusting it that it said yes: `document` fails
TS2584, `KeyboardEvent` fails TS2304, and `fetch` and `Response` - the exact
names `@types/node` was supplying behind task 09's claim - fail TS2304. The
emitted `.d.ts` for both modules names nothing but `string`, `number`, `boolean`
and types declared in the same file.

It is now `src/todo-input/tsconfig.json`, a seventh project in
`scripts/typecheck.mjs`, so `npm run typecheck` and therefore CI check it. It is
the only project that covers no new file: the app project already compiles both
modules, and this one compiles them again with nothing around them.
`scripts/typecheck-gate.spec.mjs` asserts the exact project list, so dropping it
turns that test red. This and the boundary rule are two halves of one claim and
neither replaces the other - an import of React is caught by the rule, and a
bare `KeyboardEvent`, which needs no import at all, is caught only here.

Vite resolves the nearest `tsconfig.json` per file, so a config inside `src/`
can change how those files are transpiled. It does not: I hashed `dist/` before
adding it and after, and the bundle is byte-identical
(`5a06164fe810dd25fe2ad9331005cdb3` over the sorted file digests, both times).

**4. I did not revert the branch, and the property suite now says why it is
safe.** With `commitFromEditField` answering `closesEditor`, the component's job
is to perform that answer, not to second-guess it; `setEditing(!closesEditor)`
is the UI asking the domain and doing what it says, and `if (closesEditor)`
was the UI honouring the answer in one direction and ignoring it in the other.
The project manager's note is right that the two differ only in the unreachable
case, and the honest way to close that is to stop it being merely unreachable:
`the editor is closed whichever change it asked for` is now a property over
every id and every text. Plant `closesEditor: false` and it goes red. So the
component honours a flag, and the flag's value is stated where it can fail,
which is a better pair than a branch nothing can reach.

**5. Recorded for task 13, not acted on.** Task 10's architect logged eight
cases. Two of them were this task's and are closed: `TodoItem`'s "an edit to
empty text deletes the todo" and `Header`'s "an empty new todo is not added" are
both `src/todo-input/effects.ts` now, asked rather than computed, and the
asymmetry between them is the one thing that file exists to hold. The other six
stand, and one line number moved when the class became a function - the checkbox
that decides a click means "the other flag" is `src/components/TodoItem.tsx:47`
now, not `:54`. The rest are where task 10 left them:
`MainSection.tsx:17` and `:32`, `containers/MainSection.ts:9`,
`containers/FilterLink.ts:13`.

I found no new case. The conversion moved rules out of components; it put none
in. One thing that is not a task 13 case but belongs to task 12, which is the
task that touches how components are handed their props:
`TodoTextInput`'s public props carry `newTodo?: boolean` and `editing?: boolean`,
two booleans encoding the one thing the domain calls a `FieldKind`. `Header`
passes the first, `TodoItem` passes the second, and `editing === !newTodo` at
both call sites is held by convention alone. Collapsing them to `field:
FieldKind` would render byte-identical markup at both call sites and would let
the component stop deriving `field` from a boolean. I did not do it: it changes
a component's interface and its spec files, and the props also drive class
names, which this task puts out of scope.

**6. Properties, which were my bullet.** One new file,
`properties/todo-input.property.test.ts`, 19 properties, taking the suite from
6 files / 48 to 7 / 67. What it states that the tables cannot:

- The trim asymmetry as one equation rather than two examples. For every text,
  Enter and losing focus commit the same thing exactly when the text had no
  surrounding whitespace, and different things otherwise. A field that trimmed
  on blur would make them always agree, and that is the plausible wrong
  implementation the done criteria name.
- The negative universal about keys, twice: against near-misses picked to break
  a loose reading (`enter`, `ENTER`, `Enter `, `Return`, `NumpadEnter`, `\n`,
  `13`) and then against generated text, so the claim covers keys nobody listed.
- One question, two answers, as a biconditional: for every text, the new-todo
  field refuses it exactly when the edit field deletes on it. Trim in one caller
  and only that caller and the equivalence breaks while every example in both
  spec files still passes.
- What Enter commits, said three ways rather than as `held.trim()`: the commit
  is contained in the held text, it has no surrounding whitespace of its own,
  and it is the held text unchanged whenever there was none to remove. That
  refuses a stripping implementation as well as a trimming one.
- Idempotence: committing a commit again changes nothing.
- Conservation: opening a field and letting it lose focus round-trips the text
  character for character; the edit field commits untouched; both effects carry
  the text and the id through unchanged.
- Clearing turns on which field it is and on nothing else, including when the
  commit is empty.
- Emptiness is length and not blankness, over generated runs of every character
  `trim` removes.
- And the two modules composed, which no feature file can reach because
  `todo-input-commits` stops where `todo-input-effects` starts: an edit field
  holding nothing but whitespace is **deleted** when Enter commits it and
  **edited to those spaces** when focus moves away. Same field, same characters,
  two gestures, opposite outcomes. That is the project manager's sharp end,
  pinned as a property so a fix has to move it on purpose.

**The properties were shown to fail.** Eight wrong implementations planted one
at a time, each reverted with `git checkout` afterwards; the count is the
properties that went red.

| planted in place of the rule | red |
| --- | --- |
| `commitOnBlur` trims | 4 |
| Enter does not trim | 5 |
| the key test is case- and space-insensitive | 1 |
| the new-todo field clears only a non-empty commit | 2 |
| `openingText` trims | 2 |
| `isEmpty` trims, in both callers | 2 |
| `isEmpty` trims, in the new-todo caller only | 2 |
| `closesEditor: false` | 1 |

Every one is caught by the property that claims to catch it, and the
seventh - the one that breaks the asymmetry in one caller and leaves both spec
files green - is caught only by the biconditional.

**Verified**

`npm run lint`, `npm run format:check`, `npm run typecheck` (seven projects now,
0 errors), `npm test` 21 files / 193 tests, `npm run build`, `npm run acceptance`
9 files / 75 tests, `npm run properties` 7 files / 67 tests (was 6 / 48),
`npm run hardening` 7 files / 65 tests (was 7 / 61), `npm run test:e2e` 22
passed, `test:e2e:dev` and `test:e2e:preview` 21 passed / 1 skipped. `dist/`
byte-identical to the build before any of my changes. No dependency installed,
`package.json` and `package-lock.json` untouched, nothing committed and nothing
reset. The branch had moved again before I started - it is at `0267621`, the
cleaner's work committed, and the working tree was clean; I read that as the
cleaner's change and left it alone.

**Left for the next roles**

- Hardener: both allow lists are widened, so `src/todo-input/*` is importable
  from `hardening/` now and the scan can run. Three things this pass creates
  rather than inherits. `properties/todo-input.property.test.ts` kills the eight
  mutants in the table above, so a survivor scan should be read against that
  file as well as the specs - what it does not cover is anything the two modules
  do that no property names. `scripts/architecture/rules.mjs` has one more rule
  and `hardening/rules.hardening.test.ts` four more tests, and the same warning
  task 09's scan produced applies: rule *data* is not falsified by the tests
  that falsify the algorithm, so mutate the new rule's globs and patterns
  specifically. And `src/todo-input/tsconfig.json` is a gate whose failure mode
  is silent - delete its `types: []` and nothing goes red - which is worth one
  thought even though it is a config rather than a source.
- Hardener, still open from the cleaner and the project manager: the
  `key`-versus-`which` gap. I did not close it. It is a claim about what
  `TodoTextInput` reads out of a real event, which is a component-level claim,
  and nothing I added touches it - my properties drive the module, which has no
  DOM in its signature at all and therefore cannot tell you which field of an
  event the component chose to pass in.
- QA: no procedure changed, no user surface moved, and the bundle is byte-for-byte
  the one the cleaner left. All three E2E suites pass at the counts the coder and
  the cleaner recorded.

**Open questions**

None blocking. Two judgments recorded rather than guessed at: keeping
`setEditing(!closesEditor)` for the reason in 4, and adding a seventh typecheck
project rather than leaving the no-DOM claim in a handoff note, on the grounds
that this project has now twice found a claim that was false because nothing
could check it.

### Hardener

Mutation hardening of what this task created and changed. Two new source
modules mutated one at a time and both clean, one changed rule table mutated and
two of its four survivors killed, three feature files put through
`gherkin-mutator --level soft` after a baseline each, the routed
`key`-versus-`which` gap pinned and shown to fail, and one routed worry checked
and found not to be a worry. No `src/` module's behavior moved. Nothing under
`qa/` was touched and no authored line of any feature file was edited.

**The branch moved under me, and I left it alone**

The architect's note ends "my changes are in the working tree". They are not:
the branch is at `1143b7d`, "Enforce the input rules' isolation and prove the
properties fail", which is that work committed, and the working tree was clean
when I started. That is the fifth role in a row to report this, and the third on
this task. I read the commit as the architect's change and hardened it in place.
I committed nothing and reset nothing; my changes are in the working tree.

**Method, and the baseline read on every run**

*Language mutation.* Stryker 10.0.0 with the `command` runner,
`coverageAnalysis: "off"`, configuration, temp directory and JSON reports all
outside the repository. The net for a `src/todo-input/` module is everything
this project runs over one:

    npx vitest run --project unit --reporter=dot
      && npx vitest run --config vitest.properties.config.mts --reporter=dot
      && npx vitest run --config vitest.hardening.config.mts --reporter=dot

For `scripts/architecture/rules.mjs` the net is the two suites that read it:

    npx vitest run --project scripts --reporter=dot architecture/boundaries
      && npx vitest run --config vitest.hardening.config.mts --reporter=dot

The `scripts` project is narrowed to the boundaries spec for the reason task 10
recorded: `scripts/typecheck-gate.spec.mjs` asserts the compiler resolves to
`<repo>/node_modules/typescript/bin/tsc`, which is false inside a Stryker
sandbox, and the whole dry run goes red. "Initial test run succeeded" was read
on every run below.

**A first configuration produced a perfect score I did not believe, and the
fault was mine rather than the tool's.** The first `field.ts` run reported 21 of
21 - one killed and **twenty timed out**. Stryker counts a timeout as a kill, so
a misconfiguration read as a flawless result. The net takes about 14 seconds
unloaded and the default timeout is 5s plus 1.5x that, so four sandboxes running
it at once could not finish inside it. Concurrency 2 and `timeoutMS: 180000`
produced 21 real kills and no timeouts. Worth recording beside task 10's
sandbox failure, because the two fail in opposite directions: that one refused
to produce numbers at all, this one produced numbers that looked ideal. A score
made mostly of timeouts is not a score.

**Language mutation, one file at a time**

| module | mutants | killed | survived |
| --- | --- | --- | --- |
| `src/todo-input/field.ts` | 21 | 21 | 0 |
| `src/todo-input/effects.ts` | 16 | 16 | 0 |
| `scripts/architecture/rules.mjs` | 123 | 121 | 2 declared |

`rules.mjs` is the after figure; it was 119 killed and 4 survived, and the two
sections below say what closed the gap. The two `src/todo-input/` modules were
clean on the first run - the coder's specs, the architect's 19 properties and
the two feature families between them leave nothing. They were not re-run after
I added two unit tests, because the sources are byte-identical and a module
already at 21 of 21 and 16 of 16 has an empty set of mutants whose status could
move.

Not mutated, deliberately: the three components (my brief excludes components,
and the cleaner's scan already counted them - 16, 18 and 7), the four acceptance
step files (adapters, and what they are worth is measured from the other side by
the gherkin run below), and `src/todo-input/tsconfig.json`, which is config and
gets its own section.

**`scripts/architecture/rules.mjs`: the four survivors, two killed**

Every one was re-applied by hand before I acted on it.

*Killed - the glob-trap pair again, this time from the `except` side.* Blanking
the second pattern of
`except: ['src/todo-input/*.spec.ts', 'src/todo-input/**/*.spec.ts']` changed no
answer anywhere. That is the shape task 10 found eight times in the two rules it
added: the rule names both spellings of a path and the planted violations name
one, so exactly one of each pair is held. Here `**` stands for at least one
segment, so the second pattern covers only a spec sitting *under* a
subdirectory - and this directory has none, which is precisely why the architect
wrote it and precisely why nothing exercised it. Closed by naming a third
module, `src/todo-input/editing/rules.spec.ts`, in the same practice as the
architect's own "a module the directory does not have yet" test. Verified as a
kill: blanking the pattern now turns that test red.

*Killed - an allow entry with no caller.* `'src/todo-input/*'` in the hardening
suite's allow list could be blanked with the whole net green, because no file in
`hardening/` imports those modules. The architect widened the list so that this
pass could import what it was asked to break; the pass then found no survivor to
write such a file for, so the entry arrived without the call that `rules.mjs`'s
own doc asks to arrive with it. I kept it rather than narrowing it - the next
survivor in those modules should not also need a rule change - and pinned it
with a planted module, with a comment saying that the file named does not exist
and why the entry does. Verified: blanking the entry now turns that test red.

*Declared, twice, and both the same thing.* `allow: []` seeded with a junk
pattern survives, on the todo API rule (which task 10 already declared) and now
on the todo input rule. I re-checked the new one by hand rather than inheriting
the declaration, three ways:

| change to `allow: []` on *the todo input rules depend on nothing* | result |
| --- | --- |
| seeded with a pattern nothing imports | green everywhere - this is the survivor |
| the key deleted outright | 2 hardening tests red |
| seeded with a pattern something really imports (`'react'`) | 2 hardening tests red |

So the empty list is pinned against being removed and against gaining anything
real. What no finite test can see is an empty list against one holding a pattern
no module names, which is the same statement for both rules. Declared.

**Gherkin mutation, `--level soft`, per feature**

Baseline first, every run, and read: each feature parsed on its own with
`.aps/bin/gherkin-parser` into a scratch IR directory, generated on its own into
a scratch generated directory, and one job driven by hand through `node
scripts/acceptance/runner-worker.mjs` against the **unmutated** IR before any
mutation.

    baseline-todo-input-commits      test_success
    baseline-todo-input-effects      test_success
    baseline-todo-state-operations   test_success

Only then `gherkin-mutator`, with `-runner-worker "node
scripts/acceptance/runner-worker.mjs"` - the `node` command directly, never
through npm.

| feature | mutations | killed | survived |
| --- | --- | --- | --- |
| `todo-input-commits` | 16 | 12 | 4 declared |
| `todo-input-effects` | 2 | 1 | 1 declared |
| `todo-state-operations` | 23 | 17 | 6, all previously reported |

The other six feature files carry task 09's and task 10's manifests and nothing
this task did touches them, so they were not re-run. The mutator wrote its own
manifest block into all three files above and I hand-edited none of it; the
manifest and nothing else is what changed in those files.

*The four in `todo-input-commits` are both declared columns.* Scenario 4 row 2's
`committed`, and all three of scenario 6's `key` cells. The feature's own header
declares both: scenario 4's `committed` is input and expectation at once, and
scenario 6's two columns are free "unavoidably so", because the claim is a
negative universal about every key there is.

*The one in `todo-input-effects` is the declared column too*, scenario 3 row 2's
`text`, in the same practice.

*The six in `todo-state-operations` are all scenario 8, and all six are the six
task 10's hardener reported.* Five `error` cells, declared in the header, plus
the `operation` cell whose *payload* is free while its identity is not - the
header sentence that is slightly wider than the fact. Unchanged by this task and
still the specifier's line. **Scenario 9, which is what this task added there,
is 8 of 8 killed.**

**Two things about these kills that matter more than the counts**

Both are for the specifier and the next hardener rather than for me to fix.

1. *Several kills here are syntax kills rather than assertion kills.* Every text
   cell in the `todo-input-*` family is JSON, so a mutation landing on a quote -
   `"  Buy oats  " -> "  Buy oats  x` - makes the cell unparseable and the
   handler throws. That is what killed `todo-input-commits` scenario 4 row 1 and
   `todo-input-effects` scenario 3 row 1, while the row whose mutation stayed
   valid JSON survived in each. Read as a pair, both rows of both columns are
   free, which is exactly what the two headers already say. The counts above
   flatter those two columns; the declarations are the truth.
2. *Two columns that are declared free are in fact killed, and killed that same
   way.* `todo-input-commits` scenario 6's `kind` (all three cells) and
   `todo-state-operations` scenario 9's `flag` (both cells) die because the step
   vocabulary refuses `newxtodo` and `coMplete`, not because any assertion tells
   a new-todo field from an edit field or a marking-complete from a
   marking-active in those scenarios. The declarations are substantively right
   and the mutation numbers do not contradict them; they are wider than the fact
   in the same way task 10 recorded for scenario 8's `operation` column. One
   sentence per header would make all three read as declared rather than as
   gaps to whoever runs this next.

**The `key`-versus-`which` gap: reproduced, pinned, and the pin shown to fail**

This was the routed job, and it is closed.

*Where it went, and why not `hardening/`.* It is a claim about which field of a
real event a component reads, so only a rendered component can make it.
`hardening/**` runs in Node with no DOM, and `scripts/architecture/rules.mjs`
refuses `src/components/**` to that suite - with a test asserting the refusal,
which task 10's hardener added on purpose. Widening that to render a component
would contradict the rule's own stated reason, that a mutant killed by a
rendered component measures the component, and moving it is not a hardener's
line. The unit suite is the only suite in this repository allowed to render, so
that is where the two tests are, in `src/components/TodoTextInput.spec.tsx`.
**`npm test` therefore goes from 193 to 195**, which I am flagging rather than
assuming, in the practice task 10's note asks for.

*What they say, and why there are two.* `pressReturn` sends `key`, `code`,
`keyCode` and `which` together, which is what a real Enter carries, so every
other test in that file passes against a component reading any one of the four.
The two new ones use events a real keyboard never produces:

- a numpad Enter - `{ key: 'Enter', code: 'NumpadEnter' }`, carrying no legacy
  code at all - which must save;
- `{ key: 'a', code: 'KeyA', keyCode: 13, which: 13 }` - a key that is not Enter
  arriving with Enter's legacy code - which must not.

*Falsified rather than assumed.* Three wrong readings planted in
`src/components/TodoTextInput.tsx` in place of `e.key`, each with the unit suite
run and the source restored afterwards:

| planted reading | what went red |
| --- | --- |
| a `which`-derived key, which is the project manager's reproduction | both new tests, **and nothing else in the file** |
| `e.code` | the numpad test only |
| `e.key`, falling back to `which === 13` | the second test only |

Row 1 is the finding: the thirteen tests that were already there stay green
under it, which is why the gap existed at all. Rows 2 and 3 are why this is a
pair rather than one test - either test alone leaves one of the two wrong
readings alive, and a component that reads `code` renders the numpad Enter dead
in a real browser.

The helper is unchanged for its existing callers, per the ruling. It gains a
doc comment recording what it sends, that this is deliberately more than any
component needs so that pressing Enter is not also an assertion about the event,
and where the discriminating claim now lives - so that the next reader is told
rather than having to find it out with a mutation again.

**The architect's routed worry about `src/todo-input/tsconfig.json`: checked,
and there is nothing to close**

The note says that config is a gate whose failure mode is silent - "delete its
`types: []` and nothing goes red". It is not silent, and the reason is worth
having on the record. A probe project extending the real config and compiling
one file that names `Response` - the exact name `@types/node` was supplying
behind task 09's false claim - built and deleted outside the repository's
tracked tree:

| the config | compiling a file that names `Response` |
| --- | --- |
| as it stands | TS2304 Cannot find name 'Response' |
| `types: []` deleted | TS2304, unchanged |
| `typeRoots: []` deleted | TS2304, unchanged |
| both deleted | red anyway, and louder - `@types/react-dom` itself fails to compile without a DOM lib, inside `node_modules` |

The two keys are belt and braces: either one alone refuses the ambient packages,
so deleting one weakens nothing, and deleting both cannot pass quietly because
the type packages that come flooding in need the DOM lib this project
deliberately withholds. `KeyboardEvent` also still fails under the real config.
So there is no silent weakening to guard against and no test to write, and I did
not mutate the config - my brief excludes it.

**Mixed-job scan on what this task created**

Mutants counted with Stryker's instrumenter, not run.

| source | mutants | one job? |
| --- | --- | --- |
| `src/todo-input/field.ts` | 21 | yes |
| `src/todo-input/effects.ts` | 16 | yes |
| `src/components/TodoTextInput.tsx` | 16 | yes |
| `src/components/TodoItem.tsx` | 18 | yes |
| `src/components/Header.tsx` | 7 | yes |
| `scripts/architecture/rules.mjs` | 123 | yes |
| `scripts/typecheck.mjs` | 22 | yes |
| `acceptance/steps/todo-input-commits.ts` | 81 | yes |
| `acceptance/steps/todo-input-effects.ts` | 69 | yes |
| `acceptance/steps/cells.ts` | 25 | yes |

Nothing to split, and the counts say why rather than my judgment saying it.
`field.ts`'s 21 fall in three clusters - lines 34-38, 46-48, 55-57 - which are
`openingText`, `commitOnKey` and `commitOnBlur`; that is three functions and one
subject, and the thing the file exists to show is the difference between the
middle cluster and the last one. `effects.ts`'s 16 are two functions and the
`isEmpty` both of them call, which is the whole point of the file. `rules.mjs`'s
123 are almost exactly one per line across lines 43 to 169 with no cluster
anywhere, which is the signature of a data table rather than of two jobs, and
task 10 already split the deciding half out of it.

The hint has produced its finding on this task already: it was the cleaner's,
the 172-mutant step file in two neighbourhoods that became
`todo-input-commits.ts` and `todo-input-effects.ts`. Re-applying it over the
tree after that split finds nothing further, which is the outcome a split is
supposed to produce.

One judgment recorded rather than acted on. `properties/todo-input.property.test.ts`
is 205 mutants and is the only property file that drives two modules, where the
convention here is one per module. It is one job: its generators are shared, and
its last property composes `field` and `effects` into the statement no feature
file can reach - whitespace committed by Enter deletes the todo and the same
characters committed by losing focus save a blank row. Split it and that
property has no home. It is a test file rather than a source in any case.

**CRAP gate on changed files**

Coverage, unit suite over `src/`: 95.53% statements / 90% branches / 97.63%
functions, identical to the figure the cleaner left, because I changed no `src/`
module. Every file this task created or changed is at 100% on all four measures:
`src/todo-input/` and `src/components/` do not appear in the uncovered report at
all. The three files that do are the ones already routed - `src/index.tsx`, the
entry adapter; `src/containers/FilterLink.ts:21`, task 12; and
`src/selectors/index.ts:15-19`, task 13.

Complexity from ESLint's own rule as a gate:

    npx eslint . --rule '{"complexity":["error",{"max":10}]}'

Exit 0 across the repository. The highest anywhere is still `classifyRun` at 9;
the highest in anything this task touched is 5, in `acceptance/steps/todo-state.ts`
and pre-existing; `src/todo-input/` is 1 to 2, and both tests I added are 1. At
100% coverage CRAP is the complexity, so the worst of mine is 1 against a gate
of 10.

**DRY**

Nothing to change. My two additions to `hardening/rules.hardening.test.ts` are
modules added to tests that already existed, and the two new component tests
build two different events, which is the opposite of a duplication - one call
cannot pin which field is read, which is the whole finding. `keyCode` and
`which` now appear in exactly two places in the repository, the helper and the
test that exists to disagree with it.

Two duplications left alone deliberately, both for reasons this project has
already ruled on:

- `COMMIT_KEY = 'Enter'` is written in `src/todo-input/field.ts` and again in
  `properties/todo-input.property.test.ts`. Importing the module's constant
  would make the negative universal about keys a tautology, which is exactly
  the reason task 10 gave for leaving `absentFrom` mirroring `nextId`.
- the list of the two field kinds appears in `field.spec.ts`, in the property
  file and in `acceptance/steps/todo-input-commits.ts`. Three suites that may
  not import each other's helpers, which is the same call the cleaner and task
  10's hardener both made.

**Verified**

Every command run from the working tree as it stands, after `npm ci`, after the
last edit.

- `npm run lint` and `npm run format:check`: pass.
- `npm run typecheck`: 0 errors in seven projects.
- `npm test`: 21 files / **195 tests**. Was 193; two new tests in
  `src/components/TodoTextInput.spec.tsx` and the reason is in the section
  above. Nothing existing was changed, weakened or removed.
- `npm run build`: passes.
- `npm run properties`: 7 files / 67, unchanged.
- `npm run hardening`: 7 files / 65, unchanged - my two additions are modules
  inside existing tests, so the count does not move even though what those
  tests claim does.
- `npm run acceptance`: 9 files / 75, unchanged.
- `npm run test:e2e`: 22 passed. `test:e2e:dev` and `test:e2e:preview`: 21
  passed, 1 skipped each. No `qa/` file was read or edited.
- `@stryker-mutator/core@10` and `@vitest/coverage-v8@5` installed in **one**
  `npm install --no-save`, so neither pruned the other; finished with `npm ci`,
  and `node_modules/@stryker-mutator` is gone again. `package.json` md5
  `4fad73d5...` and `package-lock.json` md5 `29184ac9...` identical before and
  after. No Stryker configuration, temp directory or report was written inside
  the repository, and the gherkin IR, generated trees and work directories all
  went to a scratch directory outside it.

Branch `claude/react-modernization-plan-u7dgen` at `1143b7d`; nothing committed,
nothing reset. Working tree: modified `hardening/rules.hardening.test.ts`,
`src/components/TodoTextInput.spec.tsx`, `src/test-support/keyboard.ts`, and the
manifest block of `features/todo-input-commits.feature`,
`features/todo-input-effects.feature` and
`features/todo-state-operations.feature`. No new file.

**Left for QA**

1. The finding worth re-checking independently, and it takes two minutes:
   replace `e.key` with `e.which === 13 ? 'Enter' : String(e.which)` in
   `src/components/TodoTextInput.tsx` and run `npm test`. Two tests red now;
   check out the tree as the architect left it and the same change is green
   everywhere, `npm run test:e2e` included.
2. The two declared survivors, both `allow: []` seeded with a junk pattern in
   `scripts/architecture/rules.mjs`. The three-row table above is the whole
   argument and each row is a one-line edit.
3. Nothing under `qa/` changed and no user-visible surface moved. The bundle is
   the one the architect left; all three E2E suites pass at the recorded counts.
4. The three feature files differ from the architect's tree by their manifest
   block only. `git diff features/` should show nine added lines and one
   changed, all inside `acceptance-mutation-manifest` delimiters.

**Open questions for the project manager**

None blocking. Three recorded rather than guessed at.

1. **`npm test` moves from 193 to 195.** The two tests pin which field of a
   keyboard event `TodoTextInput` reads, and they are in the unit suite because
   the hardening suite may not render a component and I did not think a
   hardener should widen that rule to make room for itself. If you would rather
   this claim lived in `hardening/` with the rule widened and the suite given a
   DOM, say so and it is a small move; the reasoning against is in the section
   above.
2. **Three free-cell declarations are wider than the fact**, in the way task 10
   already reported for `todo-state-operations` scenario 8's `operation` column:
   `todo-input-commits` scenario 6's `kind` and `todo-state-operations` scenario
   9's `flag` are declared free but are killed by the step vocabulary refusing
   the mutated word, and the JSON text columns in both `todo-input-*` features
   are killed in one row and free in the other purely by where the mutation
   landed. Nothing is wrong in any of them; the headers are the specifier's
   lines and I did not touch them.
3. **The hardening suite's `src/todo-input/*` allow entry has no caller.** The
   architect widened the list for a hardening test that the clean mutation runs
   made unnecessary. I kept it and pinned it rather than narrowing it, because
   the alternative is that the next survivor found in those modules needs a rule
   change before it can be killed. Say if you would rather an allow entry never
   ran ahead of its call.

### QA

## Project manager notes

**On whether `Header`'s refusal belongs inside the new module: yes.** It is the
same kind of rule as `TodoItem` deleting on an empty commit — both answer "what
does an empty commit mean here", and they answer it differently. That is a
domain decision with two callers, not two accidents. Putting one in the module
and leaving the other in a component would hide exactly the asymmetry that makes
it worth extracting. The coder shapes the interface; the rule goes in.

**On what would have to move together if the trim asymmetry is ever fixed:
recorded, not scheduled.** Fixing it is a behavior change and this plan
preserves behavior. It is out of scope for the whole plan, not merely for this
task, so I am not adding a task for it.

What the specifier found sharpens the case for someone doing it later, and is
worth stating plainly: the asymmetry is not really about whitespace. An edit
field committed with **Enter** holding only spaces trims to `""` and **deletes
the todo**. The same field committed by **clicking away** saves three spaces,
leaving a row whose label renders blank. Same input, same field, two commit
gestures, and one of them destroys data while the other creates an invisible
row. Anyone fixing it must move the E2E procedures, the Gherkin and the unit
tests together, because all three currently pin it.

**On the `active` phrasing.** Taking the routed job was right, and so was
declining to add a step reading the outgoing request: `todo-api-requests 4`
already covers both flag values, and duplicating it here would break that
feature's stated charter. The real gain is the one the specifier names — a
comment in scenario 4 claimed an edit and a marking both replace the todo whole,
and only the edit was ever driven.

**On the two Context wording slips.** Both noted, neither substantive: the trim
happens before the key test rather than after, and the input seeds from
`props.text || ''` once and never re-reads the prop. That second one is the
reason `todo-input-commits 1` exists, and the coder should read it before
reaching for `useState(props.text)`.

## Project manager notes, second round

**On `e.which === 13` becoming `e.key === 'Enter'`: accepted, and worth stating
why it is not a behavior change.** The two are equivalent for the Enter key in
every browser this app targets, including the numpad Enter, and `which` has been
deprecated for years. The reason to prefer `key` here is not modernity: a module
that takes a DOM key code has a DOM detail in its signature, and this module's
whole point is having none. The Gherkin names keys by name, so the module and
the specification now agree on vocabulary.

The coder was right to flag it rather than bury it in a diff. It is the only
implementation detail that changed in a task whose contract is that none does.

**On `memo` for one component and not the other.** The reasoning is the kind I
want: `TodoItem`'s props really are shallow-stable, so the `PureComponent` it
replaced was skipping rows and `memo` preserves that. `TodoTextInput` receives a
fresh `onSave` closure every render, so its comparison could never succeed and
`memo` there would be theatre. A reflexive `memo` on both would have looked more
consistent and been worse.

**Task 05's class-field question is retired.** Confirmed at the bundle: the old
one carried `class extends x.PureComponent{state={…};handleSubmit=e=>{…}}` and
the new one has neither. The only `PureComponent` left in `src/` is two comments
explaining why `memo` is on one component and not the other, and the only class
declarations left in the bundle belong to dependencies compiled by their own
builds.

**Routed onward, all recorded by the coder rather than done in passing:**
`wholeNumber` is now copied across three step files, which is the cleaner's call;
`properties/**` and `hardening/**` allow lists lack `src/todo-input/*` and the
hardener needs that widened before it can scan the new modules; and a
`src/todo-input/**` "depends on nothing" boundary rule is supportable but is the
architect's line to write.

## Project manager notes, third round

**The `key`-versus-`which` gap is real, and wider than the cleaner reported.**
It noted that the test-support keyboard helper sends `key`, `code`, `keyCode`
and `which` together, so the unit suite cannot tell which one a component reads.
I checked, and the E2E suite cannot either: I replaced `e.key` with a
`which`-derived value in `TodoTextInput` and **both `npm test` and
`npm run test:e2e` stayed green**.

For E2E that is inherent rather than a defect — a real browser sets both, so no
UI-level test could ever separate them. For the unit suite it is a helper that
is more generous than any real event. The consequence: the one implementation
detail this task changed is pinned by nothing at all. It is still correct, since
the two are equivalent for Enter, but nothing would catch a change back or
sideways.

**Hardener: this is yours.** The cleaner already flagged it to you and I am
confirming it with a reproduction. The fix is not to weaken the helper for its
existing callers; it is to pin what the component reads, which is a claim no
current suite makes.

**On the removed unreachable branch.** Accepted, with one thing on the record
that the cleaner's note implies but does not say. `if (closesEditor)
setEditing(false)` and `setEditing(!closesEditor)` are identical while
`commitFromEditField` always answers `true`, which it does. They differ in the
unreachable case: the old form ignores a `false`, the new one honours it by
reopening the editor. Honouring the flag is the better of the two, and the
branch was the only uncovered one in `src/components/`. The architect may revert
it in one line if it disagrees.

**On sharing `wholeNumber` across the step families.** The right call, and the
reasoning is what makes it safe rather than the outcome. Task 10's cleaner
declined a similar DRY, and this one did not overrule that: it distinguished the
cases. The three *flag* parsers differ because the features differ, so unifying
them would erase a real distinction. `wholeNumber` is three independent
authorings of the same line because "this cell is a whole number" is a question
about how feature files spell a number, not about what any family means. The new
module's doc names the flag parsers as what must not follow it in, which is the
part that keeps the distinction alive after everyone forgets.

**The mixed-job hint has now paid off four times**, on task 09's boundary rules,
task 10's two-slice reducer file, task 10's `errorMessage`, and this task's step
file at 172 mutants in two neighbourhoods. It has produced a real finding every
time it has been applied on this project.

## Project manager notes, fourth round

**The no-React/no-DOM boundary is genuinely enforced now, and I verified the
case that failed before.** Planting `document` in `field.ts` fails the typecheck,
and so does planting `fetch` — which is precisely the name `@types/node` was
supplying behind task 09's false claim, where a DOM-free tsconfig caught only
DOM-*only* names. The difference is `types: []` **and** `typeRoots: []` rather
than merely omitting the DOM lib. The architect ran the negative controls before
the positive one, which is why this claim is worth more than the earlier one.

**The new rule catching a bug in its own first draft is the best vindication of
task 09's lesson so far.** `**` expands between two separators, so
`src/todo-input/**/*.spec.ts` requires a subdirectory and misses
`src/todo-input/field.spec.ts`. Written without its binding test, the specs
would have sat in silent violation of a rule that passed. That is the same
failure task 09 found by emptying `BOUNDARY_RULES` and watching `npm test` stay
green — a rule nobody violates on purpose is indistinguishable from no rule —
and here it was caught during authoring rather than three tasks later.

**On keeping `setEditing(!closesEditor)` and then retiring the question.**
Better than either accepting or reverting: the component now performs the
domain's answer rather than honouring it in one direction, and a property pins
`closesEditor === true` over every id and text, so the case is no longer merely
unreachable — it is asserted unreachable. An unreachable branch that nothing
pins is a latent behavior; an unreachable branch a property holds shut is a
decision.

**Recorded for task 12, not acted on.** `TodoTextInput`'s props carry two
booleans, `newTodo` and `editing`, encoding one `FieldKind`, with
`editing === !newTodo` held by convention alone. That is a component-interface
question and task 12 rewrites how these components get their props.

**Recorded for task 13.** Two of task 10's eight re-derivation cases are closed
by this task, both now in `effects.ts`; one moved line; the other five stand. No
new cases found.

## Project manager notes, fifth round

**A seventh false green, and this one is in the mutation tooling.** The first
`field.ts` run reported a perfect score made of **twenty timeouts**: four
sandboxes running a 14-second net against a ~26s default, and Stryker counts a
timeout as a kill. So a misconfigured run reads as flawless. Concurrency 2 plus
a 180s timeout produced 21 real kills.

Worth stating in general terms, because this project keeps meeting it in new
disguises. Every false green so far has been a measurement reporting success for
work it never did: a typecheck that never ran, a runner that found no tests, a
rule nothing violates, a suite whose net was too generous, and now a mutant that
timed out. The shape is always "absence of evidence recorded as evidence of
absence". The defence is always the same: prove the instrument can report
failure, in the exact configuration you are about to trust.

This is also the opposite direction from task 10's flake, where a sandbox
occasionally ran *without* the active mutant and could only invent survivors.
That one is loud, since a survivor demands investigation. This one is silent.

**The `key`-versus-`which` gap is closed, verified.** I planted the same
`which`-derived reading that passed both suites before: `npm test` now reports
2 failed of 195, and only those two. The tests use events a real keyboard never
produces — a numpad Enter with no legacy code, and `key: 'a'` carrying
`which: 13` — which is the only way to separate readings that a real browser
always sets together. Falsified three ways rather than one.

**On those tests living in the unit suite rather than in hardening.** Correct.
The hardening suite has no DOM and is refused `src/components/**` by a rule that
has its own test; widening that to place two tests is not a hardener's line, and
proposing it rather than doing it was right. `npm test` moving 193 to 195 is
fine on the standing reading: the pin is that acceptance and property tests stay
out of that count, not that the number holds.

**On the architect's routed tsconfig worry: it does not exist, and that is a
finding too.** Deleting `types: []` alone changes nothing because `typeRoots: []`
still blocks; deleting `typeRoots: []` alone changes nothing; deleting both
turns the typecheck red inside `@types/react-dom`. No silent weakening and no
test needed. Checking a worry and reporting its absence is as useful as
confirming it, and cheaper than carrying it forward.

**The mixed-job hint reports nothing further on this task**, and said so with
per-line distributions rather than judgment. Its finding here was the cleaner's
172-mutant step-file split. Four for four still stands.
