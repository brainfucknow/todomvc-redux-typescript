import { describe, expect, it } from 'vitest'
import {
  classifyRun,
  readRunReport,
  timeoutMilliseconds,
} from '../scripts/acceptance/runner-protocol.mjs'

// Guards nothing drove, in the module that decides whether a mutation was killed: a
// hole here is a hole in every mutation score this project reports.

/** @see readRunReport - a half-read report must be no report, never a result. */
describe('a report that parses but is not a report', () => {
  it('reports nothing for JSON that is not an object at all', () => {
    expect(readRunReport('null')).toBeUndefined()
    expect(readRunReport('42')).toBeUndefined()
    expect(readRunReport('"done"')).toBeUndefined()
  })

  it('reports nothing when the failure count is missing', () => {
    expect(
      readRunReport('{"numTotalTests":30,"testResults":[{},{},{}]}'),
    ).toBeUndefined()
  })

  it('reports nothing when the files it ran are not a list', () => {
    expect(
      readRunReport('{"numTotalTests":30,"numFailedTests":3,"testResults":7}'),
    ).toBeUndefined()
    expect(
      readRunReport(
        '{"numTotalTests":30,"numFailedTests":3,"testResults":null}',
      ),
    ).toBeUndefined()
  })
})

// The wording is the whole diagnosis an operator gets from a misconfigured run.
describe('naming how many files ran nothing', () => {
  it('says file, singular, when exactly one file declared no test', () => {
    expect(classifyRun({ status: 1 }, { ran: 0, failed: 0, files: 1 })).toEqual(
      {
        outcome: 'infrastructure_error',
        error: '1 test file matched, but no test ran',
      },
    )
  })

  it('says files, plural, for any other count', () => {
    expect(classifyRun({ status: 1 }, { ran: 0, failed: 0, files: 2 })).toEqual(
      {
        outcome: 'infrastructure_error',
        error: '2 test files matched, but no test ran',
      },
    )
  })
})

describe('reading an APS duration', () => {
  it('refuses a duration with anything in front of it', () => {
    expect(timeoutMilliseconds('x30s')).toBeUndefined()
    expect(timeoutMilliseconds('-30s')).toBeUndefined()
    expect(timeoutMilliseconds(' 30s')).toBeUndefined()
  })

  it('reads a fraction of more than one digit', () => {
    expect(timeoutMilliseconds('1.25s')).toBe(1250)
    expect(timeoutMilliseconds('0.125s')).toBe(125)
  })
})
