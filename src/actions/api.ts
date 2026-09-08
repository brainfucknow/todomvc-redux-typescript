import {
  addTodoCall,
  completeTodoCall,
  editTodoCall,
  loadTodosCall,
  removeTodoCall,
} from '../todo-api/client'
import { ApiActionMessage } from '../middlewares/callapimiddleware'

/**
 * The five todo backend operations as Redux actions. What each one sends, and
 * what it makes of the answer, is `src/todo-api/client.ts`; these creators only
 * name the operations the UI dispatches.
 */

export function loadTodos(): ApiActionMessage {
  return loadTodosCall()
}

export function editTodo(id: number, text: string): ApiActionMessage {
  return editTodoCall(id, text)
}

export function completeTodo(id: number, completed: boolean): ApiActionMessage {
  return completeTodoCall(id, completed)
}

export function addTodo(text: string): ApiActionMessage {
  return addTodoCall(text)
}

export function removeTodo(id: number): ApiActionMessage {
  return removeTodoCall(id)
}
