import { describe, expect, test } from 'vitest'
import type { Options } from '../scripts/crap/options.ts'
import { gateReport, type MeasuredFile } from '../scripts/crap/report.ts'
import type { FunctionScore } from '../scripts/crap/score.ts'

const asked = (options: Partial<Options> = {}): Options =>
  ({ max: 10, reuse: false, all: false, paths: [], ...options })

const scored = (name: string): FunctionScore =>
  ({ name, line: 1, complexity: 2, coverage: 0.5, crap: 40 })

const rowsOf = (lines: string[]): string[] => lines.slice(0, -1)

// This module's output is read by a person, so the separators are behaviour and
// not decoration. Every column is padded to a width, which means a value that
// fills its column is exactly the case where a missing separator runs two
// values together - and exactly the case a report of short names never shows.
describe('a row keeps its columns apart even when the values fill them', () => {
  const file = 'a'.repeat(50)
  const name = 'n'.repeat(24)
  const row = rowsOf(gateReport(
    [{ file, functions: [scored(name)] }] satisfies MeasuredFile[],
    asked(),
    ['unit'],
  ).lines)[0]

  test('the location and the name are separated', () => {
    expect(row).toContain(`${file}:1  ${name}`)
  })

  test('the name and the complexity are separated', () => {
    expect(row).toContain(`${name}  cc`)
  })

  test('the whole row reads as five columns with a two-space gutter between them', () => {
    expect(row).toBe(`${file}:1  ${name}  cc   2  cov  50%  crap    40.0`)
  })
})

// The gate refuses a path argument that matched nothing, and the message is the
// only place the caller learns which paths it asked about.
describe('the refusal names every path it was asked about', () => {
  const measured: MeasuredFile[] = [{ file: 'src/a.ts', functions: [scored('f')] }]

  test('several paths are listed, separated, in the order they were given', () => {
    expect(() => gateReport(measured, asked({ paths: ['property', 'hardening'] }), ['unit']))
      .toThrow('no measured files under property, hardening')
  })
})
