import { describe, expect, it } from 'vitest'
import {
  classifyRun,
  readJob,
  readRunReport,
  response,
  timeoutMilliseconds,
} from './runner-protocol.mjs'

/**
 * The mutator scores a mutation by the outcome this adapter reports, not by an
 * exit code it can see for itself, so every way of confusing one outcome with
 * another is a way of reporting a mutation score that was never measured: a
 * run that could not start reads as a killed mutation if it is called a
 * failure, and a killed mutation reads as a survivor if it is called
 * infrastructure. These tests pin the mapping in both directions.
 *
 * The exit code alone cannot carry that mapping: Vitest exits 1 both when a
 * test failed and when it found no test file to run at all, so a run pointed
 * at an empty or mis-spelled generated directory would report every mutant
 * killed while executing nothing. What the run itself reported having run is
 * therefore part of the classification, and a kill requires a test that ran
 * and failed.
 */

describe('reading a job line', () => {
  it('refuses a line that is not JSON, quoting it back', () => {
    expect(readJob('{oops')).toStrictEqual({
      ok: false,
      id: '',
      error: 'unreadable job: {oops',
    })
  })

  it('refuses a job that names no IR, keeping its id so the mutator can pair it up', () => {
    expect(readJob('{"id":"m-7"}')).toStrictEqual({
      ok: false,
      id: 'm-7',
      error: 'job has no feature_json',
    })
  })

  it('reads the protocol field names into the ones the worker uses', () => {
    expect(
      readJob(
        '{"id":"m-1","feature_json":"/w/ir.json","generated_dir":"/w/gen","timeout":"30s"}',
      ),
    ).toStrictEqual({
      ok: true,
      job: {
        id: 'm-1',
        featureJson: '/w/ir.json',
        generatedDir: '/w/gen',
        timeoutMs: 30000,
      },
    })
  })

  it('leaves the optional fields unset, and the id empty, when the job omits them', () => {
    expect(readJob('{"feature_json":"/w/ir.json"}')).toStrictEqual({
      ok: true,
      job: {
        id: '',
        featureJson: '/w/ir.json',
        generatedDir: undefined,
        timeoutMs: undefined,
      },
    })
  })
})

describe('reading an APS duration', () => {
  it('reads the units the specification writes', () => {
    expect(timeoutMilliseconds('500ms')).toBe(500)
    expect(timeoutMilliseconds('30s')).toBe(30000)
    expect(timeoutMilliseconds('1.5m')).toBe(90000)
  })

  it('reads a bare number as seconds', () => {
    expect(timeoutMilliseconds('45')).toBe(45000)
  })

  it('imposes no timeout when there is no readable duration', () => {
    expect(timeoutMilliseconds(undefined)).toBeUndefined()
    expect(timeoutMilliseconds('')).toBeUndefined()
    expect(timeoutMilliseconds('soon')).toBeUndefined()
    expect(timeoutMilliseconds('30 s')).toBeUndefined()
  })
})

describe('reading what a run reported having run', () => {
  it('reads the counts a Vitest JSON report carries', () => {
    expect(
      readRunReport(
        '{"numTotalTests":30,"numFailedTests":3,"testResults":[{},{},{}]}',
      ),
    ).toStrictEqual({ ran: 30, failed: 3, files: 3 })
  })

  it('reads a report of a run that matched nothing', () => {
    expect(
      readRunReport('{"numTotalTests":0,"numFailedTests":0,"testResults":[]}'),
    ).toStrictEqual({ ran: 0, failed: 0, files: 0 })
  })

  it('reports nothing when there is no readable report', () => {
    expect(readRunReport('')).toBeUndefined()
    expect(readRunReport('{oops')).toBeUndefined()
    expect(readRunReport('{"numTotalTests":30}')).toBeUndefined()
    expect(
      readRunReport(
        '{"numTotalTests":"30","numFailedTests":0,"testResults":[]}',
      ),
    ).toBeUndefined()
  })
})

describe('classifying a finished run', () => {
  /**
   * @param {Partial<import('./runner-protocol.mjs').RunReport>} counts
   * @returns {import('./runner-protocol.mjs').RunReport}
   */
  const ran = (counts = {}) => ({ ran: 30, failed: 0, files: 3, ...counts })

  it('calls a clean exit a success', () => {
    expect(classifyRun({ status: 0 }, ran())).toStrictEqual({
      outcome: 'test_success',
      error: '',
    })
  })

  it('calls a run with a failing test a failure, which is what kills a mutation', () => {
    expect(classifyRun({ status: 1 }, ran({ failed: 3 }))).toStrictEqual({
      outcome: 'test_failure',
      error: '',
    })
  })

  it('calls a run that matched no test file infrastructure, not a dead mutation', () => {
    expect(
      classifyRun({ status: 1 }, { ran: 0, failed: 0, files: 0 }),
    ).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'no test files matched, so nothing ran',
    })
  })

  it('calls a run whose test files declared no test infrastructure', () => {
    expect(
      classifyRun({ status: 1 }, { ran: 0, failed: 0, files: 3 }),
    ).toStrictEqual({
      outcome: 'infrastructure_error',
      error: '3 test files matched, but no test ran',
    })
  })

  it('calls an empty run infrastructure even when Vitest was content with it', () => {
    expect(
      classifyRun({ status: 0 }, { ran: 0, failed: 0, files: 0 }),
    ).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'no test files matched, so nothing ran',
    })
  })

  it('calls a failing exit with no failing test infrastructure', () => {
    expect(classifyRun({ status: 1 }, ran({ failed: 0 }))).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'vitest exited 1 with no failing test',
    })
  })

  it('calls a run it cannot read a report of infrastructure', () => {
    expect(classifyRun({ status: 1 }, undefined)).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'vitest exited 1 without a test report',
    })
    expect(classifyRun({ status: 0 }, undefined)).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'vitest exited 0 without a test report',
    })
  })

  it('calls any other exit code infrastructure, not a dead mutation', () => {
    expect(classifyRun({ status: 2 }, ran({ failed: 3 }))).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'vitest exited 2',
    })
    expect(classifyRun({ status: null }, ran({ failed: 3 }))).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'vitest exited null',
    })
  })

  it('calls a run that never started infrastructure, whatever else it reports', () => {
    expect(
      classifyRun(
        { status: 1, error: new Error('spawn ENOENT') },
        ran({ failed: 3 }),
      ),
    ).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'spawn ENOENT',
    })
  })

  it('calls a run that was killed infrastructure, naming the signal', () => {
    expect(
      classifyRun({ status: null, signal: 'SIGTERM' }, undefined),
    ).toStrictEqual({
      outcome: 'infrastructure_error',
      error: 'killed by SIGTERM',
    })
  })
})

describe('building a response', () => {
  it('fills in everything a refusal has nothing to say about', () => {
    expect(
      response({ id: 'm-1', outcome: 'infrastructure_error' }),
    ).toStrictEqual({
      id: 'm-1',
      outcome: 'infrastructure_error',
      output: '',
      error: '',
      duration: 0,
    })
  })

  it('carries what it is given', () => {
    expect(
      response({
        id: 'm-2',
        outcome: 'test_failure',
        output: 'FAIL todo-api-requests 3',
        error: '',
        duration: 1234,
      }),
    ).toStrictEqual({
      id: 'm-2',
      outcome: 'test_failure',
      output: 'FAIL todo-api-requests 3',
      error: '',
      duration: 1234,
    })
  })
})
