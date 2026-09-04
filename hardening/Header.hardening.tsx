import { screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import Header from '../src/components/Header.tsx'
import { pressEnter, renderComponent } from '../src/test-render.tsx'

// `Header` rejects a todo by length, and the field trims before it hands the
// text over, so what reaches the length check is never what was typed. Only
// text that is blank without being empty tells the two apart: the spec suite
// submits an empty field, which is rejected whether the trim happens or not.
const submit = async (typed: string) => {
  const addTodo = vi.fn()
  const { user } = renderComponent(<Header addTodo={addTodo} />)
  const field = screen.getByPlaceholderText('What needs to be done?')
  await user.type(field, typed)
  pressEnter(field)
  return addTodo
}

describe('what the header accepts as a todo', () => {
  test('a field holding only spaces adds nothing', async () => {
    expect(await submit('   ')).not.toHaveBeenCalled()
  })

  test('text with spaces around it is added without them', async () => {
    expect(await submit('  Use Redux  ')).toHaveBeenCalledWith('Use Redux')
  })
})
