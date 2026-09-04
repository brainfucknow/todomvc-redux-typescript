import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import { PACKAGES, modulesIn } from '../scripts/architecture/packages.ts'
import { measuredCoverage } from '../vitest.coverage.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// PLAN.md section 4 puts the project's own non-application code in these two
// directories: the acceptance pipeline, and the tooling that checks the tree.
const TOOLING_DIRECTORIES = ['acceptance', 'scripts']

const isSource = (file: string): boolean =>
  file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts')

const sourcesUnder = (directory: string): string[] =>
  readdirSync(join(projectRoot, directory), { recursive: true, encoding: 'utf8' })
    .filter(isSource)
    .map((file) => `${directory}/${file}`)

const importsOf = (module: string): string[] =>
  ts.preProcessFile(readFileSync(join(projectRoot, module), 'utf8'), true, true)
    .importedFiles.map((found) => found.fileName)

const declaredModules = (): string[] => [...modulesIn('core'), ...modulesIn('shell')]

// `modulesIn` is how the CRAP gate learns which modules are adapter shells and
// so stays out of them, and how anything else asks a layer for its members. A
// layer that answers with nothing, or with the other layer's modules, is a
// wrong answer no caller can tell from a right one: the gate would simply
// measure a different set of files and still pass.
describe('what a layer answers with', () => {
  test('the two layers together are every module the packages declare', () => {
    const declared = PACKAGES.flatMap(({ directory, rules }) =>
      Object.keys(rules.layers).map((module) => `${directory}/${module}`))
    expect(declaredModules().sort()).toEqual(declared.sort())
  })

  test.each(['core', 'shell'] as const)('every module %s answers with is declared %s', (layer) => {
    const misfiled = modulesIn(layer).filter((module) => !PACKAGES.some(({ directory, rules }) =>
      rules.layers[module.slice(`${directory}/`.length)] === layer &&
      module.startsWith(`${directory}/`)))
    expect(misfiled).toEqual([])
  })

  test('the layers do not overlap', () => {
    expect(modulesIn('core').filter((module) => modulesIn('shell').includes(module))).toEqual([])
  })
})

// `packages.spec.ts` walks the packages this list names, so a directory missing
// from it is not checked loosely - it is not checked at all, and an empty list
// checks nothing while passing. What the list has to cover is every module of
// the project's own tooling that is not one of the CLI wrappers the coverage
// config already declares to be outside every package.
describe('what the boundary check governs', () => {
  test('every tooling module belongs to a declared package or is a declared CLI wrapper', () => {
    const excluded = measuredCoverage.exclude ?? []
    const declared = new Set(declaredModules())
    const ungoverned = TOOLING_DIRECTORIES
      .flatMap(sourcesUnder)
      .filter((module) => !declared.has(module) && !excluded.includes(module))
    expect(ungoverned).toEqual([])
  })
})

// A pure dependency is a permission: it says a core module may import something
// it did not write. The permission is granted because a core module needs it,
// so an entry no core module imports is a permission nobody asked for, and it
// widens what the check would accept without anything in the tree changing.
describe('the pure dependencies a package grants', () => {
  test.each(PACKAGES)('$directory grants exactly what its core modules import', ({ directory, rules }) => {
    const imported = modulesIn('core')
      .filter((module) => module.startsWith(`${directory}/`))
      .flatMap(importsOf)
      .filter((specifier) => !specifier.startsWith('.'))
    expect([...new Set(rules.pureExternals)].sort()).toEqual([...new Set(imported)].sort())
  })
})
