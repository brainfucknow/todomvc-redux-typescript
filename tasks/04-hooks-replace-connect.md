# Task 04: Replace connect() containers with hooks

Status: pending

## Goal

Components read state with `useSelector` and dispatch with `useDispatch`. The `src/containers/` directory is gone. `RootState` is derived from the actual root reducer instead of being hand-declared and wrong.

## Scope

- Replace the four `connect()` containers (`FilterLink`, `Header`, `MainSection`, `VisibleTodoList`) with hook usage in the components they wrapped.
- Introduce typed `useAppSelector` and `useAppDispatch` hooks bound to the real store types.
- Derive `RootState` and `AppDispatch` from the configured store / root reducer. The hand-written `RootState` in `src/containers/index.ts` omits the `errorMessage` and `exec` slices that `reducers/index.ts` actually combines; the derived type must include them.
- Fix `errorMessage` in `src/reducers/apis.ts`: its state parameter infers as `null` from its default
  value, so the reducer cannot be handed back a message it previously stored. Deriving `RootState`
  from the real root reducer inherits this defect into the derived type, which is why it lands here.
- Remove `bindActionCreators` plumbing and the `actions: any` prop on `TodoList` in favor of components dispatching what they need.
- Move the store construction out of `src/index.tsx` into its own module so tests and the typed hooks can import the store's types without importing the app entry.

## Out of scope

- Changing rendered output or user-observable behavior. Same UI, same dispatched actions, same API calls.
- Converting reducers to `createSlice` or actions to `createAsyncThunk`. Settled out of scope in `PLAN.md` section 3.
- Converting class components. Task 05.
- Changing selector logic in `src/selectors/index.ts` beyond the type of the state it accepts.
- Routing.

## Done criteria

1. `src/containers/` no longer exists and `connect` is imported nowhere.
2. `RootState` is derived from the root reducer and includes every combined slice.
3. `npm test`, `npm run test:acceptance`, `npm run test:property`, and `npm run build` pass.
4. TypeScript compiles with no errors and no `any` remains on the props that carried `actions`.
5. The E2E QA procedures pass when QA executes them.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
