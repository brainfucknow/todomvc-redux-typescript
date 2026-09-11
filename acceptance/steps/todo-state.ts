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
import { wholeNumber } from './cells'
import type { StepDefinition, StepSuite } from '../runtime'

// The transport hands each request back to the scenario, so `the app starts ...`
// leaves an operation in flight until `the backend answers ...` settles it - which is
// what lets a scenario read the list while a call is still out.

interface PendingCall {
  answer: (answer: TodoApiAnswer) => void
  fail: (error: unknown) => void
}

interface RunningOperation {
  call: PendingCall
  done: Promise<unknown>
  answered: boolean
}

export interface TodoStateWorld {
  send: SendRequest
  calls: PendingCall[]
  store: TodoStore
  startingTodos: Todo[]
  operations: RunningOperation[]
}

type Definition = StepDefinition<TodoStateWorld>

// Dispatches itself rather than handing back an action: the five thunks have five
// action types and no caller can dispatch their union.
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

// The client sends before it yields, so the request can be paired with the operation
// without waiting for anything.
const start = (world: TodoStateWorld, operation: Operation) => {
  const sent = world.calls.length
  const done = operation(world.store)

  if (world.calls.length === sent) {
    throw new Error('The operation sent no request')
  }
  world.operations.push({ call: world.calls[sent], done, answered: false })
}

const takeUnanswered = (world: TodoStateWorld): RunningOperation => {
  const operation = world.operations.find((running) => !running.answered)
  if (!operation) {
    throw new Error('No operation is waiting for an answer')
  }
  operation.answered = true
  return operation
}

// The failure `src/actions/api.ts` logs is silenced here rather than printed over
// the run; src/actions/api.spec.ts is what pins it.
const settle = async (
  operation: RunningOperation,
  respond: (call: PendingCall) => void,
) => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    respond(operation.call)
    await operation.done
  } finally {
    logged.mockRestore()
  }
}

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
    /^marking todo (.+) (complete|active)$/,
    ([id, direction]) =>
      (store) =>
        store.dispatch(completeTodo(wholeNumber(id), completedFlag(direction))),
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

const isRunning = (world: TodoStateWorld, subject: string) => {
  const running = stateOf(world).exec
  if (subject === 'the load') return running.isLoadingAll
  if (subject === 'the add') return running.isAdding

  const update = /^the update of todo (\d+)$/.exec(subject)
  if (update) return running.t[update[1]]?.isUpdating
  throw new Error(`Not something that runs: ${subject}`)
}

function flag(value: string): boolean {
  if (value !== 'true' && value !== 'false') {
    throw new Error(`Not a completed flag: ${value}`)
  }
  return value === 'true'
}

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
      // A fresh world is already that state.
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
      settle(takeUnanswered(world), (call) =>
        call.answer({ status: 200, body: expandJson(body) }),
      ),
  },
  {
    pattern: /^the backend answers$/,
    handle: ({ world }) =>
      settle(takeUnanswered(world), (call) => call.answer({ status: 200 })),
  },
  {
    pattern: /^the call fails with error (.+)$/,
    handle: ({ world, expand }, message) =>
      settle(takeUnanswered(world), (call) =>
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
