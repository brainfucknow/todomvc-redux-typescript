import { fireEvent } from '@testing-library/react'

export const pressReturn = (input: HTMLInputElement) =>
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 })
