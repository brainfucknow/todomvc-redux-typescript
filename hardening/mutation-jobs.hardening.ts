import { describe, expect, test } from 'vitest'
import { classify, jobTimeout, responseLine } from '../acceptance/mutation-jobs.ts'

describe('the timeout a job asks for', () => {
  test('seconds are milliseconds', () => {
    expect(jobTimeout('30s')).toBe(30_000)
  })

  test('milliseconds pass through', () => {
    expect(jobTimeout('250ms')).toBe(250)
  })

  test('minutes are sixty seconds', () => {
    expect(jobTimeout('2m')).toBe(120_000)
  })

  test('a fractional amount keeps its fraction', () => {
    expect(jobTimeout('1.5s')).toBe(1_500)
  })

  test('a job with no timeout runs without one', () => {
    expect(jobTimeout(undefined)).toBeUndefined()
  })

  test('a duration in a unit the worker does not know runs without a timeout', () => {
    expect(jobTimeout('1h')).toBeUndefined()
  })

  test('text that is not a duration runs without a timeout rather than a timeout of zero', () => {
    expect(jobTimeout('soon')).toBeUndefined()
    expect(jobTimeout('')).toBeUndefined()
    expect(jobTimeout('30 s')).toBeUndefined()
  })

  test('a duration has to be the whole value, not something the value starts with', () => {
    expect(jobTimeout('30seconds')).toBeUndefined()
  })

  test('a duration has to be the whole value, not something the value ends with', () => {
    expect(jobTimeout('after 30s')).toBeUndefined()
  })

  test('a fraction keeps every digit it was given', () => {
    expect(jobTimeout('1.75s')).toBe(1_750)
  })
})

describe('classifying a finished test run', () => {
  test('a passing run is a surviving mutation', () => {
    expect(classify({ exitCode: 0, output: '21 passed' }))
      .toEqual({ outcome: 'test_success', output: '21 passed', error: '' })
  })

  test('a failing run is a killed mutation', () => {
    expect(classify({ exitCode: 1, output: '1 failed' }))
      .toEqual({ outcome: 'test_failure', output: '1 failed', error: '' })
  })

  test('any non-zero exit is a failure, not only one', () => {
    expect(classify({ exitCode: 137, output: '' }).outcome).toBe('test_failure')
  })

  test('a run that could not start is an error, and says why', () => {
    expect(classify({ exitCode: null, output: '', failure: 'spawn ENOENT' }))
      .toEqual({ outcome: 'infrastructure_error', output: '', error: 'spawn ENOENT' })
  })

  test('a run killed without an exit code is an error, not a survivor', () => {
    expect(classify({ exitCode: null, output: 'partial' }))
      .toEqual({
        outcome: 'infrastructure_error',
        output: 'partial',
        error: 'the test run was terminated before it reported',
      })
  })

  test('a reported failure outranks an exit code that looks fine', () => {
    expect(classify({ exitCode: 0, output: '', failure: 'timed out' }).outcome).toBe('infrastructure_error')
  })
})

describe('the response the mutator reads back', () => {
  const line = responseLine('m1', { outcome: 'test_failure', output: 'out', error: '' }, 125_000_000)

  test('is exactly one line of JSON', () => {
    expect(line.endsWith('\n')).toBe(true)
    expect(line.trimEnd()).not.toContain('\n')
  })

  test('carries the job id, the outcome, the output, the error and the duration', () => {
    expect(JSON.parse(line))
      .toEqual({ id: 'm1', outcome: 'test_failure', output: 'out', error: '', duration: 125_000_000 })
  })

  test('escapes test output that spans lines rather than breaking the protocol', () => {
    const multiline = responseLine('m2', { outcome: 'test_success', output: 'a\nb', error: '' }, 1)
    expect(multiline.trimEnd()).not.toContain('\n')
    expect(JSON.parse(multiline).output).toBe('a\nb')
  })
})
