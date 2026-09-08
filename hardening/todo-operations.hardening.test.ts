import { describe, expect, it } from 'vitest'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../src/actions/api'

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

const operations = [
  loadTodosOperation,
  addTodoOperation,
  editTodoOperation,
  completeTodoOperation,
  removeTodoOperation,
]

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
