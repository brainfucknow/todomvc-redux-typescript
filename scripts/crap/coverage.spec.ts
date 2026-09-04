// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mergeReports, type CoverageReport } from './coverage.ts'

const at = (line: number) => ({
  start: { line, column: 0 },
  end: { line, column: 10 },
})

const report = (filePath: string, statements: Record<string, [number, number]>): CoverageReport => ({
  [filePath]: {
    statementMap: Object.fromEntries(
      Object.entries(statements).map(([id, [line]]) => [id, at(line)]),
    ),
    s: Object.fromEntries(Object.entries(statements).map(([id, [, hits]]) => [id, hits])),
  },
})

describe('mergeReports', () => {
  it('reads a statement and its hit count out of one report', () => {
    expect(mergeReports([report('a.ts', { 0: [3, 7] })])).toEqual([
      { filePath: 'a.ts', statements: [{ ...at(3), hits: 7 }] },
    ])
  })

  it('counts a statement as covered when any tier covered it', () => {
    const merged = mergeReports([
      report('a.ts', { 0: [3, 0] }),
      report('a.ts', { 0: [3, 4] }),
    ])
    expect(merged).toEqual([{ filePath: 'a.ts', statements: [{ ...at(3), hits: 4 }] }])
  })

  it('sums the hits a statement took across the tiers', () => {
    const merged = mergeReports([
      report('a.ts', { 0: [3, 2] }),
      report('a.ts', { 0: [3, 5] }),
    ])
    expect(merged[0].statements[0].hits).toBe(7)
  })

  it('leaves a statement no tier reached at zero', () => {
    const merged = mergeReports([
      report('a.ts', { 0: [3, 0] }),
      report('a.ts', { 0: [3, 0] }),
    ])
    expect(merged[0].statements[0].hits).toBe(0)
  })

  it('identifies a statement by its location, since istanbul numbers ids per report', () => {
    const merged = mergeReports([
      report('a.ts', { 0: [3, 1] }),
      report('a.ts', { 9: [3, 1] }),
    ])
    expect(merged[0].statements).toHaveLength(1)
  })

  it('keeps statements at different locations apart', () => {
    const merged = mergeReports([report('a.ts', { 0: [3, 1], 1: [4, 0] })])
    expect(merged[0].statements).toEqual([{ ...at(3), hits: 1 }, { ...at(4), hits: 0 }])
  })

  it('keeps a file only one tier measured', () => {
    const merged = mergeReports([report('a.ts', { 0: [1, 1] }), report('b.ts', { 0: [1, 1] })])
    expect(merged.map((entry) => entry.filePath)).toEqual(['a.ts', 'b.ts'])
  })

  it('reports nothing when no tier measured anything', () => {
    expect(mergeReports([{}, {}])).toEqual([])
  })
})
