import { fireEvent } from '@testing-library/react'

/**
 * An Enter as a real keyboard sends it: the name, the physical code and both
 * legacy numbers, which is also what Playwright's `press('Enter')` produces.
 * That is deliberately more than any component needs, so that a caller pressing
 * Enter is not also asserting which field of the event is read.
 *
 * The cost is that no test using this helper can tell a `key`-reading component
 * from a `which`-reading one - a mutation of that reading survived the whole
 * net, unit and browser alike. `src/components/TodoTextInput.spec.tsx` makes
 * that claim on its own, with two events a real keyboard never produces; keep
 * it there rather than narrowing this helper for its other callers.
 */
export const pressReturn = (input: HTMLInputElement) =>
  fireEvent.keyDown(input, {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
  })
