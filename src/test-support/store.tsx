import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createTodoStore } from '../store'
import { sendWithFetch } from '../todo-api/fetchTransport'

export const createTestStore = () => createTodoStore(sendWithFetch)

export const renderWithStore = (
  ui: React.ReactElement,
  store: ReturnType<typeof createTestStore> = createTestStore(),
) => render(<Provider store={store}>{ui}</Provider>)
