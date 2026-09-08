import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../reducers'
import type { TodoApiExtra } from '../actions/api'
import type { SendRequest } from '../todo-api/client'

/**
 * The app's store, and the one place that decides how a todo backend operation
 * reaches the network: the transport is the thunks' extra argument, so it is
 * supplied here rather than reached for down in the operation.
 *
 * Every caller passes one - the app passes `sendWithFetch`, a spec or the
 * acceptance suite passes a stand-in - so nothing has to remember to override a
 * default that talks to the network.
 */
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
