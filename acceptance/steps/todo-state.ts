import { expect, vi } from 'vitest'
import {
  addTodo,
  completeTodo,
  editTodo,
  loadTodos,
  removeTodo,
} from '../../src/actions/api'
import * as local from '../../src/actions/local'
import TodoFilters from '../../src/constants/TodoFilters'
import { getVisibleTodos } from '../../src/selectors'
import { createTodoStore, type TodoStore } from '../../src/store'
import type { Todo } from '../../src/models/Todo'
import type { SendRequest, TodoApiAnswer } from '../../src/todo-api/client'
import type { StepDefinition, StepSuite } from '../runtime'

/**
 * The step vocabulary of features/todo-state-*.feature, connected to the store
 * the application itself builds. No network: the store is given a transport
 * that hands each request back to the scenario, so an operation stays in
 * flight until a step says what came back.
 *
 * `the app starts ...` leaves the operation running and `the backend answers
 * ...` settles it and waits for the store to catch up. That separation is the
 * whole point of those two steps: it is what lets a scenario read the list
 * while a call is still out.
 */

interface PendingCall {
  answer: (answer: TodoApiAnswer) => void
  fail: (error: unknown) => void
}

interface RunningOperation {
  call: PendingCall
  done: Promise<unknown>
  settled: boolean
}

export interface TodoStateWorld {
  send: SendRequest
  calls: PendingCall[]
  store: TodoStore
  startingTodos: Todo[]
  operations: RunningOperation[]
}

type Definition = StepDefinition<TodoStateWorld>

/**
 * One of the five operations, waiting for a store to run it. Each dispatches
 * itself rather than handing back an action, because the five thunks have five
 * different action types and a caller that dispatched the union of them would
 * be asking `dispatch` to be one function for all five.
 */
type Operation = (store: TodoStore) => Promise<unknown>

const createWorld = (): TodoStateWorld => {
  const calls: PendingCall[] = []
  const send: SendRequest = () =>
    new Promise<TodoApiAnswer>((resolve, reject) => {
      calls.push({ answer: resolve, fail: reject })
    })
  const store = createTodoStore(send)
  return {
    send,
    calls,
    store,
    startingTodos: store.getState().todos,
    operations: [],
  }
}

const startWith = (world: TodoStateWorld, todos: Todo[]) => {
  world.store = createTodoStore(world.send, { todos })
  world.startingTodos = todos
}

const stateOf = (world: TodoStateWorld) => world.store.getState()

/**
 * Dispatches an operation and remembers the request it sent, so a later step
 * can answer that request. The client sends before it yields, which is what
 * lets the two be paired without waiting for anything.
 */
const start = (world: TodoStateWorld, operation: Operation) => {
  const sent = world.calls.length
  const done = operation(world.store)

  if (world.calls.length === sent) {
    throw new Error('The operation sent no request')
  }
  world.operations.push({ call: world.calls[sent], done, settled: false })
}

const oldestRunning = (world: TodoStateWorld): RunningOperation => {
  const operation = world.operations.find((running) => !running.settled)
  if (!operation) {
    throw new Error('No operation is waiting for an answer')
  }
  operation.settled = true
  return operation
}

/**
 * Settles one operation and waits for the store to have seen it.
 *
 * `src/actions/api.ts` writes a failure to the console, and
 * `src/actions/api.spec.ts` is what pins that. These features are about what
 * the state holds, so the write is silenced here rather than printed over the
 * run.
 */
const settle = async (
  operation: RunningOperation,
  answer: (call: PendingCall) => void,
) => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    answer(operation.call)
    await operation.done
  } finally {
    logged.mockRestore()
  }
}

/** The five phrasings of `the app starts ...`, one operation each. */
const OPERATIONS: [RegExp, (captures: string[]) => Operation][] = [
  [/^loading every todo$/, () => (store) => store.dispatch(loadTodos())],
  [
    /^adding the todo (.+)$/,
    ([text]) =>
      (store) =>
        store.dispatch(addTodo(text)),
  ],
  [
    /^editing todo (.+) to (.+)$/,
    ([id, text]) =>
      (store) =>
        store.dispatch(editTodo(wholeNumber(id), text)),
  ],
  [
    /^marking todo (.+) complete$/,
    ([id]) =>
      (store) =>
        store.dispatch(completeTodo(wholeNumber(id), true)),
  ],
  [
    /^deleting todo (.+)$/,
    ([id]) =>
      (store) =>
        store.dispatch(removeTodo(wholeNumber(id))),
  ],
]

const operationNamed = (phrase: string): Operation => {
  for (const [pattern, make] of OPERATIONS) {
    const match = pattern.exec(phrase)
    if (match) return make(match.slice(1))
  }
  throw new Error(`Not an operation: ${phrase}`)
}

const FILTERS: Record<string, TodoFilters> = {
  all: TodoFilters.SHOW_ALL,
  active: TodoFilters.SHOW_ACTIVE,
  completed: TodoFilters.SHOW_COMPLETED,
}

const filterNamed = (name: string): TodoFilters => {
  if (!(name in FILTERS)) throw new Error(`Not a filter: ${name}`)
  return FILTERS[name]
}

/** Whether the state shows the work a scenario names as running. */
const isRunning = (world: TodoStateWorld, subject: string) => {
  const running = stateOf(world).exec
  if (subject === 'the load') return running.isLoadingAll
  if (subject === 'the add') return running.isAdding

  const update = /^the update of todo (\d+)$/.exec(subject)
  if (update) return running.t[update[1]]?.isUpdating
  throw new Error(`Not something that runs: ${subject}`)
}

