# Task 05: Convert class components to function components

Status: pending

## Goal

Every component in `src/components/` is a function component. `prop-types` is gone from the project; TypeScript prop interfaces are the only prop contract.

## Scope

- Convert `TodoItem` from `PureComponent` to a function component: its `editing` state becomes `useState`, its handlers become plain functions or `useCallback` where memoization is actually needed, and its `PureComponent` identity becomes `React.memo` only if a measured or reasoned need exists (say which in the handoff note).
- Convert `TodoTextInput` the same way. Note that its `state = { text: this.props.text || '' }` initializes from props exactly once; the function version must preserve that behavior, including what happens when `text` changes after mount.
- Remove the `static propTypes` blocks from `TodoItem`, `TodoTextInput`, and `Footer`, and remove `prop-types` from `package.json`.
- Keep the `autoFocus`, blur, and Enter-key behavior of `TodoTextInput` identical, including that blur saves only when `newTodo` is false and Enter clears the field only when `newTodo` is true.

## Out of scope

- Changing rendered markup, class names, or user-observable behavior.
- Extracting shared hooks between the two components unless the cleaner finds genuine duplication.
- Redux changes. Task 04 already settled how these components get their props.
- Routing, RTK slices, deployment.

## Done criteria

1. No `class` component and no `prop-types` import remains under `src/`.
2. `prop-types` is absent from `package.json` and the lockfile.
3. `npm test`, `npm run test:acceptance`, `npm run test:property`, and `npm run build` pass.
4. TypeScript compiles with no errors.
5. The E2E QA procedures pass when QA executes them, including the edit-in-place workflow (double-click to edit, blur to save, Enter to save, empty text to delete).

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
