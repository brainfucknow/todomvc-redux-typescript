import { describe, expect, it } from 'vitest'
import { errorMessage } from '../src/reducers/errorMessage'
import { resetErrorMessage } from '../src/actions/local'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../src/actions/api'
import { elementOf, forAll, integer, text, tuple } from './tiny-check'

/**
 * Properties of src/reducers/errorMessage.ts, and one of them is the module's
 * boundary rather than its arithmetic.
 *
 * This module names no operation. It matches `isRejected`, which asks only
 * whether an action carries `meta.requestId` and `meta.requestStatus ===
 * 'rejected'`, so it records the failure of any async thunk in the store -
 * including one it has never heard of, which is what the last property drives
 * with an action built by hand rather than by an operation. That coupling is
 * deliberate: a recorder of "the last failure" that enumerated the five
 * operations would have to be edited to learn about a sixth. It is stated here
 * because it is the whole of the module's dependency on the rest of the app,
 * and prose in a doc comment cannot fail.
 *
 * features/todo-state-failures.feature says what is recorded and how long it
 * lives. Nothing in the UI reads it.
 */

const ID = integer(0, 20)
const TEXT = text(12)

const empty = errorMessage(undefined, { type: 'NONE' })

/** A rejected action from a thunk this module has never been told about. */
const rejectedElsewhere = (message: string) => ({
  type: 'somewhere-else/rejected',
  payload: undefined,
  error: { name: 'Error', message },
  meta: { requestId: 'r', requestStatus: 'rejected' as const, arg: undefined },
})

describe('what the app records about a failure, for every failure', () => {
  it('records the error of any operation that rejects, over anything held', async () => {
    await forAll(tuple(TEXT, ID, TEXT), ([message, id, body]) => {
      const failed = new Error(message)
      const rejections = [
        loadTodosOperation.rejected(failed, 'r', undefined),
        addTodoOperation.rejected(failed, 'r', { text: body }),
        editTodoOperation.rejected(failed, 'r', { id, text: body }),
        completeTodoOperation.rejected(failed, 'r', { id, completed: true }),
        removeTodoOperation.rejected(failed, 'r', { id }),
      ]

      for (const rejection of rejections) {
        expect(errorMessage(empty, rejection)).toStrictEqual(rejection.error)
        expect(
          errorMessage({ name: 'Held', message: 'earlier' }, rejection)
            ?.message,
        ).toBe(failed.message)
      }
    })
  })

  it('keeps what it holds through anything that did not fail', async () => {
    await forAll(tuple(TEXT, ID, TEXT), ([message, id, body]) => {
      const answer = { id, text: body, completed: false }
      const held = { name: 'Error', message }
      const uneventful = [
        { type: 'NONE' },
        loadTodosOperation.pending('r', undefined),
        removeTodoOperation.pending('r', { id }),
        loadTodosOperation.fulfilled([answer], 'r', undefined),
        addTodoOperation.fulfilled(answer, 'r', { text: body }),
        editTodoOperation.fulfilled(answer, 'r', { id, text: body }),
      ]

      for (const action of uneventful) {
        expect(errorMessage(held, action)).toBe(held)
      }
    })
  })

  it('holds nothing after it is asked to forget, whatever it held', async () => {
    await forAll(tuple(TEXT, elementOf([0, 1, 2])), ([message, times]) => {
      let state = errorMessage(
        empty,
        loadTodosOperation.rejected(new Error(message), 'r', undefined),
      )

      for (let time = 0; time <= times; time += 1) {
        state = errorMessage(state, resetErrorMessage())
        expect(state).toBeNull()
      }
    })
  })

  it('records a rejection from a thunk it has never heard of', async () => {
    await forAll(TEXT, (message) => {
      const elsewhere = rejectedElsewhere(message)

      expect(errorMessage(empty, elsewhere)).toStrictEqual(elsewhere.error)
    })
  })
})
