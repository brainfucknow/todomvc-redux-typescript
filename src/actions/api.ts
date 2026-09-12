import {
  createAsyncThunk,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit'
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

// The seam between Redux and the todo API client, and the one place a failure is
// logged - the client must not touch the console itself.

export interface TodoApiExtra {
  send: SendRequest
}

const createTodoThunk = createAsyncThunk.withTypes<{ extra: TodoApiExtra }>()

// `executeCall` reports a failure rather than throwing it, so the throw is made here.
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

// Written out rather than named as `AsyncThunk`, whose configuration cannot be
// restated here without losing what the five operations return.
type Started = Promise<UnknownAction> & { requestId: string }

interface Operation<Argument> {
  (
    argument: Argument,
  ): ThunkAction<Started, unknown, TodoApiExtra, UnknownAction>
  rejected: (
    error: Error | null,
    requestId: string,
    argument: Argument,
  ) => UnknownAction
}

// Redux Toolkit dispatches a settled action outside the catch it gives a payload
// creator, so a reducer that throws would otherwise leave the operation running for
// good: catch it here and report it as that operation's own `rejected`.
const recording =
  <Argument>(
    operation: Operation<Argument>,
    argument: Argument,
  ): ThunkAction<
    Promise<UnknownAction>,
    unknown,
    TodoApiExtra,
    UnknownAction
  > =>
  async (dispatch) => {
    const started = dispatch(operation(argument))
    try {
      return await started
    } catch (thrown) {
      console.error(thrown)
      return dispatch(
        operation.rejected(thrown as Error, started.requestId, argument),
      )
    }
  }

// Plain functions rather than the creators themselves: one handed straight to an
// `onClick` would take the DOM event as its payload.
export const loadTodos = () => recording(loadTodosOperation, undefined)
export const addTodo = (text: string) => recording(addTodoOperation, { text })
export const editTodo = (id: number, text: string) =>
  recording(editTodoOperation, { id, text })
export const completeTodo = (id: number, completed: boolean) =>
  recording(completeTodoOperation, { id, completed })
export const removeTodo = (id: number) => recording(removeTodoOperation, { id })
