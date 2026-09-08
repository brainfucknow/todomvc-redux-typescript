import type { MiddlewareAPI } from 'redux'
import { addTodo, loadTodos, removeTodo } from '../actions/api'
import { callAPIMiddleware } from './callapimiddleware'

/**
 * The boundary the todo API client sits behind: what reaches Redux, in what
 * order, and what never reaches it at all. What each call sends and what it
 * makes of an answer is `src/todo-api/client.spec.ts`; this file pins only the
 * three things that are the boundary's own.
 */

const stubFetch = (response: Partial<Response>) => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(response as Response),
  ) as typeof fetch
}

const rejectingFetch = (error: unknown) => {
  globalThis.fetch = vi.fn(() => Promise.reject(error)) as typeof fetch
}

const spyingStore = () => {
  const order: string[] = []
  const dispatched: unknown[] = []
  const nexted: unknown[] = []
  const api = {
    dispatch: (action: unknown) => {
      order.push('dispatch')
      dispatched.push(action)
      return action
    },
    getState: () => ({}),
  } as unknown as MiddlewareAPI
  const run = (action: unknown) =>
    callAPIMiddleware(api)((forwarded) => {
      nexted.push(forwarded)
      return forwarded
    })(action)
  return { dispatched, nexted, order, run }
}

describe('the todo API middleware', () => {
  it('passes an action that is not an API call straight through to next', () => {
    const { dispatched, nexted, run } = spyingStore()
    const action = { type: 'ADD_TODO', text: 'Buy milk' }

    run(action)

    expect(nexted).toStrictEqual([action])
    expect(dispatched).toStrictEqual([])
  })

  it('throws on a dispatched null before anything of this task runs, as it always has', () => {
    const { dispatched, nexted, run } = spyingStore()

    expect(() => run(null)).toThrow(TypeError)
    expect(nexted).toStrictEqual([])
    expect(dispatched).toStrictEqual([])
  })

  it('dispatches the request action, then the success action with the parsed body', async () => {
    stubFetch({ status: 200, text: () => Promise.resolve('{"id":7}') })
    const { dispatched, nexted, run } = spyingStore()

    await run(addTodo('Buy milk'))

    expect(dispatched).toStrictEqual([
      { type: 'POST_TODO_REQUEST', text: 'Buy milk' },
      { type: 'POST_TODO_SUCCESS', text: 'Buy milk', json: { id: 7 } },
    ])
    expect(nexted).toStrictEqual([])
  })

  it('keeps the json key on a success that read nothing, rather than omitting it', async () => {
    stubFetch({ status: 200, text: () => Promise.resolve('{"id":1}') })
    const { dispatched, run } = spyingStore()

    await run(removeTodo(1))

    expect(dispatched[1]).toStrictEqual({
      type: 'DELETE_TODO_SUCCESS',
      id: 1,
      json: undefined,
    })
  })

  it('logs the error before dispatching the failure action', async () => {
    const error = new Error('Failed to fetch')
    rejectingFetch(error)
    const { dispatched, order, run } = spyingStore()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {
      order.push('log')
    })

    await run(loadTodos())

    expect(logged).toHaveBeenCalledWith(error)
    expect(order).toStrictEqual(['dispatch', 'log', 'dispatch'])
    expect(dispatched[1]).toStrictEqual({ type: 'LOAD_TODO_FAILURE', error })
    logged.mockRestore()
  })
})
