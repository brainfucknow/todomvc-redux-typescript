import { describe, expect, it, vi } from 'vitest'
import {
  addTodo,
  addTodoOperation,
  completeTodo,
  completeTodoOperation,
  editTodo,
  editTodoOperation,
  loadTodos,
  loadTodosOperation,
  removeTodo,
  removeTodoOperation,
  type TodoApiExtra,
} from '../src/actions/api'
import type { SendRequest } from '../src/todo-api/client'

/**
 * `src/actions/api.ts` survived three of thirty mutants and two of them were
 * the same miss twice: emptying the type prefix of `editTodoOperation` or of
 * `completeTodoOperation` changed nothing anywhere. `api.spec.ts` drives load,
 * add and remove and asserts their action types in as many words, so the two
 * operations it happens not to drive were the two whose names cost nothing to
 * rewrite - the same shape `todo-api-client.hardening.test.ts` records for
 * `readsResponseBody`, and the same answer: say it once per operation rather
 * than only for the gap.
 *
 * The name is not decoration. It is the only thing that tells the five
 * operations apart: every case and every matcher in `src/reducers/todos.ts` and
 * `src/reducers/executing.ts` selects on the action types these prefixes
 * generate. Two operations sharing a prefix would have an answer for a delete
 * append a todo for an add, silently, with lint, typecheck, the unit suite, the
 * properties and the acceptance suite all still green - because every one of
 * them drives one operation at a time.
 */

type Operation = { pending: { type: string } } & {
  fulfilled: { type: string }
} & { rejected: { type: string } }

const phasesOf = (operation: Operation) => [
  operation.pending.type,
  operation.fulfilled.type,
  operation.rejected.type,
]

/**
 * The five, each with the action the UI calls it by. One list, because both
 * things asserted below are claims about every one of them and a sixth
 * operation should arrive here once rather than in two places.
 */
const uiActions = [
  { start: () => loadTodos(), operation: loadTodosOperation },
  { start: () => addTodo('Ship it'), operation: addTodoOperation },
  { start: () => editTodo(1, 'Ship it'), operation: editTodoOperation },
  { start: () => completeTodo(1, true), operation: completeTodoOperation },
  { start: () => removeTodo(1), operation: removeTodoOperation },
]

const operations = uiActions.map(({ operation }) => operation)

describe('the name each backend operation dispatches under', () => {
  it('is the operation, in each of the three phases it has', () => {
    expect(phasesOf(loadTodosOperation)).toStrictEqual([
      'todos/load/pending',
      'todos/load/fulfilled',
      'todos/load/rejected',
    ])
    expect(phasesOf(addTodoOperation)).toStrictEqual([
      'todos/add/pending',
      'todos/add/fulfilled',
      'todos/add/rejected',
    ])
    expect(phasesOf(editTodoOperation)).toStrictEqual([
      'todos/edit/pending',
      'todos/edit/fulfilled',
      'todos/edit/rejected',
    ])
    expect(phasesOf(completeTodoOperation)).toStrictEqual([
      'todos/mark/pending',
      'todos/mark/fulfilled',
      'todos/mark/rejected',
    ])
    expect(phasesOf(removeTodoOperation)).toStrictEqual([
      'todos/remove/pending',
      'todos/remove/fulfilled',
      'todos/remove/rejected',
    ])
  })

  it('belongs to that operation alone, across all five', () => {
    const names = operations.flatMap(phasesOf)

    expect(new Set(names).size).toBe(names.length)
  })
})

/**
 * The second thing every one of the five must do, found the same way and
 * answered the same way. `recording` in `src/actions/api.ts` is what turns a
 * reducer throwing on a settled operation back into that operation's recorded
 * failure, and only two of the five wrappers went through anything that noticed:
 * `api.spec.ts` drives the seam with `addTodo` and the store with
 * `completeTodo`. Take `recording` off `loadTodos`, `editTodo` and `removeTodo`
 * and the whole net stays green - lint, typecheck, the unit suite, the
 * properties, the hardening suite and acceptance - while a settled edit or
 * delete that the reducers throw on goes back to being an unhandled rejection
 * with nothing logged, nothing recorded and the operation marked as running for
 * good. That is exactly the regression this repair was routed to undo, still
 * live for three operations out of five.
 *
 * No mutation runner generates that mutant: it is a call being replaced by the
 * call it wraps, which no standard mutator writes. It is the same shape as the
 * gap above - four operations pinned, the fifth free - and it gets the same
 * answer, said once per operation.
 */

/** What the assertions below read off a dispatched action, and nothing more. */
interface Recorded {
  type: string
  error?: unknown
  meta?: { requestId?: string }
}

type UiThunk = (
  dispatch: (action: unknown) => unknown,
  getState: () => unknown,
  extra: TodoApiExtra,
) => Promise<unknown>

/** Every call succeeds here: the throw under test is the reducers', not the backend's. */
const answering: SendRequest = (_request, readResponseBody) =>
  Promise.resolve({
    status: 200,
    ...(readResponseBody ? { body: '{"id":1,"text":"Ship it"}' } : {}),
  })

/**
 * The store as a wrapper meets it, reduced to the one thing that matters here:
 * a dispatch that runs a thunk, and reducers that throw on one action the way a
 * null in the todo list makes them.
 */
const dispatchedWhenReducersThrowOn = async (
  action: unknown,
  type: string,
  thrown: Error,
) => {
  const dispatched: Recorded[] = []
  const extra: TodoApiExtra = { send: answering }
  const dispatch = (candidate: unknown): unknown => {
    if (typeof candidate === 'function') {
      return (candidate as UiThunk)(dispatch, () => ({}), extra)
    }
    dispatched.push(candidate as Recorded)
    if ((candidate as Recorded).type === type) throw thrown
    return candidate
  }

  await dispatch(action)
  return dispatched
}

describe('what each backend operation does with a reducer that throws on it', () => {
  it('records the throw as that operation failing, across all five', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    for (const { start, operation } of uiActions) {
      const thrown = new TypeError(
        "Cannot read properties of null (reading 'id')",
      )

      const dispatched = await dispatchedWhenReducersThrowOn(
        start(),
        operation.fulfilled.type,
        thrown,
      )

      expect(dispatched.map((action) => action.type)).toStrictEqual([
        operation.pending.type,
        operation.fulfilled.type,
        operation.rejected.type,
      ])
      expect(dispatched[2].error).toMatchObject({
        name: 'TypeError',
        message: thrown.message,
      })
      expect(dispatched[2].meta?.requestId).toBe(dispatched[0].meta?.requestId)
      expect(logged).toHaveBeenCalledWith(thrown)
      logged.mockClear()
    }

    logged.mockRestore()
  })
})
