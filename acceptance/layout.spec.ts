// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { entrypointFileName, featurePathForIr, generatedEntrypointGlob, irFileName } from './layout.ts'

describe('irFileName', () => {
  it('names the IR after the feature it was parsed from', () => {
    expect(irFileName('api-proxy.feature')).toBe('api-proxy.json')
  })
})

describe('featurePathForIr', () => {
  it('recovers the feature path a parse step started from', () => {
    expect(featurePathForIr('build/acceptance/ir/api-proxy.json')).toBe('features/api-proxy.feature')
  })
})

describe('entrypointFileName', () => {
  it('names the entry point after the IR', () => {
    expect(entrypointFileName('build/acceptance/ir/api-proxy.json')).toBe('api-proxy.acceptance.ts')
  })
})

describe('generatedEntrypointGlob', () => {
  it('matches the entry points the generator emits', () => {
    expect(generatedEntrypointGlob).toBe('build/acceptance/generated/*.acceptance.ts')
  })
})
