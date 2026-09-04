import React from 'react'
import { render } from '@testing-library/react'
import TodoList, { TodoListProps } from './TodoList'

const setup = () => {
  const props:TodoListProps = {
    filteredTodos: [
      {
        text: 'Use Redux',
        completed: false,
        id: 0
      }, {
        text: 'Run the tests',
        completed: true,
        id: 1
      }
    ],
    actions: {
      addTodo: jest.fn(),
      editTodo: jest.fn(),
      deleteTodo: jest.fn(),
      completeTodo: jest.fn(),
      completeAllTodos: jest.fn(),
      clearCompleted: jest.fn(),
      setVisibilityFilter: jest.fn(),
      loadTodos: jest.fn()
    }
  }

  const { container } = render(<TodoList {...props} />)

  return {
    props: props,
    container: container
  }
}

describe('components', () => {
  describe('TodoList', () => {
    it('should render container', () => {
      const { container } = setup()
      const list = container.querySelector('ul') as HTMLElement
      expect(list).not.toBeNull()
      expect(list.className).toBe('todo-list')
    })

    it('should render todos', () => {
      const { container, props } = setup()
      const items = container.querySelectorAll('ul.todo-list > li')
      expect(items.length).toBe(2)
      items.forEach((item:Element, i:number) => {
        const todo = props.filteredTodos[i]
        const label = item.querySelector('label') as HTMLElement
        expect(label.textContent).toBe(todo.text)
        const toggle = item.querySelector('input.toggle') as HTMLInputElement
        expect(toggle.checked).toBe(todo.completed)
      })
    })
  })
})
