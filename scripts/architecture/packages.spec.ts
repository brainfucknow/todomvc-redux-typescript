// @vitest-environment node
//
// The project's boundary rules, evaluated against the tree as it is now. It
// fails on: a core module importing a shell module, a core module importing an
// impure dependency, a module importing outside its package, a module the
// layer map does not classify, a classified module that no longer exists, an
// import cycle, and an application source reaching outside `src/`.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { ModuleImports } from './layering.ts'
import { importCycles, layerViolations } from './layering.ts'
import { PACKAGES, modulesIn } from './packages.ts'
import { measuredCoverage } from '../../vitest.coverage.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const isSource = (file: string): boolean =>
  /\.tsx?$/.test(file) && !/\.spec\.tsx?$/.test(file) && !file.endsWith('.d.ts')

const importsOf = (file: string): string[] =>
  ts.preProcessFile(readFileSync(file, 'utf8'), true, true).importedFiles.map((found) => found.fileName)

const packageModules = (directory: string): ModuleImports[] =>
  readdirSync(join(projectRoot, directory))
    .filter(isSource)
    .map((module) => ({ module, imports: importsOf(join(projectRoot, directory, module)) }))

describe.each(PACKAGES)('the $directory package', ({ directory, rules }) => {
  const modules = packageModules(directory)

  it('keeps every module on the side of the boundary the rules declare', () => {
    expect(layerViolations(modules, rules)).toEqual([])
  })

  it('has no import cycles', () => {
    expect(importCycles(modules)).toEqual([])
  })
})

describe('the application sources', () => {
  const srcDir = join(projectRoot, 'src')
  const files = readdirSync(srcDir, { recursive: true, encoding: 'utf8' }).filter(isSource)

  it('depend on nothing outside src', () => {
    const escapes = files.flatMap((file) => {
      const from = join(srcDir, file)
      return importsOf(from)
        .filter((specifier) => specifier.startsWith('.'))
        .filter((specifier) => relative(srcDir, resolve(dirname(from), specifier)).startsWith('..'))
        .map((specifier) => `src/${file} imports ${specifier}`)
    })
    expect(escapes).toEqual([])
  })
})

// The gate reads the shells back out of the layer maps, so a shell cannot be
// measured by accident. The other direction is what needs saying: a core
// module that someone excludes by hand is a module nothing scores.
describe('what the CRAP gate measures', () => {
  it('leaves no core module out of the report', () => {
    expect(modulesIn('core').filter((module) => measuredCoverage.exclude?.includes(module))).toEqual([])
  })
})
