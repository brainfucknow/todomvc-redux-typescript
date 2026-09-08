import { describe, expect, it } from 'vitest'
import {
  addTodoCall,
  completeTodoCall,
  editTodoCall,
  loadTodosCall,
  removeTodoCall,
} from '../src/todo-api/client'

/**
 * `src/todo-api/client.ts` survived one mutant out of 91: flipping
 * `readsResponseBody` to false in `completeTodoCall`. Four of the five request
 * specs in client.spec.ts assert that field and the fifth does not, so the one
 * operation whose answer nobody had pinned was the one where dropping the read
 * cost nothing.
 *
 * Asserting it once per operation rather than only for the gap keeps the next
 * operation from arriving without one: whether an answer is read is the thing
 * that decides whether a body is parsed, and delete is the only call in the
 * five that says no.
 */
describe('whether each operation reads the answer it gets', () => {
  it('reads it for every call that has something to learn from it', () => {
    expect(loadTodosCall().readsResponseBody).toBe(true)
    expect(addTodoCall('Buy milk').readsResponseBody).toBe(true)
    expect(editTodoCall(1, 'Buy milk').readsResponseBody).toBe(true)
    expect(completeTodoCall(1, true).readsResponseBody).toBe(true)
  })

  it('never reads it for a delete, which is the preserved defect', () => {
    expect(removeTodoCall(1).readsResponseBody).toBe(false)
  })
})
