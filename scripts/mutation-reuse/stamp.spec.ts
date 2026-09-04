// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  ACCEPTANCE_IMPLEMENTATION,
  MUTATION_TIER,
  reachedVerdict,
  resultsAreReusable,
  stampText,
} from './stamp.ts'

const recorded = (fields: Record<string, unknown>) => JSON.stringify(fields)

describe('resultsAreReusable', () => {
  it('believes a stamp recording the fingerprint in front of it', () => {
    const stored = recorded({ version: 1, tier_hash: 'sha256:abc' })
    expect(resultsAreReusable(MUTATION_TIER, stored, 'sha256:abc')).toBe(true)
  })

  it('disbelieves a stamp recording a fingerprint that has since moved', () => {
    const stored = recorded({ version: 1, tier_hash: 'sha256:abc' })
    expect(resultsAreReusable(MUTATION_TIER, stored, 'sha256:def')).toBe(false)
  })

  it('disbelieves a run that has stamped nothing yet', () => {
    expect(resultsAreReusable(MUTATION_TIER, undefined, 'sha256:abc')).toBe(false)
  })

  it('disbelieves a stamp from a version that covered something else', () => {
    const stored = recorded({ version: 2, tier_hash: 'sha256:abc' })
    expect(resultsAreReusable(MUTATION_TIER, stored, 'sha256:abc')).toBe(false)
  })

  it('disbelieves a stamp carrying no fingerprint at all', () => {
    expect(resultsAreReusable(MUTATION_TIER, recorded({ version: 1 }), 'sha256:abc')).toBe(false)
  })

  it('disbelieves a stamp written under another field', () => {
    const stored = recorded({ version: 1, implementation_hash: 'sha256:abc' })
    expect(resultsAreReusable(MUTATION_TIER, stored, 'sha256:abc')).toBe(false)
  })

  it('reads each runner at its own field', () => {
    const stored = recorded({ version: 1, implementation_hash: 'sha256:abc' })
    expect(resultsAreReusable(ACCEPTANCE_IMPLEMENTATION, stored, 'sha256:abc')).toBe(true)
  })

  it('refuses a stamp file it cannot read rather than reusing on a guess', () => {
    expect(() => resultsAreReusable(MUTATION_TIER, 'not json', 'sha256:abc')).toThrow()
  })
})

describe('stampText', () => {
  it('records the fingerprint under the field its runner reads', () => {
    expect(JSON.parse(stampText(ACCEPTANCE_IMPLEMENTATION, 'sha256:abc')))
      .toEqual({ version: 1, implementation_hash: 'sha256:abc' })
  })

  it('writes a file a line-oriented tool can read, ending in a newline', () => {
    expect(stampText(MUTATION_TIER, 'sha256:abc')).toBe('{\n  "version": 1,\n  "tier_hash": "sha256:abc"\n}\n')
  })

  it('writes what the next run believes', () => {
    expect(resultsAreReusable(MUTATION_TIER, stampText(MUTATION_TIER, 'sha256:abc'), 'sha256:abc')).toBe(true)
  })
})

describe('reachedVerdict', () => {
  it('counts a run that finished green', () => {
    expect(reachedVerdict([0])).toBe(true)
  })

  it('counts a run that finished red, because its manifest was rewritten too', () => {
    expect(reachedVerdict([0, 1])).toBe(true)
  })

  it('does not count a run that never exited on its own', () => {
    expect(reachedVerdict([0, null])).toBe(false)
  })

  it('counts a run with nothing to do', () => {
    expect(reachedVerdict([])).toBe(true)
  })
})
