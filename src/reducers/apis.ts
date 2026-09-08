import {
  createSlice,
  isAnyOf,
  isRejected,
  type SerializedError,
} from '@reduxjs/toolkit'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'

/**
 * What the app knows about backend operations it has started: which are still
 * running, and the last one that failed.
 *
 * Nothing in the UI reads either. They are state the app computes and keeps,
 * and `features/todo-state-operations.feature` and
 * `features/todo-state-failures.feature` specify them; surfacing them to a user
 * would be new behavior and is not this project's plan.
 */

export interface Executing {
  isLoadingAll: boolean
  isAdding: boolean
  /** Per todo id, as a string, whether an update of that todo is running. */
  t: Record<string, { isUpdating: boolean }>
}

const updating = (state: Executing, id: number, isUpdating: boolean) => ({
  ...state,
  t: { ...state.t, [id.toString()]: { isUpdating } },
})

const startedUpdate = isAnyOf(
  editTodoOperation.pending,
  completeTodoOperation.pending,
  removeTodoOperation.pending,
)

const settledUpdate = isAnyOf(
  editTodoOperation.fulfilled,
  editTodoOperation.rejected,
  completeTodoOperation.fulfilled,
  completeTodoOperation.rejected,
  removeTodoOperation.fulfilled,
  removeTodoOperation.rejected,
)

const executingSlice = createSlice({
  name: 'executing',
  initialState: { isLoadingAll: false, t: {}, isAdding: false } as Executing,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTodosOperation.pending, (state) => ({
        ...state,
        isLoadingAll: true,
      }))
      .addCase(addTodoOperation.pending, (state) => ({
        ...state,
        isAdding: true,
      }))
      .addMatcher(
        isAnyOf(loadTodosOperation.fulfilled, loadTodosOperation.rejected),
        (state) => ({
          ...state,
          isLoadingAll: false,
        }),
      )
      .addMatcher(
        isAnyOf(addTodoOperation.fulfilled, addTodoOperation.rejected),
        (state) => ({ ...state, isAdding: false }),
      )
      .addMatcher(startedUpdate, (state, action) =>
        updating(state, action.meta.arg.id, true),
      )
      .addMatcher(settledUpdate, (state, action) =>
        updating(state, action.meta.arg.id, false),
      )
  },
})

const errorMessageSlice = createSlice({
  name: 'errorMessage',
  initialState: null as SerializedError | null,
  reducers: {
    /**
     * Nothing asks. The branch is live and callerless, as it was before this
     * task, and `features/todo-state-failures.feature` 4 is what holds it.
     */
    resetErrorMessage: () => null,
  },
  extraReducers: (builder) => {
    builder.addMatcher(isRejected, (_state, action) => action.error)
  },
})

export const errorActions = errorMessageSlice.actions

export const executing = executingSlice.reducer
export const errorMessage = errorMessageSlice.reducer
