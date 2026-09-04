// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  entrypointSource,
  featureArtifacts,
  implementationHash,
  metadataFileName,
  relativeImportPath,
} from './generator.ts'

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

describe('relativeImportPath', () => {
  it('walks up out of the generated directory to the acceptance sources', () => {
    expect(relativeImportPath('/p/build/acceptance/generated', '/p/acceptance/runtime.ts'))
      .toBe('../../../acceptance/runtime.ts')
  })

  it('marks a same-directory target as relative, so it never reads as a package', () => {
    expect(relativeImportPath('/p/acceptance', '/p/acceptance/steps.ts')).toBe('./steps.ts')
  })
})

describe('featureArtifacts', () => {
  const request = {
    featureName: 'API proxy',
    irPath: '/p/build/acceptance/ir/api-proxy.json',
    outputDir: '/p/build/acceptance/generated',
    acceptanceDir: '/p/acceptance',
    cwd: '/p',
  }

  it('names both artifacts after the IR file', () => {
    const { entrypoint, metadata } = featureArtifacts(request)
    expect(entrypoint.path).toBe('build/acceptance/generated/api-proxy.acceptance.ts')
    expect(metadata.path)
      .toBe('build/acceptance/generated/metadata/features-api-proxy-feature.json')
  })

  it('records the feature, the IR and the emitted file as working-directory paths', () => {
    const document = JSON.parse(featureArtifacts(request).metadata.content)
    expect(document).toMatchObject({
      schema_version: 1,
      feature_path: 'features/api-proxy.feature',
      ir_path: 'build/acceptance/ir/api-proxy.json',
      hash_scope: 'generated_files',
      generated_files: ['build/acceptance/generated/api-proxy.acceptance.ts'],
    })
  })

  it('hashes exactly the entry point it emits', () => {
    const { entrypoint, metadata } = featureArtifacts(request)
    expect(JSON.parse(metadata.content).implementation_hash)
      .toBe(implementationHash([entrypoint]))
  })

  it('imports the runtime and the step handlers from the generated file location', () => {
    const { entrypoint } = featureArtifacts(request)
    expect(entrypoint.content).toContain('from "../../../acceptance/runtime.ts"')
    expect(entrypoint.content).toContain('from "../../../acceptance/steps.ts"')
  })

  it('ends the metadata document with a newline', () => {
    expect(featureArtifacts(request).metadata.content.endsWith('}\n')).toBe(true)
  })
})
