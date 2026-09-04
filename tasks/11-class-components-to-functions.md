# Task 11: Convert class components to functions and extract their input rules

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task creates a testable module for the text-input rules.

**Status:** pending

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

### Coder

### Cleaner

### Architect

### Hardener

### QA
