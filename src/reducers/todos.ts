import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'
import { Todo } from '../models/Todo'

/**
 * The todo list. Two families of change reach it and they answer different
 * questions: a local edit decides the whole change itself, and a settled
 * backend operation writes down what the backend said.
 *
 * Four of the local edits - add, delete, edit and mark - have no caller today,
 * because `src/actions/index.ts` maps those names to the backend operations.
 * They are behavior this project carries, they are specified in
 * `features/todo-state-edits.feature`, and scenarios 2 and 3 there are the only
 * place an id is ever allocated. Do not read them as dead code.
 *
 * Nothing here is optimistic: an operation moves the list when it settles and
 * not before.
 */

const initialState: Todo[] = [
  {
    text: 'Use Redux',
    completed: false,
    id: 0,
  },
]

const nextId = (todos: Todo[]) =>
  todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1

/**
 * "The todo with this id" is the question both families ask, and these are the
 * three answers to it: change that todo, put another one in its place, drop it.
 */
const changing = (todos: Todo[], id: number, change: (todo: Todo) => Todo) =>
  todos.map((todo) => (todo.id === id ? change(todo) : todo))

const replacing = (todos: Todo[], id: number, replacement: Todo) =>
  changing(todos, id, () => replacement)

const without = (todos: Todo[], id: number) =>
  todos.filter((todo) => todo.id !== id)

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    addTodo: (state, { payload: text }: PayloadAction<string>) => [
      ...state,
      { id: nextId(state), completed: false, text },
    ],

    deleteTodo: (state, { payload: id }: PayloadAction<number>) =>
      without(state, id),

    editTodo: {
      reducer: (
        state,
        { payload }: PayloadAction<{ id: number; text: string }>,
      ) =>
        changing(state, payload.id, (todo) => ({
          ...todo,
          text: payload.text,
        })),
      prepare: (id: number, text: string) => ({ payload: { id, text } }),
    },

    completeTodo: {
      reducer: (
        state,
        { payload }: PayloadAction<{ id: number; completed: boolean }>,
      ) =>
        changing(state, payload.id, (todo) => ({
          ...todo,
          completed: payload.completed,
        })),
      prepare: (id: number, completed: boolean) => ({
        payload: { id, completed },
      }),
    },

    completeAllTodos: (state) => {
      const areAllMarked = state.every((todo) => todo.completed)
      return state.map((todo) => ({ ...todo, completed: !areAllMarked }))
    },

    clearCompleted: (state) => state.filter((todo) => todo.completed === false),
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTodosOperation.fulfilled, (_state, action) => action.payload)
      .addCase(addTodoOperation.fulfilled, (state, action) => [
        ...state,
        action.payload,
      ])
      .addCase(editTodoOperation.fulfilled, (state, action) =>
        replacing(state, action.meta.arg.id, action.payload),
      )
      .addCase(completeTodoOperation.fulfilled, (state, action) =>
        replacing(state, action.meta.arg.id, action.payload),
      )
      .addCase(removeTodoOperation.fulfilled, (state, action) =>
        without(state, action.meta.arg.id),
      )
  },
})

export const todoActions = todosSlice.actions

export default todosSlice.reducer
