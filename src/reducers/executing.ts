import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'

// Nothing in the UI reads this; features/todo-state-operations.feature is what holds it.

export interface Executing {
  isLoadingAll: boolean
  isAdding: boolean
  /** Keyed by todo id as a string. */
  t: Record<string, { isUpdating: boolean }>
}

const initialState: Executing = {
  isLoadingAll: false,
  isAdding: false,
  t: {},
}

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
