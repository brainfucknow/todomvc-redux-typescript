import { ApiActionMessage } from '../middlewares/callapimiddleware'

export function loadTodos(): ApiActionMessage {
  return {
    types: ['LOAD_TODO_REQUEST', 'LOAD_TODO_SUCCESS', 'LOAD_TODO_FAILURE'],
    callAPI: [
      `api/todos/`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    ],
    payload: {},
    json: true,
  }
}

export function editTodo(id: number, text: string): ApiActionMessage {
  return {
    types: ['PATCH_TODO_REQUEST', 'PATCH_TODO_SUCCESS', 'PATCH_TODO_FAILURE'],
    callAPI: [
      `api/todos/${id}`,
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      },
    ],
    payload: { id, text },
    json: true,
  }
}
export function completeTodo(id: number, completed: boolean): ApiActionMessage {
  if (completed == null) {
    throw new Error('Expected completed to be non null')
  }
  return {
    types: ['PATCH_TODO_REQUEST', 'PATCH_TODO_SUCCESS', 'PATCH_TODO_FAILURE'],
    callAPI: [
      `api/todos/${id}`,
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      },
    ],
    payload: { id, completed },
    json: true,
  }
}
export function addTodo(text: string): ApiActionMessage {
  return {
    types: ['POST_TODO_REQUEST', 'POST_TODO_SUCCESS', 'POST_TODO_FAILURE'],
    callAPI: [
      `api/todos/`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      },
    ],
    payload: { text },
    json: true,
  }
}

export function removeTodo(id: number): ApiActionMessage {
  return {
    types: [
      'DELETE_TODO_REQUEST',
      'DELETE_TODO_SUCCESS',
      'DELETE_TODO_FAILURE',
    ],
    callAPI: [
      `api/todos/${id}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    ],
    payload: { id },
    json: false,
  }
}
