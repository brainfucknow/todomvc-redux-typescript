import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'
import { Todo } from '../models/Todo'

// `addTodo`, `deleteTodo`, `editTodo` and `completeTodo` have no caller - src/actions/index.ts
// maps those names to the backend operations - but features/todo-state-edits.feature holds
// them, and its id allocation lives nowhere else. Not dead code.

const initialState: Todo[] = [
  {
    text: 'Use Redux',
    completed: false,
    id: 0,
  },
]

const nextId = (todos: Todo[]) =>
  todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1

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
