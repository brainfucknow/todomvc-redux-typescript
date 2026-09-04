// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Options } from './options.ts'
import { gateReport, type MeasuredFile } from './report.ts'
import type { FunctionScore } from './score.ts'

const scored = (name: string, crap: number): FunctionScore =>
  ({ name, line: 1, complexity: 2, coverage: 0.5, crap })

const asked = (options: Partial<Options> = {}): Options =>
  ({ max: 10, reuse: false, all: false, paths: [], ...options })

const measured: MeasuredFile[] = [
  { file: 'src/b.ts', functions: [scored('mild', 3), scored('worst', 40)] },
  { file: 'acceptance/a.ts', functions: [scored('over', 11), scored('at the gate', 10)] },
]

const rowsOf = (report: { lines: string[] }): string[] => report.lines.slice(0, -1)
const summaryOf = (report: { lines: string[] }): string => report.lines[report.lines.length - 1]

describe('gateReport', () => {
  it('lists only the functions over the gate', () => {
    expect(rowsOf(gateReport(measured, asked(), ['unit']))).toHaveLength(2)
  })

  it('leaves a function exactly at the gate alone: the gate is <=', () => {
    expect(rowsOf(gateReport(measured, asked(), ['unit'])).join('\n')).not.toContain('at the gate')
  })

  it('lists every function when asked for all of them', () => {
    expect(rowsOf(gateReport(measured, asked({ all: true }), ['unit']))).toHaveLength(4)
  })

  it('reads files in path order and functions worst first', () => {
    const names = rowsOf(gateReport(measured, asked({ all: true }), ['unit']))
      .map((row) => row.trim().split(/\s{2,}/)[1])
    expect(names).toEqual(['over', 'at the gate', 'worst', 'mild'])
  })

  it('names the file, the line, the complexity, the coverage and the score on a row', () => {
    const [row] = rowsOf(gateReport(measured, asked(), ['unit']))
    expect(row).toContain('acceptance/a.ts:1')
    expect(row).toContain('over')
    expect(row).toContain('cc   2')
    expect(row).toContain('cov  50%')
    expect(row).toContain('crap    11.0')
  })

  it('counts the functions over the gate', () => {
    expect(gateReport(measured, asked(), ['unit']).overGate).toBe(2)
  })

  it('reports nothing over the gate when the gate is wide enough', () => {
    const report = gateReport(measured, asked({ max: 100 }), ['unit'])
    expect(report.overGate).toBe(0)
    expect(rowsOf(report)).toEqual([])
  })

  it('summarises the gate, the tiers it merged, and what it measured', () => {
    expect(summaryOf(gateReport(measured, asked(), ['unit', 'property']))).toBe(
      '\ngate CRAP <= 10 | tiers: unit + property | files: 2 | functions: 4 | over the gate: 2',
    )
  })

  it('measures only the files under the paths it was given', () => {
    const report = gateReport(measured, asked({ paths: ['acceptance'] }), ['unit'])
    expect(report.overGate).toBe(1)
    expect(summaryOf(report)).toContain('files: 1 | functions: 2')
  })

  it('refuses a path it measured nothing under, naming the path', () => {
    expect(() => gateReport(measured, asked({ paths: ['property'] }), ['unit']))
      .toThrow('no measured files under property')
  })

  it('refuses an empty project rather than reporting a clean run', () => {
    expect(() => gateReport([], asked(), ['unit'])).toThrow('no measured files under the project')
  })
})