function wholeNumber(value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Not a whole number: ${value}`)
  }
  return Number(value)
}

/** `true` and `false`, the two values a todo can be marked completed to. */
function flag(value: string): boolean {
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Not a completed flag: ${value}`)
  }
  return value === 'true'
}

/** `complete` and `active`, the two cells `every todo in the list reads` takes. */
function completedFlag(word: string): boolean {
  if (word !== 'complete' && word !== 'active') {
    throw new Error(`Not a completed state: ${word}`)
  }
  return word === 'complete'
}

const definitions: Definition[] = [
  {
    pattern: /^a fresh state$/,
    handle: () => {
      // The world is already the state the app holds before anything happens.
    },
  },
  {
    pattern: /^the state starts with the todo list (.+)$/,
    handle: ({ world, expandJson }, todos) =>
      startWith(world, JSON.parse(expandJson(todos)) as Todo[]),
  },

  {
    pattern: /^a todo (.+) is added locally$/,
    handle: ({ world, expand }, text) => {
      world.store.dispatch(local.addTodo(expand(text)))
    },
  },
  {
    pattern: /^todo (.+) is deleted locally$/,
    handle: ({ world, expand }, id) => {
      world.store.dispatch(local.deleteTodo(wholeNumber(expand(id))))
    },
  },
  {
    pattern: /^todo (.+) is edited locally to (.+)$/,
    handle: ({ world, expand }, id, text) => {
      world.store.dispatch(
        local.editTodo(wholeNumber(expand(id)), expand(text)),
      )
    },
  },
  {
    pattern: /^todo (.+) is marked completed (.+) locally$/,
    handle: ({ world, expand }, id, completed) => {
      world.store.dispatch(
        local.completeTodo(wholeNumber(expand(id)), flag(expand(completed))),
      )
    },
  },
  {
    pattern: /^every todo is toggled$/,
    handle: ({ world }) => {
      world.store.dispatch(local.completeAllTodos())
    },
  },
  {
    pattern: /^the completed todos are cleared$/,
    handle: ({ world }) => {
      world.store.dispatch(local.clearCompleted())
    },
  },

  {
    pattern: /^the app starts (.+)$/,
    handle: ({ world, expand }, operation) =>
      start(world, operationNamed(expand(operation))),
  },
  {
    pattern: /^the backend answers with (.+)$/,
    handle: ({ world, expandJson }, body) =>
      settle(oldestRunning(world), (call) =>
        call.answer({ status: 200, body: expandJson(body) }),
      ),
  },
  {
    pattern: /^the backend answers$/,
    handle: ({ world }) =>
      settle(oldestRunning(world), (call) => call.answer({ status: 200 })),
  },
  {
    pattern: /^the call fails with error (.+)$/,
    handle: ({ world, expand }, message) =>
      settle(oldestRunning(world), (call) =>
        call.fail(new Error(expand(message))),
      ),
  },
  {
    pattern: /^the recorded failure is forgotten$/,
    handle: ({ world }) => {
      world.store.dispatch(local.resetErrorMessage())
    },
  },

  {
    pattern: /^the (.+) filter is chosen$/,
    handle: ({ world, expand }, filter) => {
      world.store.dispatch(
        local.setVisibilityFilter(filterNamed(expand(filter))),
      )
    },
  },

  {
    pattern: /^the todo list is (.+)$/,
    handle: ({ world, expandJson }, todos) =>
      expect(stateOf(world).todos).toStrictEqual(JSON.parse(expandJson(todos))),
  },
  {
    pattern: /^the todo list has not changed$/,
    handle: ({ world }) =>
      expect(stateOf(world).todos).toStrictEqual(world.startingTodos),
  },
  {
    pattern: /^the todo list holds (.+) todos$/,
    handle: ({ world, expand }, count) =>
      expect(stateOf(world).todos).toHaveLength(wholeNumber(expand(count))),
  },
  {
    pattern: /^the last todo is (.+)$/,
    handle: ({ world, expandJson }, todo) => {
      const todos = stateOf(world).todos
      expect(todos[todos.length - 1]).toStrictEqual(
        JSON.parse(expandJson(todo)),
      )
    },
  },
  {
    pattern: /^every todo in the list reads (.+)$/,
    handle: ({ world, expand }, state) =>
      expect(
        new Set(stateOf(world).todos.map((todo) => todo.completed)),
      ).toStrictEqual(new Set([completedFlag(expand(state))])),
  },
  {
    pattern: /^(.+) is in flight$/,
    handle: ({ world, expand }, subject) =>
      expect(isRunning(world, expand(subject))).toBe(true),
  },
  {
    pattern: /^no operation is left in flight$/,
    handle: ({ world }) => {
      const running = stateOf(world).exec
      expect(running.isLoadingAll).toBe(false)
      expect(running.isAdding).toBe(false)
      expect(
        Object.values(running.t).map((todo) => todo.isUpdating),
      ).not.toContain(true)
    },
  },
  {
    pattern: /^no failure is recorded$/,
    handle: ({ world }) => expect(stateOf(world).errorMessage).toBeNull(),
  },
  {
    pattern: /^the recorded failure message is (.+)$/,
    handle: ({ world, expand }, message) =>
      expect(stateOf(world).errorMessage?.message).toBe(expand(message)),
  },
  {
    pattern: /^the visible todos are (.+)$/,
    handle: ({ world, expandJson }, texts) =>
      expect(
        getVisibleTodos(stateOf(world)).map((todo) => todo.text),
      ).toStrictEqual(JSON.parse(expandJson(texts))),
  },
]

export const todoStateSteps: StepSuite<TodoStateWorld> = {
  createWorld,
  definitions,
}
