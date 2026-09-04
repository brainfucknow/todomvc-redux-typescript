// @vitest-environment node
//
// The project's boundary rules, evaluated against the tree as it is now. It
// fails on: a core module importing a shell module, a core module importing an
// impure dependency, a module importing outside its package, a module the
// layer map does not classify, a classified module that no longer exists, an
// import cycle, a CLI shell reaching a package it does not declare a dependency
// on, and an application source reaching outside `src/`.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { ModuleImports } from './layering.ts'
import { importCycles, layerViolations } from './layering.ts'
import { CLI_SHELLS, PACKAGES, modulesIn, packageDirectories } from './packages.ts'
import { shellDependencyFaults } from './shells.ts'
import { measuredCoverage } from '../../vitest.coverage.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const isSource = (file: string): boolean =>
  /\.tsx?$/.test(file) && !/\.spec\.tsx?$/.test(file) && !file.endsWith('.d.ts')

// The command-line entry points: everything directly under `scripts/` that runs
// rather than being imported. `.mjs` is in because `scripts/crap.mjs` is one.
const isCliShell = (file: string): boolean => /\.(tsx?|mjs)$/.test(file) && !/\.spec\./.test(file)

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

// The layer maps above govern what is inside a package. Nothing governed the
// wrappers that invoke them until `CLI_SHELLS` did, so a runner could quietly
// take a dependency on a package it has no business with - which is how the
// language-mutation runner came to import from the acceptance pipeline.
describe('the CLI shells', () => {
  const shells = readdirSync(join(projectRoot, 'scripts'))
    .filter(isCliShell)
    .map((module) => ({
      module: `scripts/${module}`,
      imports: importsOf(join(projectRoot, 'scripts', module)),
    }))

  it('reach exactly the packages their declared dependencies name', () => {
    expect(shellDependencyFaults(shells, CLI_SHELLS, packageDirectories())).toEqual([])
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
