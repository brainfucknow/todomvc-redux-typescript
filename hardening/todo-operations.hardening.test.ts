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

// An operation's type prefix is the only thing that tells the five apart - every
// reducer case and matcher selects on it - so two sharing one would have a delete's
// answer append a todo, with every suite still green. Said once per operation.

type Operation = { pending: { type: string } } & {
  fulfilled: { type: string }
} & { rejected: { type: string } }

const phasesOf = (operation: Operation) => [
  operation.pending.type,
  operation.fulfilled.type,
  operation.rejected.type,
]

// One list, so a sixth operation arrives here once rather than in three places. Two
// calls each, differing in every field, because a wrapper that ignores its argument
// and passes a constant matches whichever single call carries that same constant.
const uiActions = [
  {
    operation: loadTodosOperation,
    calls: [{ start: () => loadTodos(), argument: undefined }],
  },
  {
    operation: addTodoOperation,
    calls: [
      { start: () => addTodo('Ship it'), argument: { text: 'Ship it' } },
      { start: () => addTodo('Or not'), argument: { text: 'Or not' } },
    ],
  },
  {
    operation: editTodoOperation,
    calls: [
      {
        start: () => editTodo(1, 'Ship it'),
        argument: { id: 1, text: 'Ship it' },
      },
      {
        start: () => editTodo(2, 'Or not'),
        argument: { id: 2, text: 'Or not' },
      },
    ],
  },
  {
    operation: completeTodoOperation,
    calls: [
      {
        start: () => completeTodo(1, true),
        argument: { id: 1, completed: true },
      },
      {
        start: () => completeTodo(2, false),
        argument: { id: 2, completed: false },
      },
    ],
  },
  {
    operation: removeTodoOperation,
    calls: [
      { start: () => removeTodo(1), argument: { id: 1 } },
      { start: () => removeTodo(2), argument: { id: 2 } },
    ],
  },
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

// Take `recording` off a wrapper and the whole net stays green while a settled
// operation the reducers throw on goes back to an unhandled rejection - nothing
// logged, nothing recorded, the operation marked running for good.

interface Recorded {
  type: string
  error?: unknown
  meta?: { requestId?: string; arg?: unknown }
}

type UiThunk = (
  dispatch: (action: unknown) => unknown,
  getState: () => unknown,
  extra: TodoApiExtra,
) => Promise<unknown>

// The throw under test is the reducers', not the backend's.
const answering: SendRequest = (_request, readResponseBody) =>
  Promise.resolve({
    status: 200,
    ...(readResponseBody ? { body: '{"id":1,"text":"Ship it"}' } : {}),
  })

const dispatchedBy = async (
  action: unknown,
  reducers: (action: Recorded) => void = () => {},
) => {
  const dispatched: Recorded[] = []
  const extra: TodoApiExtra = { send: answering }
  const dispatch = (candidate: unknown): unknown => {
    if (typeof candidate === 'function') {
      return (candidate as UiThunk)(dispatch, () => ({}), extra)
    }
    dispatched.push(candidate as Recorded)
    reducers(candidate as Recorded)
    return candidate
  }

  await dispatch(action)
  return dispatched
}

const throwingOn = (type: string, thrown: Error) => (action: Recorded) => {
  if (action.type === type) throw thrown
}

describe('what each backend operation does with a reducer that throws on it', () => {
  it('records the throw as that operation failing, across all five', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    for (const { operation, calls } of uiActions) {
      const thrown = new TypeError(
        "Cannot read properties of null (reading 'id')",
      )

      const dispatched = await dispatchedBy(
        calls[0].start(),
        throwingOn(operation.fulfilled.type, thrown),
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

// Every reducer keying off `action.meta.arg` reads the record a wrapper built from
// its arguments. A frozen text or flag survived the unit suite, the properties, this
// suite and acceptance together - no scenario ever asks for `completed: false`.
describe('the argument each backend operation is started with', () => {
  it('is the one its wrapper was called with, across all five', async () => {
    for (const { operation, calls } of uiActions) {
      for (const { start, argument } of calls) {
        const dispatched = await dispatchedBy(start())

        expect(dispatched.map((action) => action.type)).toStrictEqual([
          operation.pending.type,
          operation.fulfilled.type,
        ])
        expect(dispatched.map((action) => action.meta?.arg)).toStrictEqual([
          argument,
          argument,
        ])
      }
    }
  })
})
