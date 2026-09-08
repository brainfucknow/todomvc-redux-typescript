import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'

/**
 * Which backend operations the app has started and not yet seen settle.
 *
 * Nothing in the UI reads it. It is state the app computes and keeps, and
 * `features/todo-state-operations.feature` specifies it; surfacing it to a user
 * would be new behavior and is not this project's plan.
 *
 * It is stored under the `exec` key, which is the name it had before there were
 * slices.
 */

export interface Executing {
  isLoadingAll: boolean
  isAdding: boolean
  /** Per todo id, as a string, whether an update of that todo is running. */
  t: Record<string, { isUpdating: boolean }>
}

const initialState: Executing = {
  isLoadingAll: false,
  isAdding: false,
  t: {},
}

/** An operation settles when it is fulfilled and when it is rejected alike. */
const settled = <Fulfilled, Rejected>(operation: {
  fulfilled: Fulfilled
  rejected: Rejected
}) => [operation.fulfilled, operation.rejected] as const

const running =
  (operation: 'isLoadingAll' | 'isAdding', isRunning: boolean) =>
  (state: Executing): Executing => ({ ...state, [operation]: isRunning })

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
  ...settled(editTodoOperation),
  ...settled(completeTodoOperation),
  ...settled(removeTodoOperation),
)

const executingSlice = createSlice({
  name: 'executing',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTodosOperation.pending, running('isLoadingAll', true))
      .addCase(addTodoOperation.pending, running('isAdding', true))
      .addMatcher(
        isAnyOf(...settled(loadTodosOperation)),
        running('isLoadingAll', false),
      )
      .addMatcher(
        isAnyOf(...settled(addTodoOperation)),
        running('isAdding', false),
      )
      .addMatcher(startedUpdate, (state, action) =>
        updating(state, action.meta.arg.id, true),
      )
      .addMatcher(settledUpdate, (state, action) =>
        updating(state, action.meta.arg.id, false),
      )
  },
})

export const executing = executingSlice.reducer
