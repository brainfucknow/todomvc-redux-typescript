// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ACCEPTANCE_IMPLEMENTATION_STAMP, MUTATION_TIER_STAMP, gherkinManifest } from './layout.ts'

// The paths are the record: a runner that writes its stamp somewhere else finds
// nothing on the next run and re-tests everything, silently and forever, so
// these are pinned to the files the repository actually carries.
describe('where the records live', () => {
  it('stamps the acceptance implementation beside the gherkin manifests', () => {
    expect(ACCEPTANCE_IMPLEMENTATION_STAMP).toBe('.mutation/acceptance-implementation.json')
  })

  it('stamps the mutation tier beside them', () => {
    expect(MUTATION_TIER_STAMP).toBe('.mutation/test-tier.json')
  })
})

describe('gherkinManifest', () => {
  it('names a feature manifest after the feature', () => {
    expect(gherkinManifest('toolchain-dependencies')).toBe('.mutation/gherkin/toolchain-dependencies.manifest')
  })

  it('gives two features two manifests', () => {
    expect(gherkinManifest('api-proxy')).not.toBe(gherkinManifest('production-build'))
  })
})
