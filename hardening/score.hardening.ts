import { describe, expect, test } from 'vitest'
import type { FunctionComplexity, Position } from '../scripts/crap/complexity.ts'
import type { Statement } from '../scripts/crap/coverage.ts'
import { scoreFunctions } from '../scripts/crap/score.ts'

const spanning = (name: string, start: Position, end: Position): FunctionComplexity =>
  ({ name, span: { start, end }, complexity: 1 })

// Only a statement's start position decides which function it belongs to, and
// only whether it was hit decides the score, so an unhit statement placed at a
// position is the sharpest way to ask "which function owns this position?".
const unhitAt = (line: number, column: number): Statement =>
  ({ start: { line, column }, end: { line, column }, hits: 0 })

const coverageOf = (functions: FunctionComplexity[], statements: Statement[], name: string): number =>
  scoreFunctions(functions, statements).find((entry) => entry.name === name)?.coverage ?? Number.NaN

// A function that was charged the unhit statement scores 0 coverage; one that
// was not holds no measured statement at all and scores 1. Nothing in between
// is reachable with a single statement, so the two answers name the boundary
// exactly.
const CHARGED = 0
const NOT_CHARGED = 1

// The span a function occupies is half-open in neither direction: it runs from
// the first character of the function to its last, both included. Every
// example-based test places statements comfortably inside a function, which is
// the one region where every plausible boundary rule agrees.
describe('which positions a function span holds', () => {
  const subject = [spanning('f', { line: 5, column: 10 }, { line: 9, column: 20 })]
  const holds = (line: number, column: number): number =>
    coverageOf(subject, [unhitAt(line, column)], 'f')

  test('the first character of the function is inside it', () => {
    expect(holds(5, 10)).toBe(CHARGED)
  })

  test('the character before it on the same line is outside', () => {
    expect(holds(5, 9)).toBe(NOT_CHARGED)
  })

  test('an earlier line is outside, however far along that line it sits', () => {
    expect(holds(4, 50)).toBe(NOT_CHARGED)
  })

  test('the last character of the function is inside it', () => {
    expect(holds(9, 20)).toBe(CHARGED)
  })

  test('the character before the last, on the closing line, is inside', () => {
    expect(holds(9, 19)).toBe(CHARGED)
  })

  test('the character after the last, on the closing line, is outside', () => {
    expect(holds(9, 21)).toBe(NOT_CHARGED)
  })

  test('a line between the two is inside, at any column', () => {
    expect(holds(7, 0)).toBe(CHARGED)
  })

  test('a later line is outside', () => {
    expect(holds(10, 0)).toBe(NOT_CHARGED)
  })
})

// A nested function is contained by the one around it, so both hold the
// statement and the tie is broken by size. Ordering spans by size is only
// correct if a longer span is never called smaller, whatever shape the two
// spans have - and three shapes tell the plausible size rules apart.
describe('which of two containing functions is the innermost', () => {
  const charged = (functions: FunctionComplexity[], line: number, column: number): string[] =>
    scoreFunctions(functions, [unhitAt(line, column)])
      .filter((entry) => entry.coverage === CHARGED)
      .map((entry) => entry.name)

  test('two spans on one line are ordered by where they end', () => {
    expect(charged([
      spanning('outer', { line: 1, column: 0 }, { line: 1, column: 60 }),
      spanning('inner', { line: 1, column: 20 }, { line: 1, column: 40 }),
    ], 1, 25)).toEqual(['inner'])
  })

  test('a short span ending far along its line is smaller than a tall span ending at column 1', () => {
    expect(charged([
      spanning('outer', { line: 1, column: 0 }, { line: 4, column: 1 }),
      spanning('inner', { line: 2, column: 2 }, { line: 2, column: 40 }),
    ], 2, 10)).toEqual(['inner'])
  })

  test('a span is measured by the lines it covers, not by how far down the file it sits', () => {
    expect(charged([
      spanning('outer', { line: 1, column: 0 }, { line: 10, column: 1 }),
      spanning('inner', { line: 8, column: 2 }, { line: 9, column: 3 }),
    ], 8, 5)).toEqual(['inner'])
  })
})
