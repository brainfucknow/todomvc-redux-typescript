import App from './App'
import { renderWithStore } from '../test-support/store'
import { stubPendingFetch } from '../test-support/fetch'

beforeEach(stubPendingFetch)

const setup = () => {
  const { container } = renderWithStore(<App />)
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
