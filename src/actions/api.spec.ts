import type { UnknownAction } from '@reduxjs/toolkit'
import {
  addTodo,
  completeTodo,
  loadTodos,
  removeTodo,
  type TodoApiExtra,
} from './api'
import { createTodoStore } from '../store'
import type { SendRequest } from '../todo-api/client'

/**
 * The boundary the todo API client sits behind: what reaches Redux, in what
 * order, and what the app is left holding when a call never completes. What
 * each call sends and what it makes of an answer is
 * `src/todo-api/client.spec.ts`; this file pins only what is the boundary's
 * own.
 *
 * A thunk is run here the way the store runs it - given a dispatch, a getState
 * and the extra argument - so nothing is stubbed but the transport.
 */

/**
 * A thunk as the store calls it. The five operations have five action types
 * and no common one, so the thing under test is taken as `unknown` and read as
 * this once, here, rather than cast at every call.
 */
type Thunk = (
  dispatch: (action: UnknownAction) => unknown,
  getState: () => unknown,
  extra: TodoApiExtra,
) => Promise<UnknownAction>

const answering =
  (body: string): SendRequest =>
  (_request, readResponseBody) =>
    Promise.resolve({ status: 200, ...(readResponseBody ? { body } : {}) })

const failingWith =
  (error: unknown): SendRequest =>
  () =>
    Promise.reject(error)

/**
 * `api.ts` writes a failure to the console before it dispatches one. Every test
 * below that fails a call says so here, so a passing run prints nothing.
 */
const silenced = () => vi.spyOn(console, 'error').mockImplementation(() => {})

/**
 * The store as an operation meets it: a dispatch that runs a thunk and hands a
 * plain action to `reducers`, which is where a reducer's throw comes from.
 */
const run = async (
  operation: unknown,
  send: SendRequest,
  order: string[] = [],
  reducers: (action: UnknownAction) => void = () => {},
) => {
  const dispatched: UnknownAction[] = []
  const extra: TodoApiExtra = { send }
  const dispatch = (action: unknown): unknown => {
    if (typeof action === 'function') {
      return (action as Thunk)(dispatch, () => ({}), extra)
    }
    order.push('dispatch')
    dispatched.push(action as UnknownAction)
    reducers(action as UnknownAction)
    return action
  }

  const resolved = (await dispatch(operation)) as UnknownAction
  return { dispatched, resolved }
}

/** Reducers that throw on one action, the way a null in the list makes them. */
const throwingOn =
  (type: string, error: unknown) => (action: UnknownAction) => {
    if (action.type === type) throw error
  }

const typesOf = (dispatched: UnknownAction[]) =>
  dispatched.map((action) => action.type)

describe('the todo backend operations', () => {
  it('starts an operation before the request goes out and settles it after', async () => {
    const { dispatched } = await run(
      addTodo('Buy milk'),
      answering('{"id":7,"text":"Buy milk","completed":false}'),
    )

    expect(typesOf(dispatched)).toStrictEqual([
      'todos/add/pending',
      'todos/add/fulfilled',
    ])
    expect(dispatched[1].payload).toStrictEqual({
      id: 7,
      text: 'Buy milk',
      completed: false,
    })
    expect(dispatched[1].meta).toMatchObject({ arg: { text: 'Buy milk' } })
  })

  it('carries no parsed body on a success that read nothing', async () => {
    const { dispatched } = await run(removeTodo(1), answering('{"id":1}'))

    expect(typesOf(dispatched)).toStrictEqual([
      'todos/remove/pending',
      'todos/remove/fulfilled',
    ])
    expect(dispatched[1].payload).toBeUndefined()
    expect(dispatched[1].meta).toMatchObject({ arg: { id: 1 } })
  })

  it('logs the error before dispatching the failure, as the middleware did', async () => {
    const error = new Error('Failed to fetch')
    const order: string[] = []
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {
      order.push('log')
    })

    const { dispatched } = await run(loadTodos(), failingWith(error), order)

    expect(logged).toHaveBeenCalledWith(error)
    expect(order).toStrictEqual(['dispatch', 'log', 'dispatch'])
    expect(typesOf(dispatched)).toStrictEqual([
      'todos/load/pending',
      'todos/load/rejected',
    ])
    logged.mockRestore()
  })

  it('records a failure as a serialized error that keeps the message', async () => {
    const logged = silenced()

    const { dispatched } = await run(
      loadTodos(),
      failingWith(new Error('Failed to fetch')),
    )

    const failure = dispatched[1] as UnknownAction & { error: unknown }
    expect(failure.error).not.toBeInstanceOf(Error)
    expect(failure.error).toMatchObject({
      name: 'Error',
      message: 'Failed to fetch',
    })
    logged.mockRestore()
  })

  it('resolves with the action it settled on rather than throwing', async () => {
    const logged = silenced()

    const { resolved } = await run(
      loadTodos(),
      failingWith(new Error('Failed to fetch')),
    )

    expect(resolved.type).toBe('todos/load/rejected')
    logged.mockRestore()
  })

  it('resolves with the fulfilled action when the call succeeds', async () => {
    const { resolved } = await run(loadTodos(), answering('[{"id":1}]'))

    expect(resolved.type).toBe('todos/load/fulfilled')
    expect(resolved.payload).toStrictEqual([{ id: 1 }])
  })

  it('records a reducer that throws on a settled operation, as the middleware did', async () => {
    const thrown = new TypeError(
      "Cannot read properties of null (reading 'id')",
    )
    const order: string[] = []
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {
      order.push('log')
    })

    const { dispatched, resolved } = await run(
      addTodo('Ship it'),
      answering('null'),
      order,
      throwingOn('todos/add/fulfilled', thrown),
    )

    expect(logged).toHaveBeenCalledWith(thrown)
    expect(order).toStrictEqual(['dispatch', 'dispatch', 'log', 'dispatch'])
    expect(typesOf(dispatched)).toStrictEqual([
      'todos/add/pending',
      'todos/add/fulfilled',
      'todos/add/rejected',
    ])
    expect(resolved).toBe(dispatched[2])
    expect(dispatched[2]).toMatchObject({
      error: { name: 'TypeError', message: thrown.message },
      meta: {
        arg: { text: 'Ship it' },
        requestId: (dispatched[0].meta as { requestId: string }).requestId,
      },
    })
    logged.mockRestore()
  })
})

/**
 * The one route into a throwing reducer that needs nothing malformed to be in
 * the state first: an add answered with the body `null` leaves a well-formed
 * array with a `null` in it, and the next settled edit, marking or delete reads
 * `id` off that `null`. Driven through a real store, because the throw has to
 * come from the reducers the app runs rather than from a stand-in.
 */
describe('an operation whose settled action the reducers throw on', () => {
  const holdingANullTodo = async () => {
    const store = createTodoStore(answering('null'))
    await store.dispatch(addTodo('Ship it'))
    return store
  }

  it('is recorded as a failure of that operation and stops running', async () => {
    const logged = silenced()
    const store = await holdingANullTodo()

    const settled = await store.dispatch(completeTodo(0, true))

    expect(settled.type).toBe('todos/mark/rejected')
    expect(store.getState().errorMessage).toMatchObject({ name: 'TypeError' })
    expect(store.getState().exec.t['0']).toStrictEqual({ isUpdating: false })
    expect(store.getState().todos).toStrictEqual([
      { text: 'Use Redux', completed: false, id: 0 },
      null,
    ])
    expect(logged).toHaveBeenCalledWith(expect.any(TypeError))
    logged.mockRestore()
  })
})
