import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import App from './App'
import reducer from '../reducers'
import { callAPIMiddleware } from '../middlewares/callapimiddleware'

beforeEach(() => {
  // The todo list loads todos on mount; keep the request pending so the store
  // never changes underneath an assertion.
  (global as any).fetch = jest.fn(() => new Promise(() => {}))
})

const setup = () => {
  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(callAPIMiddleware),
  })

  const { container } = render(
    <Provider store={store}>
      <App />
    </Provider>
  )
  return container
}

describe('components', () => {
  describe('Header', () => {
    it('should render', () => {
      const container = setup()
      const header = container.querySelector('header.header') as HTMLElement
      expect(header).not.toBeNull()
      expect((header.querySelector('h1') as HTMLElement).textContent).toBe('todos')
      expect(header.querySelector('input.new-todo')).not.toBeNull()
    })
  })

  describe('Mainsection', () => {
    it('should render', () => {
      const container = setup()
      const mainSection = container.querySelector('section.main') as HTMLElement
      expect(mainSection).not.toBeNull()
      expect(mainSection.querySelector('ul.todo-list')).not.toBeNull()
    })
  })
})
