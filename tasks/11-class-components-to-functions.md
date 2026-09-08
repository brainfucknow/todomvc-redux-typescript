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

### Hardener

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
