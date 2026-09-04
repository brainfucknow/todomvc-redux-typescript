import { describe, expect, test, vi } from 'vitest'
import Footer from '../src/components/Footer.tsx'
import type { FooterProps } from '../src/components/Footer.tsx'
import { countText, rootOf } from '../src/test-queries.ts'
import { renderWithStore } from '../src/test-render.tsx'

// The footer picks its noun from `activeCount === 1`, and the spec suite asks
// it for 0 and for 1: both of them below the boundary or on it, neither above.
// A branch nothing ever takes is a branch nothing can report on.
const countFor = (activeCount: number): string | undefined => {
  const props: FooterProps = { activeCount, completedCount: 0, onClearCompleted: vi.fn() }
  return countText(rootOf(renderWithStore(<Footer {...props} />)))
}

describe('the word the footer counts todos in', () => {
  test('two active todos read as items', () => {
    expect(countFor(2)).toBe('2 items left')
  })

  test('a count far above the boundary reads the same way', () => {
    expect(countFor(11)).toBe('11 items left')
  })
})
