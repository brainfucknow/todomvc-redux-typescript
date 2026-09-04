// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { entrypointSource, implementationHash, metadataFileName } from './generator.ts'

describe('metadataFileName', () => {
  it('maps a feature path to lowercase hyphenated metadata', () => {
    expect(metadataFileName('features/Hunt The Wumpus.feature')).toBe('features-hunt-the-wumpus-feature.json')
  })

  it('flattens nested feature directories', () => {
    expect(metadataFileName('features/orders/Cancel Order.feature'))
      .toBe('features-orders-cancel-order-feature.json')
  })

  it('collapses runs of non-alphanumeric characters into a single hyphen', () => {
    expect(metadataFileName('Features/API v2/Happy Path.feature')).toBe('features-api-v2-happy-path-feature.json')
  })

  it('trims leading and trailing hyphens', () => {
    expect(metadataFileName('/features/_a_.feature')).toBe('features-a-feature.json')
  })
})

describe('implementationHash', () => {
  it('is a sha256 over the generated file contents', () => {
    expect(implementationHash([{ path: 'a.ts', content: 'x' }])).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('changes when generated content changes', () => {
    const before = implementationHash([{ path: 'a.ts', content: 'x' }])
    const after = implementationHash([{ path: 'a.ts', content: 'y' }])
    expect(after).not.toBe(before)
  })

  it('does not depend on the order the generated files are listed in', () => {
    const files = [{ path: 'a.ts', content: 'x' }, { path: 'b.ts', content: 'y' }]
    expect(implementationHash(files)).toBe(implementationHash([...files].reverse()))
  })

  it('distinguishes the same content under different file names', () => {
    expect(implementationHash([{ path: 'a.ts', content: 'x' }]))
      .not.toBe(implementationHash([{ path: 'b.ts', content: 'x' }]))
  })
})

const options = {
  featureName: 'API proxy',
  irPath: 'build/acceptance/ir/api-proxy.json',
  runtimeImport: '../../../acceptance/runtime.ts',
  stepsImport: '../../../acceptance/steps.ts',
}

describe('entrypointSource', () => {
  it('loads the supplied IR rather than the feature file', () => {
    const source = entrypointSource(options)
    expect(source).toContain('build/acceptance/ir/api-proxy.json')
    expect(source).not.toContain('.feature')
  })

  it('delegates step behavior to the runtime and the project step handlers', () => {
    const source = entrypointSource(options)
    expect(source).toContain('../../../acceptance/runtime.ts')
    expect(source).toContain('../../../acceptance/steps.ts')
    expect(source).toContain('runExecution')
  })

  it('runs every scenario execution the IR expands to', () => {
    expect(entrypointSource(options)).toContain('expandScenarios')
  })

  it('is deterministic for fixed inputs', () => {
    expect(entrypointSource(options)).toBe(entrypointSource({ ...options }))
  })

  it('embeds paths and names as escaped literals', () => {
    const source = entrypointSource({ ...options, featureName: "Bob's \"feature\"" })
    expect(source).toContain(JSON.stringify("Bob's \"feature\""))
  })
})
