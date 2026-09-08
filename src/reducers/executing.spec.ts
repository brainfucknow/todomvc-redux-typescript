import { executing } from './executing'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'

/**
 * What is running, one of the two pieces of state nothing in the UI reads.
 * `features/todo-state-operations.feature` specifies it.
 */

const failed = new Error('Failed to fetch')

describe('the executing reducer', () => {
  const initial = executing(undefined, { type: 'NONE' })

  it('shows nothing running before anything is started', () => {
    expect(initial).toEqual({ isLoadingAll: false, isAdding: false, t: {} })
  })

  it('shows a load running until it settles', () => {
    const started = executing(
      initial,
      loadTodosOperation.pending('r', undefined),
    )
    expect(started.isLoadingAll).toBe(true)
    expect(started.isAdding).toBe(false)

    expect(
      executing(started, loadTodosOperation.fulfilled([], 'r', undefined))
        .isLoadingAll,
    ).toBe(false)
    expect(
      executing(started, loadTodosOperation.rejected(failed, 'r', undefined))
        .isLoadingAll,
    ).toBe(false)
  })

  it('shows an add running until it settles', () => {
    const asked = { text: 'Ship it' }
    const started = executing(initial, addTodoOperation.pending('r', asked))
    expect(started.isAdding).toBe(true)
    expect(started.isLoadingAll).toBe(false)

    const answered = { id: 9, text: 'Ship it', completed: false }
    expect(
      executing(started, addTodoOperation.fulfilled(answered, 'r', asked))
        .isAdding,
    ).toBe(false)
    expect(
      executing(started, addTodoOperation.rejected(failed, 'r', asked))
        .isAdding,
    ).toBe(false)
  })

  it('records progress per todo, so two updates can run at once', () => {
    const deleting = executing(
      initial,
      removeTodoOperation.pending('r1', { id: 1 }),
    )
    const both = executing(
      deleting,
      editTodoOperation.pending('r2', { id: 2, text: 'Buy oats' }),
    )

    expect(both.t).toEqual({
      '1': { isUpdating: true },
      '2': { isUpdating: true },
    })
  })

  it('stops showing one todo as updating without touching the others', () => {
    const both = [
      removeTodoOperation.pending('r1', { id: 1 }),
      completeTodoOperation.pending('r2', { id: 2, completed: true }),
    ].reduce(executing, initial)

    const settled = executing(
      both,
      removeTodoOperation.fulfilled(undefined, 'r1', { id: 1 }),
    )

    expect(settled.t).toEqual({
      '1': { isUpdating: false },
      '2': { isUpdating: true },
    })
  })

  it('stops showing a todo as updating when its call fails', () => {
    const started = executing(
      initial,
      editTodoOperation.pending('r', { id: 2, text: 'Buy oats' }),
    )

    expect(
      executing(
        started,
        editTodoOperation.rejected(failed, 'r', { id: 2, text: 'Buy oats' }),
      ).t,
    ).toEqual({ '2': { isUpdating: false } })
  })
})
