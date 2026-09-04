import { resolve } from 'node:path'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  entrypointSource,
  featureArtifacts,
  implementationHash,
  metadataFileName,
  relativeImportPath,
} from '../acceptance/generator.ts'
import { FEATURES_DIR, IR_DIR, entrypointFileName, featurePathForIr, irFileName } from '../acceptance/layout.ts'

const slug = fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/)
const featurePath = fc.stringMatching(/^[A-Za-z0-9 _\-./]{1,30}$/)
const segments = fc.array(fc.stringMatching(/^[a-z][a-z0-9-]{0,8}$/), { minLength: 1, maxLength: 4 })
const generatedFile = fc.record({
  path: fc.stringMatching(/^[a-z][a-z0-9\-/.]{0,20}$/),
  content: fc.string(),
})
const fileSet = fc.uniqueArray(generatedFile, { selector: (file) => file.path, minLength: 1, maxLength: 5 })

describe('metadataFileName', () => {
  it('is a lowercase hyphenated name with no leading, trailing or doubled hyphen', () => {
    fc.assert(fc.property(featurePath, (path) => {
      fc.pre(/[A-Za-z0-9]/.test(path))
      expect(metadataFileName(path)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.json$/)
    }))
  })

  it('ignores the case of the feature path', () => {
    fc.assert(fc.property(featurePath, (path) => {
      expect(metadataFileName(path.toUpperCase())).toBe(metadataFileName(path.toLowerCase()))
    }))
  })
})

describe('implementationHash', () => {
  it('does not depend on the order the files are listed in', () => {
    fc.assert(fc.property(fileSet, (files) => {
      expect(implementationHash([...files].reverse())).toBe(implementationHash(files))
    }))
  })

  it('changes when any one file is rewritten', () => {
    fc.assert(fc.property(fileSet, fc.string(), (files, content) => {
      fc.pre(files[0].content !== content)
      const rewritten = [{ ...files[0], content }, ...files.slice(1)]
      expect(implementationHash(rewritten)).not.toBe(implementationHash(files))
    }))
  })

  it('changes when a file is renamed', () => {
    fc.assert(fc.property(fileSet, fc.stringMatching(/^[a-z][a-z0-9\-/.]{0,20}$/), (files, path) => {
      fc.pre(files.every((file) => file.path !== path))
      const renamed = [{ ...files[0], path }, ...files.slice(1)]
      expect(implementationHash(renamed)).not.toBe(implementationHash(files))
    }))
  })
})

describe('relativeImportPath', () => {
  it('reaches the target from the directory it is resolved in', () => {
    fc.assert(fc.property(segments, segments, (from, target) => {
      const fromDir = `/${from.join('/')}`
      const file = `/${target.join('/')}.ts`
      expect(resolve(fromDir, relativeImportPath(fromDir, file))).toBe(file)
    }))
  })

  it('always reads as a path, never as a package name', () => {
    fc.assert(fc.property(segments, segments, (from, target) => {
      expect(relativeImportPath(`/${from.join('/')}`, `/${target.join('/')}.ts`)).toMatch(/^\.\.?\//)
    }))
  })
})

const entrypointOptions = fc.record({
  featureName: fc.string(),
  irPath: slug.map((name) => `${IR_DIR}/${name}.json`),
  runtimeImport: fc.constant('../../../acceptance/runtime.ts'),
  stepsImport: fc.constant('../../../acceptance/steps.ts'),
})

describe('entrypointSource', () => {
  it('is the same source every time for the same inputs', () => {
    fc.assert(fc.property(entrypointOptions, (options) => {
      expect(entrypointSource({ ...options })).toBe(entrypointSource({ ...options }))
    }))
  })

  it('embeds the feature name as a literal, whatever it contains', () => {
    fc.assert(fc.property(entrypointOptions, (options) => {
      expect(entrypointSource(options)).toContain(JSON.stringify(options.featureName))
    }))
  })

  it('loads the IR and never names the feature file', () => {
    fc.assert(fc.property(entrypointOptions, (options) => {
      const source = entrypointSource(options)
      expect(source).toContain(JSON.stringify(options.irPath))
      expect(source).not.toContain('.feature')
    }))
  })
})

const artifactRequest = fc.record({
  featureName: fc.string(),
  irPath: slug.map((name) => `/p/${IR_DIR}/${name}.json`),
  outputDir: fc.constant('/p/build/acceptance/generated'),
  acceptanceDir: fc.constant('/p/acceptance'),
  cwd: fc.constant('/p'),
})

describe('featureArtifacts', () => {
  it('hashes exactly the entry point it emits', () => {
    fc.assert(fc.property(artifactRequest, (request) => {
      const { entrypoint, metadata } = featureArtifacts(request)
      const document = JSON.parse(metadata.content)
      expect(document.implementation_hash).toBe(implementationHash([entrypoint]))
      expect(document.generated_files).toEqual([entrypoint.path])
    }))
  })

  it('records both artifacts as working-directory paths', () => {
    fc.assert(fc.property(artifactRequest, (request) => {
      const { entrypoint, metadata } = featureArtifacts(request)
      expect(entrypoint.path.startsWith('/')).toBe(false)
      expect(metadata.path.startsWith('/')).toBe(false)
      expect(JSON.parse(metadata.content).ir_path.startsWith('/')).toBe(false)
    }))
  })

  it('writes metadata that parses back and ends with a newline', () => {
    fc.assert(fc.property(artifactRequest, (request) => {
      const { content } = featureArtifacts(request).metadata
      expect(content.endsWith('\n')).toBe(true)
      expect(JSON.parse(content).schema_version).toBe(1)
    }))
  })
})

describe('the feature to IR round trip', () => {
  it('recovers the feature path the parse step started from', () => {
    fc.assert(fc.property(slug, (name) => {
      const file = `${name}.feature`
      expect(featurePathForIr(`${IR_DIR}/${irFileName(file)}`)).toBe(`${FEATURES_DIR}/${file}`)
    }))
  })

  it('names the entry point after the same feature', () => {
    fc.assert(fc.property(slug, (name) => {
      expect(entrypointFileName(irFileName(`${name}.feature`))).toBe(`${name}.acceptance.ts`)
    }))
  })
})
