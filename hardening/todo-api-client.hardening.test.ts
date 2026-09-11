import { describe, expect, it } from 'vitest'
import {
  addTodoCall,
  completeTodoCall,
  editTodoCall,
  loadTodosCall,
  removeTodoCall,
} from '../src/todo-api/client'

// `readsResponseBody` decides whether a body is parsed at all, and delete is the only
// one of the five that says no. Said once per operation, so the next one cannot
// arrive unpinned.
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
