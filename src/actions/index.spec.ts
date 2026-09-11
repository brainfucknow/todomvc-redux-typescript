import * as actions from './index'
import { createTodoStore, type TodoStore as Store } from '../store'
import type { SendRequest, TodoApiRequest } from '../todo-api/client'
import TodoFilters from '../constants/TodoFilters'

const listening = () => {
  const requests: TodoApiRequest[] = []
  const send: SendRequest = (request) => {
    requests.push(request)
    return Promise.resolve({
      status: 200,
      body: '{"id":1,"text":"x","completed":false}',
    })
  }
  return { requests, store: createTodoStore(send) }
}

describe('what the app dispatches', () => {
  it.each([
    [
      'loadTodos',
      (store: Store) => store.dispatch(actions.loadTodos()),
      'GET',
      'api/todos/',
    ],
    [
      'addTodo',
      (store: Store) => store.dispatch(actions.addTodo('Buy milk')),
      'POST',
      'api/todos/',
    ],
    [
      'editTodo',
      (store: Store) => store.dispatch(actions.editTodo(1, 'Buy oats')),
      'PATCH',
      'api/todos/1',
    ],
    [
      'completeTodo',
      (store: Store) => store.dispatch(actions.completeTodo(1, true)),
      'PATCH',
      'api/todos/1',
    ],
    [
      'deleteTodo',
      (store: Store) => store.dispatch(actions.deleteTodo(1)),
      'DELETE',
      'api/todos/1',
    ],
  ])('sends %s to the backend', async (_name, dispatch, method, path) => {
    const { requests, store } = listening()

    await dispatch(store)

    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe(method)
    expect(requests[0].path).toBe(path)
  })

  it('toggles every todo without asking the backend', () => {
    const { requests, store } = listening()

    store.dispatch(actions.completeAllTodos())

    expect(requests).toStrictEqual([])
    expect(store.getState().todos.map((todo) => todo.completed)).toStrictEqual([
      true,
    ])
  })

  it('clears the completed todos without asking the backend', () => {
    const { requests, store } = listening()
    store.dispatch(actions.completeAllTodos())

    store.dispatch(actions.clearCompleted())

    expect(requests).toStrictEqual([])
    expect(store.getState().todos).toStrictEqual([])
  })

  it('chooses a filter without asking the backend', () => {
    const { requests, store } = listening()

    store.dispatch(actions.setVisibilityFilter(TodoFilters.SHOW_ACTIVE))

    expect(requests).toStrictEqual([])
    expect(store.getState().visibilityFilter).toBe(TodoFilters.SHOW_ACTIVE)
  })
})
