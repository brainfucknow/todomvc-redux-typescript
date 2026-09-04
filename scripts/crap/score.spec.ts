// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { FunctionComplexity } from './complexity.ts'
import type { Statement } from './coverage.ts'
import { scoreFunctions } from './score.ts'

const spanning = (
  name: string,
  complexity: number,
  fromLine: number,
  toLine: number,
): FunctionComplexity => ({
  name,
  complexity,
  span: { start: { line: fromLine, column: 0 }, end: { line: toLine, column: 80 } },
})

const statement = (line: number, hits: number): Statement => ({
  start: { line, column: 2 },
  end: { line, column: 20 },
  hits,
})

const scoreOf = (name: string, functions: FunctionComplexity[], statements: Statement[]) => {
  const found = scoreFunctions(functions, statements).find((entry) => entry.name === name)
  expect(found).toBeDefined()
  return found as { coverage: number; crap: number; complexity: number; line: number }
}

describe('scoreFunctions', () => {
  const subject = [spanning('subject', 4, 1, 9)]

  it('scores a fully covered function at its complexity: the risk term falls away', () => {
    expect(scoreOf('subject', subject, [statement(2, 1), statement(3, 6)]).crap).toBe(4)
  })

  it('scores an uncovered function at cc^2 + cc', () => {
    expect(scoreOf('subject', subject, [statement(2, 0), statement(3, 0)]).crap).toBe(20)
  })

  it('scores a half-covered function between the two', () => {
    const half = scoreOf('subject', subject, [statement(2, 1), statement(3, 0)])
    expect(half.coverage).toBe(0.5)
    expect(half.crap).toBe(6)
  })

  it('counts a statement as covered on any hit at all', () => {
    expect(scoreOf('subject', subject, [statement(2, 1)]).coverage).toBe(1)
  })

  it('scores a function holding no measured statement as covered', () => {
    expect(scoreOf('subject', subject, []).coverage).toBe(1)
  })

  it('reports the line the function starts on', () => {
    expect(scoreOf('subject', subject, []).line).toBe(1)
  })

  it('carries the complexity it was given', () => {
    expect(scoreOf('subject', subject, []).complexity).toBe(4)
  })

  it('crosses the default gate only when complexity and missing coverage meet', () => {
    expect(scoreOf('subject', [spanning('subject', 13, 1, 9)], [statement(2, 1)]).crap).toBe(13)
    expect(scoreOf('subject', [spanning('subject', 3, 1, 9)], [statement(2, 0)]).crap).toBe(12)
  })
})

describe('which function a statement counts towards', () => {
  const nested = [
    spanning('(module)', 1, 1, 20),
    spanning('outer', 2, 3, 12),
    spanning('inner', 2, 5, 8),
  ]

  it('charges it to the innermost function containing it', () => {
    const scored = scoreFunctions(nested, [statement(6, 0)])
    expect(scored.map((entry) => entry.coverage)).toEqual([1, 1, 0])
  })

  it('charges a statement outside the inner function to the one that holds it', () => {
    const scored = scoreFunctions(nested, [statement(10, 0)])
    expect(scored.map((entry) => entry.coverage)).toEqual([1, 0, 1])
  })

  it('charges top-level code to the module scope', () => {
    const scored = scoreFunctions(nested, [statement(15, 0)])
    expect(scored.map((entry) => entry.coverage)).toEqual([0, 1, 1])
  })

  it('drops a statement no function contains rather than failing', () => {
    expect(scoreFunctions([], [statement(4, 1)])).toEqual([])
  })
})
