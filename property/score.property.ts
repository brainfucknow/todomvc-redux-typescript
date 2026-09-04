import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { FunctionComplexity, Span } from '../scripts/crap/complexity.ts'
import type { Statement } from '../scripts/crap/coverage.ts'
import { scoreFunctions } from '../scripts/crap/score.ts'

const span = (startLine: number, endLine: number): Span => ({
  start: { line: startLine, column: 0 },
  end: { line: endLine, column: 80 },
})

const measured = (complexity: number, from = 1, to = 100): FunctionComplexity =>
  ({ name: 'measured', span: span(from, to), complexity })

const statementsAt = (lines: number[], hits: number[]): Statement[] =>
  lines.map((line, index) => ({ start: { line, column: 2 }, end: { line, column: 20 }, hits: hits[index] }))

const complexity = fc.integer({ min: 1, max: 20 })
const runs = fc.array(fc.nat(3), { minLength: 1, maxLength: 8 })
const linesFor = (hits: number[]): number[] => hits.map((_, index) => index + 2)

describe('scoreFunctions', () => {
  it('is the CRAP formula over the statements the function holds', () => {
    fc.assert(fc.property(complexity, runs, (cc, hits) => {
      const [scored] = scoreFunctions([measured(cc)], statementsAt(linesFor(hits), hits))
      const coverage = hits.filter((count) => count > 0).length / hits.length
      expect(scored.coverage).toBeCloseTo(coverage, 10)
      expect(scored.crap).toBeCloseTo(cc ** 2 * (1 - coverage) ** 3 + cc, 10)
    }))
  })

  it('scores a fully covered function at its complexity, and an untouched one at cc squared plus cc', () => {
    fc.assert(fc.property(complexity, runs, (cc, hits) => {
      const lines = linesFor(hits)
      const covered = scoreFunctions([measured(cc)], statementsAt(lines, hits.map(() => 1)))[0]
      expect(covered.crap).toBeCloseTo(cc, 10)
      const untouched = scoreFunctions([measured(cc)], statementsAt(lines, hits.map(() => 0)))[0]
      expect(untouched.crap).toBeCloseTo(cc ** 2 + cc, 10)
    }))
  })

  it('never scores a function worse for having covered one more statement', () => {
    fc.assert(fc.property(complexity, runs, fc.nat(7), (cc, hits, pick) => {
      const lines = linesFor(hits)
      const index = pick % hits.length
      fc.pre(hits[index] === 0)
      const before = scoreFunctions([measured(cc)], statementsAt(lines, hits))[0]
      const after = scoreFunctions([measured(cc)],
        statementsAt(lines, hits.map((count, at) => (at === index ? 1 : count))))[0]
      expect(after.crap).toBeLessThanOrEqual(before.crap)
    }))
  })

  it('scores a function holding no measured statement as covered', () => {
    fc.assert(fc.property(complexity, runs, (cc, hits) => {
      const elsewhere = statementsAt(linesFor(hits).map((line) => line + 1000), hits)
      const [scored] = scoreFunctions([measured(cc, 1, 100)], elsewhere)
      expect(scored.coverage).toBe(1)
      expect(scored.crap).toBe(cc)
    }))
  })

  it('charges a statement to the innermost function containing it', () => {
    fc.assert(fc.property(complexity, complexity, (outer, inner) => {
      const scored = scoreFunctions([
        { name: 'outer', span: span(1, 100), complexity: outer },
        { name: 'inner', span: span(10, 20), complexity: inner },
      ], statementsAt([15], [0]))
      expect(scored.find((entry) => entry.name === 'inner')?.coverage).toBe(0)
      expect(scored.find((entry) => entry.name === 'outer')?.coverage).toBe(1)
    }))
  })

  it('reports every function it was given, at the line it starts on', () => {
    fc.assert(fc.property(fc.array(complexity, { minLength: 1, maxLength: 5 }), runs, (complexities, hits) => {
      const functions = complexities.map((cc, index) => ({
        name: `f${index}`,
        span: span(index * 200 + 1, index * 200 + 100),
        complexity: cc,
      }))
      const scored = scoreFunctions(functions, statementsAt(linesFor(hits), hits))
      expect(scored.map((entry) => entry.name)).toEqual(functions.map((entry) => entry.name))
      expect(scored.map((entry) => entry.line)).toEqual(functions.map((entry) => entry.span.start.line))
    }))
  })
})
