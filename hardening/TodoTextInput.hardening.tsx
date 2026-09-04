import { screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import TodoTextInput from '../src/components/TodoTextInput.tsx'
import { pressEnter, renderComponent } from '../src/test-render.tsx'

// The field trims what it saves, and the spec suite never submits text with
// whitespace around it, so nothing says the trim happens. It is not cosmetic:
// `Header` and `TodoItem` both decide whether a todo exists from the length of
// what this hands them, so an untrimmed blank string would create a todo with
// no text and an untrimmed edit would refuse to delete one.
const savedFrom = async (typed: string, newTodo: boolean) => {
  const onSave = vi.fn()
  const { user } = renderComponent(<TodoTextInput onSave={onSave} newTodo={newTodo} />)
  const field = screen.getByRole('textbox')
  await user.type(field, typed)
  pressEnter(field)
  return onSave
}

// The field is what the user types into the moment it appears - a new-todo
// field on the page, an edit field on the row just double-clicked - so it takes
// the focus itself. Nothing in the spec suite looks at where the cursor is.
describe('where the cursor goes when the field appears', () => {
  test('the field has the focus', () => {
    renderComponent(<TodoTextInput onSave={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('textbox'))
  })
})

// Only the new-todo field empties itself after a submit: it stays on the page
// ready for the next todo. An edit field keeps what it holds, and whether it
// stays on the page at all is the caller's decision, not the field's.
describe('what the field holds after a submit', () => {
  test('the new-todo field is empty, ready for the next todo', async () => {
    const { user } = renderComponent(<TodoTextInput onSave={vi.fn()} newTodo />)
    await user.type(screen.getByRole('textbox'), 'Use Redux')
    pressEnter(screen.getByRole('textbox'))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  test('an edit field still holds the text that was submitted', async () => {
    const { user } = renderComponent(<TodoTextInput onSave={vi.fn()} editing />)
    await user.type(screen.getByRole('textbox'), 'Use Redux')
    pressEnter(screen.getByRole('textbox'))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Use Redux')
  })
})

describe('what the field saves', () => {
  test('the text without the whitespace around it', async () => {
    expect(await savedFrom('  Use Redux  ', true)).toHaveBeenCalledWith('Use Redux')
  })

  test('nothing but whitespace saves the empty string, which is how a caller refuses it', async () => {
    expect(await savedFrom('   ', false)).toHaveBeenCalledWith('')
  })
})
