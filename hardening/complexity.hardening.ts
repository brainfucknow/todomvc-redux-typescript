import { describe, expect, test } from 'vitest'
import { MODULE_SCOPE, complexityByFunction } from '../scripts/crap/complexity.ts'

const namesIn = (fileName: string, text: string): string[] =>
  complexityByFunction(fileName, text).map((entry) => entry.name)

// Two decisions in this module survive every example that only counts
// functions and decision points, because both of them change what a name or a
// parse says rather than how many there are.
describe('what the gate calls code that is in no function', () => {
  // The label is printed in the gate's own report, beside real function names,
  // and it is the only thing telling a reader that a row is module-level code.
  // An empty or blank label prints an empty column and still scores.
  test('module-level code is reported under the label (module)', () => {
    expect(MODULE_SCOPE).toBe('(module)')
  })

  test('the label names the scope the gate reports for a file with no function', () => {
    expect(namesIn('m.ts', 'export const answer = 42\n')).toEqual([MODULE_SCOPE])
  })

  test('the label is not a name a function could be reported under', () => {
    expect(namesIn('m.ts', 'export function answer() { return 42 }\n'))
      .toEqual([MODULE_SCOPE, 'answer'])
  })
})

// `<T>(value: T) => value` is a generic arrow function in TypeScript and the
// start of a JSX element in TSX, so the extension the parser is told about
// decides whether the gate sees a function there at all. Getting it wrong
// costs functions silently: they are not scored, and nothing else notices.
describe('which parser a file gets, read off its extension', () => {
  const genericArrow = 'export const identity = <T>(value: T) => value\n'

  test('a .ts file parses a generic arrow as a function', () => {
    expect(namesIn('m.ts', genericArrow)).toEqual([MODULE_SCOPE, 'identity'])
  })

  test('a .tsx file reads the same text as JSX and finds no function in it', () => {
    expect(namesIn('m.tsx', genericArrow)).toEqual([MODULE_SCOPE])
  })

  test('a .tsx file parses a component that returns JSX', () => {
    expect(namesIn('m.tsx', 'export const View = () => <div id="a" />\n'))
      .toEqual([MODULE_SCOPE, 'View'])
  })
})
