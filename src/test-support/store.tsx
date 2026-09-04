import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import reducer from '../reducers'
import { callAPIMiddleware } from '../middlewares/callapimiddleware'

export const createTestStore = () =>
  configureStore({
    reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(callAPIMiddleware)
  })

export const renderWithStore = (
  ui: React.ReactElement,
  store: ReturnType<typeof createTestStore> = createTestStore()
) =>
  render(
    <Provider store={store}>
      {ui}
    </Provider>
  )
