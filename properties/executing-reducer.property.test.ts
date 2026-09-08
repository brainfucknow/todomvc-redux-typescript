import { describe, expect, it } from 'vitest'
import { executing, type Executing } from '../src/reducers/executing'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../src/actions/api'
import {
  arrayOf,
  boolean,
  elementOf,
  forAll,
  integer,
  text,
  tuple,
  type Arbitrary,
} from './tiny-check'

/**
 * Properties of src/reducers/executing.ts: what holds of "what is running" for
 * every run of operations, where features/todo-state-operations.feature says
 * what holds for the two or three it names.
 *
 * The one the feature cannot state is the last: start any number of operations,
 * settle every one of them, and nothing is left in flight. A table can start
 * two and settle two; this says it of every sequence, including one that starts
 * the same operation twice and one that settles an operation nobody started.
 *
 * Nothing in the UI reads this state. It is specified, so it is stated here as
 * strongly as anything the user can see.
 */

const ID = integer(0, 6)
const TEXT = text(6)

const initial = executing(undefined, { type: 'NONE' })
const failed = new Error('Failed to fetch')

type OperationName = 'load' | 'add' | 'edit' | 'mark' | 'remove'

interface Started {
  operation: OperationName
  id: number
  text: string
  completed: boolean
}

/** The three operations that report against one todo rather than the whole list. */
const UPDATES: OperationName[] = ['edit', 'mark', 'remove']

const isUpdate = (started: Started) => UPDATES.includes(started.operation)

const pendingOf = ({ operation, id, text: body, completed }: Started) => {
  switch (operation) {
    case 'load':
      return loadTodosOperation.pending('r', undefined)
    case 'add':
      return addTodoOperation.pending('r', { text: body })
    case 'edit':
      return editTodoOperation.pending('r', { id, text: body })
    case 'mark':
      return completeTodoOperation.pending('r', { id, completed })
    case 'remove':
      return removeTodoOperation.pending('r', { id })
  }
}

const settlementOf = (
  { operation, id, text: body, completed }: Started,
  succeeded: boolean,
) => {
  const answer = { id, text: body, completed }
  switch (operation) {
    case 'load':
      return succeeded
        ? loadTodosOperation.fulfilled([answer], 'r', undefined)
        : loadTodosOperation.rejected(failed, 'r', undefined)
    case 'add':
      return succeeded
        ? addTodoOperation.fulfilled(answer, 'r', { text: body })
        : addTodoOperation.rejected(failed, 'r', { text: body })
    case 'edit':
      return succeeded
        ? editTodoOperation.fulfilled(answer, 'r', { id, text: body })
        : editTodoOperation.rejected(failed, 'r', { id, text: body })
    case 'mark':
      return succeeded
        ? completeTodoOperation.fulfilled(answer, 'r', { id, completed })
        : completeTodoOperation.rejected(failed, 'r', { id, completed })
    case 'remove':
      return succeeded
        ? removeTodoOperation.fulfilled(undefined, 'r', { id })
        : removeTodoOperation.rejected(failed, 'r', { id })
  }
}

const anyStart: Arbitrary<Started> = {
  generate: (random) => ({
    operation: elementOf<OperationName>([
      'load',
      'add',
      'edit',
      'mark',
      'remove',
    ]).generate(random),
    id: ID.generate(random),
    text: TEXT.generate(random),
    completed: boolean.generate(random),
  }),
  shrink: () => [],
}

const started = (state: Executing, starts: Started[]) =>
  starts.reduce((carried, start) => executing(carried, pendingOf(start)), state)

const nothingInFlight = (state: Executing) =>
  !state.isLoadingAll &&
  !state.isAdding &&
  Object.values(state.t).every((todo) => !todo.isUpdating)

describe('what is running, for every run of operations', () => {
  it('reports exactly the operations that were started', async () => {
    await forAll(arrayOf(anyStart, 6), (starts) => {
      const state = started(initial, starts)

      expect(state.isLoadingAll).toBe(
        starts.some(({ operation }) => operation === 'load'),
      )
      expect(state.isAdding).toBe(
        starts.some(({ operation }) => operation === 'add'),
      )
      expect(Object.keys(state.t).sort()).toStrictEqual(
        [
          ...new Set(starts.filter(isUpdate).map(({ id }) => id.toString())),
        ].sort(),
      )
      for (const { id } of starts.filter(isUpdate)) {
        expect(state.t[id.toString()].isUpdating).toBe(true)
      }
    })
  })

  it('leaves nothing in flight once every started operation has settled', async () => {
    await forAll(arrayOf(tuple(anyStart, boolean), 6), (runs) => {
      const settled = runs.reduce(
        (carried, [start, succeeded]) =>
          executing(carried, settlementOf(start, succeeded)),
        started(
          initial,
          runs.map(([start]) => start),
        ),
      )

      expect(nothingInFlight(settled)).toBe(true)
    })
  })

  it('reads a failure and an answer as the same news: it stopped', async () => {
    await forAll(tuple(arrayOf(anyStart, 4), anyStart), ([starts, start]) => {
      const running = started(initial, starts)

      expect(executing(running, settlementOf(start, true))).toStrictEqual(
        executing(running, settlementOf(start, false)),
      )
    })
  })

  it('says nothing is running when an operation nobody started settles', async () => {
    await forAll(tuple(anyStart, boolean), ([start, succeeded]) => {
      expect(
        nothingInFlight(executing(initial, settlementOf(start, succeeded))),
      ).toBe(true)
    })
  })
})
