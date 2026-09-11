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

// The last property is the one a table cannot state: start any number of
// operations, settle every one, and nothing is left in flight - including a
// sequence that starts one twice, or settles one nobody started.

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

const UPDATES: OperationName[] = ['edit', 'mark', 'remove']

const isUpdate = (started: Started) => UPDATES.includes(started.operation)

// The one place that knows how each of the five operations is addressed.
const actionsOf = ({ operation, id, text: body, completed }: Started) => {
  const answer = { id, text: body, completed }
  switch (operation) {
    case 'load':
      return {
        pending: loadTodosOperation.pending('r', undefined),
        fulfilled: loadTodosOperation.fulfilled([answer], 'r', undefined),
        rejected: loadTodosOperation.rejected(failed, 'r', undefined),
      }
    case 'add':
      return {
        pending: addTodoOperation.pending('r', { text: body }),
        fulfilled: addTodoOperation.fulfilled(answer, 'r', { text: body }),
        rejected: addTodoOperation.rejected(failed, 'r', { text: body }),
      }
    case 'edit':
      return {
        pending: editTodoOperation.pending('r', { id, text: body }),
        fulfilled: editTodoOperation.fulfilled(answer, 'r', {
          id,
          text: body,
        }),
        rejected: editTodoOperation.rejected(failed, 'r', { id, text: body }),
      }
    case 'mark':
      return {
        pending: completeTodoOperation.pending('r', { id, completed }),
        fulfilled: completeTodoOperation.fulfilled(answer, 'r', {
          id,
          completed,
        }),
        rejected: completeTodoOperation.rejected(failed, 'r', {
          id,
          completed,
        }),
      }
    case 'remove':
      return {
        pending: removeTodoOperation.pending('r', { id }),
        fulfilled: removeTodoOperation.fulfilled(undefined, 'r', { id }),
        rejected: removeTodoOperation.rejected(failed, 'r', { id }),
      }
  }
}

const pendingOf = (start: Started) => actionsOf(start).pending

const settlementOf = (start: Started, succeeded: boolean) => {
  const settlements = actionsOf(start)
  return succeeded ? settlements.fulfilled : settlements.rejected
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
