import type { ReactElement, ReactNode } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import type { Middleware } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import * as TodoActions from './actions'
import { LOAD_TODO_SUCCESS } from './constants/ActionTypes'
import TodoFilters from './constants/TodoFilters'
import type { Todo } from './models/Todo'
import rootReducer from './reducers'

// Container components dispatch API actions from their effects. This stands in
// for `callAPIMiddleware`, recognising an API action exactly as it does and
// answering it with nothing, so a unit test never reaches the network.
const isApiCall = (action: unknown): boolean =>
  typeof action === 'object' && action !== null && Array.isArray((action as { types?: unknown }).types)

const withoutTheNetwork: Middleware = () => (next) => (action) =>
  isApiCall(action) ? undefined : next(action)

export interface TestState {
  todos?: Todo[]
  visibilityFilter?: TodoFilters
}

// The starting state is dispatched rather than preloaded, so the app's own
// reducers decide its shape and a test cannot seed a state the app could not
// hold. The todos always go in: the reducer starts from one of its own.
export const createTestStore = ({ todos = [], visibilityFilter = TodoFilters.SHOW_ALL }: TestState = {}) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(withoutTheNetwork),
  })
  store.dispatch({ type: LOAD_TODO_SUCCESS, json: todos })
  store.dispatch(TodoActions.setVisibilityFilter(visibilityFilter))
  return store
}

const storeProvider = (store: ReturnType<typeof createTestStore>) =>
  ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>

// The one provider setup for components that hold a container, so no spec file
// builds its own store.
export const renderWithStore = (ui: ReactElement, state?: TestState) => {
  const store = createTestStore(state)
  const user = userEvent.setup()
  return { store, user, ...render(ui, { wrapper: storeProvider(store) }) }
}

export const mockTodoActions = () => ({
  addTodo: vi.fn(),
  clearCompleted: vi.fn(),
  completeAllTodos: vi.fn(),
  completeTodo: vi.fn(),
  deleteTodo: vi.fn(),
  editTodo: vi.fn(),
  loadTodos: vi.fn(),
  setVisibilityFilter: vi.fn(),
}) satisfies Record<keyof typeof TodoActions, Mock>

// A real browser sets `keyCode` 13 on Enter, and React's synthetic `which` on
// keydown reads that back - which is the property `TodoTextInput` submits on.
// `@testing-library/user-event` sends `key` and `code` and never `keyCode`, so
// its Enter misses the branch. This sends what a browser sends.
export const pressEnter = (field: HTMLElement) =>
  fireEvent.keyDown(field, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 })
