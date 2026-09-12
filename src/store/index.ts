import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../reducers'
import type { TodoApiExtra } from '../actions/api'
import type { SendRequest } from '../todo-api/client'

// `send` has no default, so no caller can fall back to one that talks to the network.
export const createTodoStore = (
  send: SendRequest,
  preloadedState?: Partial<ReturnType<typeof rootReducer>>,
) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => {
      const extra: TodoApiExtra = { send }
      return getDefaultMiddleware({ thunk: { extraArgument: extra } })
    },
  })

export type TodoStore = ReturnType<typeof createTodoStore>
