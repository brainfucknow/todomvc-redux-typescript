import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { CoverageReport, Statement } from '../scripts/crap/coverage.ts'
import { mergeReports } from '../scripts/crap/coverage.ts'

const filePath = fc.stringMatching(/^\/project\/[a-z]{1,6}\.ts$/)

const location = fc.record({ line: fc.integer({ min: 1, max: 40 }), column: fc.nat(20) })
  .map((start) => ({ start, end: { line: start.line, column: start.column + 5 } }))

const locations = fc.uniqueArray(location, {
  minLength: 1,
  maxLength: 5,
  selector: ({ start }) => `${start.line}:${start.column}`,
})

// Istanbul numbers statements per report, so a report of the same file can
// carry the same locations under different ids. `offset` is what makes two
// reports of one file disagree about the numbering.
const reportOf = (files: { filePath: string; statements: Statement[] }[], offset: number): CoverageReport =>
  Object.fromEntries(files.map(({ filePath: path, statements }) => [path, {
    statementMap: Object.fromEntries(statements.map(({ start, end }, index) => [`${index + offset}`, { start, end }])),
    s: Object.fromEntries(statements.map(({ hits }, index) => [`${index + offset}`, hits])),
  }]))

const hitsOf = (statements: Statement[]): Map<string, number> =>
  new Map(statements.map((statement) => [`${statement.start.line}:${statement.start.column}`, statement.hits]))

const tierRuns = filePath.chain((path) => locations.chain((spans) => fc
  .array(fc.array(fc.nat(3), { minLength: spans.length, maxLength: spans.length }), { minLength: 1, maxLength: 4 })
  .map((runs) => ({
    path,
    spans,
    reports: runs.map((hits, tier) => reportOf(
      [{ filePath: path, statements: spans.map((span, index) => ({ ...span, hits: hits[index] })) }],
      tier * 100,
    )),
    hits: runs,
  }))))

describe('mergeReports', () => {
  it('sums what the tiers recorded for a statement, whatever id each gave it', () => {
    fc.assert(fc.property(tierRuns, ({ path, spans, reports, hits }) => {
      const [merged, ...rest] = mergeReports(reports)
      expect(rest).toEqual([])
      expect(merged.filePath).toBe(path)
      const recorded = hitsOf(merged.statements)
      spans.forEach((span, index) => {
        const total = hits.reduce((sum, run) => sum + run[index], 0)
        expect(recorded.get(`${span.start.line}:${span.start.column}`)).toBe(total)
      })
    }))
  })

  it('counts a statement as reached when any tier reached it', () => {
    fc.assert(fc.property(tierRuns, ({ spans, reports, hits }) => {
      const recorded = hitsOf(mergeReports(reports)[0].statements)
      spans.forEach((span, index) => {
        const reached = hits.some((run) => run[index] > 0)
        expect(recorded.get(`${span.start.line}:${span.start.column}`)! > 0).toBe(reached)
      })
    }))
  })

  it('gives the same answer whichever order the tiers ran in', () => {
    fc.assert(fc.property(tierRuns, ({ reports }) => {
      const forwards = hitsOf(mergeReports(reports)[0].statements)
      const backwards = hitsOf(mergeReports([...reports].reverse())[0].statements)
      expect([...backwards].sort()).toEqual([...forwards].sort())
    }))
  })

  it('hands a single report back unchanged, one statement per location', () => {
    fc.assert(fc.property(tierRuns, ({ spans, reports, hits }) => {
      const [merged] = mergeReports([reports[0]])
      expect(merged.statements).toHaveLength(spans.length)
      expect(hitsOf(merged.statements)).toEqual(hitsOf(spans.map((span, index) => ({ ...span, hits: hits[0][index] }))))
    }))
  })

  it('reports every file any tier measured, and no other', () => {
    fc.assert(fc.property(fc.uniqueArray(filePath, { minLength: 1, maxLength: 4 }), locations, (paths, spans) => {
      const statements = spans.map((span) => ({ ...span, hits: 1 }))
      const reports = paths.map((path, index) => reportOf([{ filePath: path, statements }], index))
      expect(mergeReports(reports).map((file) => file.filePath).sort()).toEqual([...paths].sort())
    }))
  })
})
