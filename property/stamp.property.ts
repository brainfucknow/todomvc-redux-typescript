import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Stamp } from '../scripts/mutation-reuse/stamp.ts'
import {
  ACCEPTANCE_IMPLEMENTATION,
  MUTATION_TIER,
  reachedVerdict,
  resultsAreReusable,
  stampText,
} from '../scripts/mutation-reuse/stamp.ts'

const hash = fc.stringMatching(/^sha256:[0-9a-f]{8}$/)
const runner = fc.constantFrom<Stamp>(ACCEPTANCE_IMPLEMENTATION, MUTATION_TIER)
const status = fc.option(fc.integer({ min: 0, max: 3 }), { nil: null })

describe('a stamp and the run that reads it back', () => {
  it('is believed by the runner that wrote it, whatever it recorded', () => {
    fc.assert(fc.property(runner, hash, (stamp, recorded) => {
      expect(resultsAreReusable(stamp, stampText(stamp, recorded), recorded)).toBe(true)
    }))
  })

  it('is disbelieved once the fingerprint has moved at all', () => {
    fc.assert(fc.property(runner, hash, hash, (stamp, recorded, current) => {
      fc.pre(recorded !== current)
      expect(resultsAreReusable(stamp, stampText(stamp, recorded), current)).toBe(false)
    }))
  })

  // The two runners keep their records side by side and record different
  // things, so one reading the other's stamp as its own would reuse results
  // nothing had earned.
  it('is disbelieved by the other runner, which records something else', () => {
    fc.assert(fc.property(runner, hash, (stamp, recorded) => {
      const other = stamp === MUTATION_TIER ? ACCEPTANCE_IMPLEMENTATION : MUTATION_TIER
      expect(resultsAreReusable(other, stampText(stamp, recorded), recorded)).toBe(false)
    }))
  })

  it('is disbelieved when it was written at a version that covered something else', () => {
    fc.assert(fc.property(runner, hash, fc.integer({ min: -3, max: 5 }), (stamp, recorded, version) => {
      fc.pre(version !== stamp.version)
      const stored = JSON.stringify({ version, [stamp.field]: recorded })
      expect(resultsAreReusable(stamp, stored, recorded)).toBe(false)
    }))
  })

  it('reads back as JSON that ends in a newline, whatever it records', () => {
    fc.assert(fc.property(runner, hash, (stamp, recorded) => {
      const text = stampText(stamp, recorded)
      expect(text.endsWith('\n')).toBe(true)
      expect(JSON.parse(text)).toEqual({ version: stamp.version, [stamp.field]: recorded })
    }))
  })
})

describe('reachedVerdict', () => {
  it('counts a run exactly when every process it spawned exited on its own', () => {
    fc.assert(fc.property(fc.array(status, { maxLength: 6 }), (statuses) => {
      expect(reachedVerdict(statuses)).toBe(statuses.every((code) => code !== null))
    }))
  })

  it('is unmoved by an exit code, so a red run is still stamped', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 6 }), (statuses) => {
      expect(reachedVerdict(statuses)).toBe(true)
    }))
  })
})
