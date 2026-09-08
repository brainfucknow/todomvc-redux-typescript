import { createAsyncThunk } from '@reduxjs/toolkit'
import {
  addTodoCall,
  completeTodoCall,
  editTodoCall,
  executeCall,
  loadTodosCall,
  removeTodoCall,
  type SendRequest,
  type TodoApiCall,
  type TodoApiOutcome,
} from '../todo-api/client'
import { Todo } from '../models/Todo'

/**
 * The five todo backend operations as async thunks. This is the seam between
 * Redux and the todo API client: it runs the call the operation stands for,
 * turns the outcome the client reports into a settled thunk, and does the one
 * thing the client must not do itself - write a failure to the console.
 *
 * It performs no request. The transport is the store's extra argument, so a
 * caller that has no network - a spec, the acceptance suite - supplies its own
 * `SendRequest` and nothing here changes.
 *
 * Each thunk's argument is the operation's own fields, the same record the
 * client puts on every outcome, so a reducer reads `action.meta.arg.id` for
 * whichever operation reported. The exported wrappers below are the shapes the
 * UI calls, because a thunk takes one argument and an edit has two.
 */

export interface TodoApiExtra {
  send: SendRequest
}

const createTodoThunk = createAsyncThunk.withTypes<{ extra: TodoApiExtra }>()

/**
 * Runs one call and reports it the way a thunk settles: the parsed body on a
 * success, a throw on a failure. `executeCall` reports a failure rather than
 * throwing it, so the throw is made here - and the failure is logged first,
 * which is what the middleware this replaced did in the same order.
 *
 * The cast is this seam's own: the client answers `unknown` because what a
 * backend sends is not its question, and the store has always taken the answer
 * at its word.
 */
async function runCall<T>(call: TodoApiCall, send: SendRequest): Promise<T> {
  const reported: TodoApiOutcome[] = []

  await executeCall(call, send, (outcome) => reported.push(outcome))

  const settled = reported[reported.length - 1]
  if (settled.kind === 'failed') {
    console.error(settled.carried['error'])
    throw settled.carried['error']
  }
  return settled.carried['json'] as T
}

/** What each thunk is asked for: the operation's own fields, and nothing else. */
interface TodoText {
  text: string
}
interface TodoId {
  id: number
}
type TodoEdit = TodoId & TodoText
type TodoMarking = TodoId & { completed: boolean }

export const loadTodosOperation = createTodoThunk<Todo[], void>(
  'todos/load',
  (_argument, { extra }) => runCall(loadTodosCall(), extra.send),
)

export const addTodoOperation = createTodoThunk<Todo, TodoText>(
  'todos/add',
  ({ text }, { extra }) => runCall(addTodoCall(text), extra.send),
)

export const editTodoOperation = createTodoThunk<Todo, TodoEdit>(
  'todos/edit',
  ({ id, text }, { extra }) => runCall(editTodoCall(id, text), extra.send),
)

export const completeTodoOperation = createTodoThunk<Todo, TodoMarking>(
  'todos/mark',
  ({ id, completed }, { extra }) =>
    runCall(completeTodoCall(id, completed), extra.send),
)

export const removeTodoOperation = createTodoThunk<void, TodoId>(
  'todos/remove',
  ({ id }, { extra }) => runCall(removeTodoCall(id), extra.send),
)

/**
 * What the UI calls. Each one is a plain function of the arguments the app has
 * at the call site, because a thunk takes one argument and an edit has two -
 * and because an action creator handed straight to an `onClick` would take the
 * DOM event as its payload.
 */
export const loadTodos = () => loadTodosOperation()
export const addTodo = (text: string) => addTodoOperation({ text })
export const editTodo = (id: number, text: string) =>
  editTodoOperation({ id, text })
export const completeTodo = (id: number, completed: boolean) =>
  completeTodoOperation({ id, completed })
export const removeTodo = (id: number) => removeTodoOperation({ id })
