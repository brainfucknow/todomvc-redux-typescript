import { fireEvent } from '@testing-library/react'

// Carries every field a real keyboard sends, so a test using it cannot tell a
// `key`-reading component from a `which`-reading one - only TodoTextInput.spec.tsx can.
export const pressReturn = (input: HTMLInputElement) =>
  fireEvent.keyDown(input, {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
  })
