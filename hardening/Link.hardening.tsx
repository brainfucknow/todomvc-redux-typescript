import { describe, expect, test, vi } from 'vitest'
import Link from '../src/components/Link.tsx'
import { rootOf } from '../src/test-queries.ts'
import { renderComponent } from '../src/test-render.tsx'

// The class is the whole of what `active` decides. The spec suite renders the
// active link and reads `selected` off it; a rendering that always said
// `selected` would pass that and change what every filter but one looks like.
const classOfLink = (active: boolean): string =>
  rootOf(renderComponent(<Link active={active} setFilter={vi.fn()}>All</Link>)).className

describe('what marks a filter link as the chosen one', () => {
  test('the link for the filter in force carries selected', () => {
    expect(classOfLink(true)).toBe('selected')
  })

  test('a link for any other filter carries no class at all', () => {
    expect(classOfLink(false)).toBe('')
  })
})
