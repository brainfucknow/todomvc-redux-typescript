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

### Cleaner

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
