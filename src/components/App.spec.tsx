import { screen } from '@testing-library/react'
import App from './App'
import { renderWithStore } from '../test-utils'

describe('App', () => {
  it('C01 shows the heading and the new-todo field', () => {
    renderWithStore(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('todos')
    expect(screen.getByPlaceholderText('What needs to be done?').className).toBe('new-todo')
  })

  it('C02 shows the stored todos, the toggle-all control and the footer count', () => {
    const { container } = renderWithStore(<App />, {
      todos: [
        { id: 0, text: 'Use Redux', completed: false },
        { id: 1, text: 'Run the tests', completed: true },
      ],
    })
    expect(Array.from(container.querySelectorAll('ul.todo-list label')).map((label) => label.textContent))
      .toEqual(['Use Redux', 'Run the tests'])
    expect(container.querySelector('input.toggle-all')).not.toBeNull()
    expect(container.querySelector('.todo-count')?.textContent).toBe('1 item left')
  })
})
