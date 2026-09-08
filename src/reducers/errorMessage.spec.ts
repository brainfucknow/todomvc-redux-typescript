import { errorMessage } from './errorMessage'
import { resetErrorMessage } from '../actions/local'
import { addTodoOperation, loadTodosOperation } from '../actions/api'

/**
 * What failed, the other piece of state nothing in the UI reads.
 * `features/todo-state-failures.feature` specifies it.
 */

const failed = new Error('Failed to fetch')

describe('the errorMessage reducer', () => {
  it('records nothing before anything has failed', () => {
    expect(errorMessage(undefined, { type: 'NONE' })).toBeNull()
  })

  it('records the message of a call that failed', () => {
    const recorded = errorMessage(
      null,
      loadTodosOperation.rejected(failed, 'r', undefined),
    )

    expect(recorded?.message).toBe('Failed to fetch')
  })

  it('keeps the record when a later operation succeeds', () => {
    const recorded = errorMessage(
      null,
      loadTodosOperation.rejected(failed, 'r', undefined),
    )
    const answered = { id: 9, text: 'Ship it', completed: false }

    expect(
      errorMessage(
        recorded,
        addTodoOperation.fulfilled(answered, 'r', { text: 'Ship it' }),
      ),
    ).toBe(recorded)
  })

  it('drops the record when it is asked to', () => {
    const recorded = errorMessage(
      null,
      loadTodosOperation.rejected(failed, 'r', undefined),
    )

    expect(errorMessage(recorded, resetErrorMessage())).toBeNull()
  })
})
