import { describe, expect, test, vi } from 'vitest'
import Footer from '../src/components/Footer.tsx'
import type { FooterProps } from '../src/components/Footer.tsx'
import TodoItem from '../src/components/TodoItem.tsx'
import type { TodoItemProps } from '../src/components/TodoItem.tsx'
import TodoTextInput from '../src/components/TodoTextInput.tsx'
import type { TodoTextInputProps } from '../src/components/TodoTextInput.tsx'
import { insideList, renderComponent, renderWithStore } from '../src/test-render.tsx'

// Three components declare a runtime prop contract with `prop-types`, and
// mutation found that nothing holds them to it: emptying any of the three
// declarations leaves every other test in the project green. A contract is
// what tells a caller it passed the wrong thing, and one that has stopped
// complaining has stopped being a contract - which is the state the project
// would be in without noticing.
//
// The wrong value each test passes is one the render never dereferences, so
// what the assertion reads is the contract complaining and not a crash.
//
// PLAN.md section 3 removes `prop-types` in task 05. These three go with it.
const complaintFrom = (mount: () => void): string => {
  const complaints = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    mount()
    return complaints.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
  } finally {
    complaints.mockRestore()
  }
}

const activeTodo = { id: 0, text: 'Use Redux', completed: false }

describe('the prop contracts the components declare', () => {
  test('the footer refuses a count that is not a number', () => {
    const complaint = complaintFrom(() => renderWithStore(
      <Footer {...({ activeCount: '1', completedCount: 0, onClearCompleted: vi.fn() } as unknown as FooterProps)} />,
    ))
    expect(complaint).toContain('Invalid prop `activeCount` of type `string` supplied to `Footer`')
  })

  test('a todo row refuses an editor that is not a function', () => {
    const complaint = complaintFrom(() => renderComponent(
      <TodoItem {...({
        todo: activeTodo,
        editTodo: 7,
        deleteTodo: vi.fn(),
        completeTodo: vi.fn(),
      } as unknown as TodoItemProps)} />,
      { wrapper: insideList },
    ))
    expect(complaint).toContain('Invalid prop `editTodo` of type `number` supplied to `TodoItem`')
  })

  test('the text field refuses text that is not a string', () => {
    const complaint = complaintFrom(() => renderComponent(
      <TodoTextInput {...({ onSave: vi.fn(), text: 7 } as unknown as TodoTextInputProps)} />,
    ))
    expect(complaint).toContain('Invalid prop `text` of type `number` supplied to `TodoTextInput`')
  })
})
