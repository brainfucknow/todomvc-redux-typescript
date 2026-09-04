// How a component under test is mounted and driven: the store it renders
// against, the actions it is handed, and the one keystroke `userEvent` cannot
// send. What the rendered output is then read with is in `./test-queries.ts`.
import type { ReactElement, ReactNode } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import type { Middleware } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { fireEvent, render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import * as TodoActions from './actions'
import { LOAD_TODO_SUCCESS } from './constants/ActionTypes'
import TodoFilters from './constants/TodoFilters'
import { isApiAction } from './middlewares/callapimiddleware'
import type { Todo } from './models/Todo'
import rootReducer from './reducers'

// Container components dispatch API actions from their effects. This stands in
// for `callAPIMiddleware` and answers those with nothing, so a unit test never
// reaches the network. Which actions those are is the middleware's own answer,
// asked for rather than spelled again: a stand-in that recognised a different
// set would let one through to a reducer that cannot read it.
const withoutTheNetwork: Middleware = () => (next) => (action) =>
  isApiAction(action) ? undefined : next(action)

export interface TestState {
  todos?: Todo[]
  visibilityFilter?: TodoFilters
}

// The starting state is dispatched rather than preloaded, so the app's own
// reducers decide its shape and a test cannot seed a state the app could not
// hold. The todos always go in: the reducer starts from one of its own.
const createTestStore = ({ todos = [], visibilityFilter = TodoFilters.SHOW_ALL }: TestState = {}) => {
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

// The session that drives a rendered component, as the specs receive it.
export type TestUser = ReturnType<typeof userEvent.setup>

// A component that holds no container, with the user session that drives it.
export const renderComponent = (ui: ReactElement, options?: RenderOptions) => ({
  user: userEvent.setup(),
  ...render(ui, options),
})

// A row is a `<li>`, so it is mounted inside the list it belongs to rather than
// loose in the container: `getByRole('listitem')` finds one only where a list
// can hold it.
export const insideList = ({ children }: { children: ReactNode }) => <ul>{children}</ul>

// The one provider setup for components that hold a container, so no spec file
// builds its own store.
export const renderWithStore = (ui: ReactElement, state?: TestState) => {
  const store = createTestStore(state)
  return { store, ...renderComponent(ui, { wrapper: storeProvider(store) }) }
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

// A real browser sets `keyCode` on a keydown, and React's synthetic `which`
// reads that back - which is the property `TodoTextInput` submits on.
// `@testing-library/user-event` sends `key` and `code` and never `keyCode`, so
// its keystrokes miss the branch. These send what a browser sends.
const pressKey = (field: HTMLElement, key: string, keyCode: number) =>
  fireEvent.keyDown(field, { key, code: key, keyCode, which: keyCode })

export const pressEnter = (field: HTMLElement) => pressKey(field, 'Enter', 13)

export const pressEscape = (field: HTMLElement) => pressKey(field, 'Escape', 27)
