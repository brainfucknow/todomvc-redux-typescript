// The gate's verdict, over reports nobody wrote down. `report.spec.ts` fixes
// the row format and the worked ordering by example; these say the counting and
// the ordering hold whatever the run measured, which is what makes the number
// later tasks are judged on trustworthy.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Options } from '../scripts/crap/options.ts'
import { gateReport, type MeasuredFile } from '../scripts/crap/report.ts'

const scored = fc.record({
  name: fc.stringMatching(/^[a-z][a-zA-Z]{0,12}$/),
  line: fc.integer({ min: 1, max: 400 }),
  complexity: fc.integer({ min: 1, max: 20 }),
  coverage: fc.double({ min: 0, max: 1, noNaN: true }),
  // Small integers as well as arbitrary scores, so a run lands on the gate
  // exactly often enough to say which side of it the boundary falls.
  crap: fc.oneof(fc.integer({ min: 0, max: 20 }), fc.double({ min: 1, max: 400, noNaN: true })),
})

const measured: fc.Arbitrary<MeasuredFile[]> = fc.uniqueArray(
  fc.record({
    file: fc.stringMatching(/^[a-z]{1,6}\/[a-z]{1,8}\.ts$/),
    functions: fc.array(scored, { maxLength: 5 }),
  }),
  { minLength: 1, maxLength: 5, selector: (entry) => entry.file },
)

const gate = fc.integer({ min: 0, max: 20 })

const asked = (options: Partial<Options> = {}): Options =>
  ({ max: 10, reuse: false, all: false, paths: [], ...options })

const rows = (lines: string[]): string[] => lines.slice(0, -1)
const summary = (lines: string[]): string => lines[lines.length - 1]
const allFunctions = (files: MeasuredFile[]): number =>
  files.reduce((total, entry) => total + entry.functions.length, 0)

describe('gateReport', () => {
  it('counts exactly the functions whose score is above the gate', () => {
    fc.assert(fc.property(measured, gate, (files, max) => {
      const expected = files
        .flatMap((entry) => entry.functions)
        .filter((entry) => entry.crap > max).length
      expect(gateReport(files, asked({ max }), ['unit']).overGate).toBe(expected)
    }))
  })

  it('raising the gate can never find more offenders', () => {
    fc.assert(fc.property(measured, gate, fc.nat(100), (files, max, raise) => {
      const stricter = gateReport(files, asked({ max }), ['unit']).overGate
      const looser = gateReport(files, asked({ max: max + raise }), ['unit']).overGate
      expect(looser).toBeLessThanOrEqual(stricter)
    }))
  })

  it('lists one row per offender, and one per function when all were asked for', () => {
    fc.assert(fc.property(measured, gate, (files, max) => {
      const report = gateReport(files, asked({ max }), ['unit'])
      expect(rows(report.lines)).toHaveLength(report.overGate)
      expect(rows(gateReport(files, asked({ max, all: true }), ['unit']).lines))
        .toHaveLength(allFunctions(files))
    }))
  })

  it('accounts for every measured function in the summary, listed or not', () => {
    fc.assert(fc.property(measured, gate, (files, max) => {
      expect(summary(gateReport(files, asked({ max }), ['unit']).lines))
        .toContain(`functions: ${allFunctions(files)}`)
    }))
  })

  it('reads files in path order, whatever order they were measured in', () => {
    fc.assert(fc.property(measured, (files) => {
      const paths = (input: MeasuredFile[]): string[] =>
        rows(gateReport(input, asked({ max: 0, all: true }), ['unit']).lines)
          .map((row) => row.trim().split(':')[0])
      fc.pre(allFunctions(files) > 0)
      expect(paths([...files].reverse())).toEqual(paths(files))
    }))
  })

  it('reads functions worst first within a file', () => {
    fc.assert(fc.property(measured, (files) => {
      fc.pre(allFunctions(files) > 0)
      const scores = rows(gateReport(files, asked({ max: 0, all: true }), ['unit']).lines)
        .map((row) => Number(row.slice(row.lastIndexOf('crap') + 4)))
      const perFile = files
        .filter((entry) => entry.functions.length > 0)
        .sort((left, right) => left.file.localeCompare(right.file))
        .flatMap((entry) => [...entry.functions]
          .sort((left, right) => right.crap - left.crap)
          .map((entry) => Number(entry.crap.toFixed(1))))
      expect(scores).toEqual(perFile)
    }))
  })

  it('refuses a run that measured nothing the caller asked about', () => {
    fc.assert(fc.property(measured, fc.stringMatching(/^[A-Z]{1,6}$/), (files, elsewhere) => {
      expect(() => gateReport(files, asked({ paths: [elsewhere] }), ['unit']))
        .toThrow(`no measured files under ${elsewhere}`)
    }))
  })
})
