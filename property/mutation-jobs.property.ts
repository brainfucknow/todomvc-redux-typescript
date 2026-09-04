// The runner adapter's protocol judgments. A wrong classification here records
// a mutant as survived or killed on the strength of a run that did not happen,
// so what these say is that every completion lands somewhere and that a
// duration parses back to the milliseconds it was written as.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Completion } from '../acceptance/mutation-jobs.ts'
import { classify, jobTimeout, responseLine } from '../acceptance/mutation-jobs.ts'

const output = fc.string({ maxLength: 30 })
const unit = fc.constantFrom(['ms', 1] as const, ['s', 1_000] as const, ['m', 60_000] as const)

describe('jobTimeout', () => {
  it('reads a whole duration back as milliseconds', () => {
    fc.assert(fc.property(fc.nat(9_999), unit, (amount, [suffix, scale]) => {
      expect(jobTimeout(`${amount}${suffix}`)).toBe(amount * scale)
    }))
  })

  it('reads a fractional duration back as milliseconds', () => {
    fc.assert(fc.property(fc.nat(999), fc.integer({ min: 1, max: 999 }), unit,
      (whole, fraction, [suffix, scale]) => {
        expect(jobTimeout(`${whole}.${fraction}${suffix}`))
          .toBeCloseTo(Number(`${whole}.${fraction}`) * scale, 6)
      }))
  })

  it('never reads a negative or zero-scaled timeout out of a positive duration', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 9_999 }), unit, (amount, [suffix]) => {
      expect(jobTimeout(`${amount}${suffix}`)).toBeGreaterThan(0)
    }))
  })

  it('declines anything that is not a duration, rather than guessing a number', () => {
    fc.assert(fc.property(fc.nat(999), fc.stringMatching(/^[a-z]{1,4}$/), (amount, suffix) => {
      fc.pre(!['ms', 's', 'm'].includes(suffix))
      expect(jobTimeout(`${amount}${suffix}`)).toBeUndefined()
    }))
    expect(jobTimeout(undefined)).toBeUndefined()
  })
})

describe('classify', () => {
  it('calls a run that reported a failure an infrastructure error, whatever it exited', () => {
    const failure = fc.string({ minLength: 1, maxLength: 20 })
    fc.assert(fc.property(fc.option(fc.nat(20), { nil: null }), output, failure,
      (exitCode, text, reason) => {
        expect(classify({ exitCode, output: text, failure: reason }))
          .toEqual({ outcome: 'infrastructure_error', output: text, error: reason })
      }))
  })

  it('calls a run that never reported an infrastructure error, and says so itself', () => {
    fc.assert(fc.property(output, (text) => {
      expect(classify({ exitCode: null, output: text }))
        .toEqual({
          outcome: 'infrastructure_error',
          output: text,
          error: 'the test run was terminated before it reported',
        })
    }))
  })

  it('reads a verdict off the exit code, zero and only zero being success', () => {
    fc.assert(fc.property(fc.nat(20), output, (exitCode, text) => {
      expect(classify({ exitCode, output: text }))
        .toEqual({
          outcome: exitCode === 0 ? 'test_success' : 'test_failure',
          output: text,
          error: '',
        })
    }))
  })

  it('passes the run output through untouched, however it was classified', () => {
    const completion: fc.Arbitrary<Completion> = fc.record({
      exitCode: fc.option(fc.nat(20), { nil: null }),
      output,
      failure: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
    })
    fc.assert(fc.property(completion, (finished) => {
      expect(classify(finished).output).toBe(finished.output)
    }))
  })
})

describe('responseLine', () => {
  it('is one newline-terminated JSON object the mutator can parse back', () => {
    const result = fc.record({
      outcome: fc.constantFrom('test_success' as const, 'test_failure' as const,
        'infrastructure_error' as const),
      output,
      error: output,
    })
    fc.assert(fc.property(fc.stringMatching(/^[a-z0-9-]{1,12}$/), result, fc.nat(1e9),
      (id, judged, duration) => {
        const line = responseLine(id, judged, duration)
        expect(line.endsWith('\n')).toBe(true)
        expect(line.trimEnd()).not.toContain('\n')
        expect(JSON.parse(line)).toEqual({ id, ...judged, duration })
      }))
  })
})
