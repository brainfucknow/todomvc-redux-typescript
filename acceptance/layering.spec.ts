// @vitest-environment node
//
// The project's boundary rules run in the unit tier, and this package is the
// only non-application code the unit tier collects, so they live here.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { LayerRules, ModuleImports } from './layering.ts'
import { acceptanceRules, importCycles, layerViolations } from './layering.ts'

const acceptanceDir = dirname(fileURLToPath(import.meta.url))
const srcDir = resolve(acceptanceDir, '..', 'src')

const isSource = (file: string): boolean =>
  /\.tsx?$/.test(file) && !/\.spec\.tsx?$/.test(file) && !file.endsWith('.d.ts')

const importsOf = (file: string): string[] =>
  ts.preProcessFile(readFileSync(file, 'utf8'), true, true).importedFiles.map((found) => found.fileName)

const packageModules = (directory: string): ModuleImports[] =>
  readdirSync(directory)
    .filter(isSource)
    .map((module) => ({ module, imports: importsOf(join(directory, module)) }))

const rules: LayerRules = { layers: { 'a.ts': 'core', 'b.ts': 'shell' }, pureExternals: ['node:path'] }

const graph = (imports: { core?: string[]; shell?: string[] }, extra: ModuleImports[] = []): ModuleImports[] => [
  { module: 'a.ts', imports: imports.core ?? [] },
  { module: 'b.ts', imports: imports.shell ?? [] },
  ...extra,
]

describe('layerViolations', () => {
  it('passes a shell module importing a core module', () => {
    expect(layerViolations(graph({ shell: ['./a.ts'] }), rules)).toEqual([])
  })

  it('reports a core module importing a shell module', () => {
    expect(layerViolations(graph({ core: ['./b.ts'] }), rules))
      .toEqual(['core module a.ts imports shell module b.ts'])
  })

  it('lets a shell module import anything from outside', () => {
    expect(layerViolations(graph({ shell: ['node:fs', 'vite'] }), rules)).toEqual([])
  })

  it('reports a core module importing a dependency that is not pure', () => {
    expect(layerViolations(graph({ core: ['node:fs'] }), rules))
      .toEqual(['core module a.ts imports node:fs, which is not a pure dependency'])
  })

  it('accepts the pure dependencies the rules allow', () => {
    expect(layerViolations(graph({ core: ['node:path'] }), rules)).toEqual([])
  })

  it('reports an import that reaches outside the package', () => {
    expect(layerViolations(graph({ shell: ['../src/models/Todo.ts'] }), rules))
      .toEqual(['b.ts imports ../src/models/Todo.ts, which leaves the package'])
  })

  it('reports a module the layer map does not classify', () => {
    expect(layerViolations(graph({}, [{ module: 'c.ts', imports: [] }]), rules))
      .toEqual(['c.ts is not declared in the layer map'])
  })

  it('reports a classified module that no longer exists', () => {
    expect(layerViolations([{ module: 'a.ts', imports: [] }], rules))
      .toEqual(['the layer map declares b.ts, which does not exist'])
  })

  it('reports an import of a module the layer map does not know', () => {
    expect(layerViolations(graph({ shell: ['./a.ts', './gone.ts'] }), rules))
      .toEqual(['b.ts imports gone.ts, which the layer map does not declare'])
  })
})

describe('importCycles', () => {
  it('finds nothing in an acyclic graph', () => {
    expect(importCycles([
      { module: 'a.ts', imports: ['./b.ts'] },
      { module: 'b.ts', imports: [] },
    ])).toEqual([])
  })

  it('names the modules a cycle runs through', () => {
    expect(importCycles([
      { module: 'a.ts', imports: ['./b.ts'] },
      { module: 'b.ts', imports: ['./a.ts'] },
    ])).toEqual(['a.ts -> b.ts -> a.ts'])
  })

  it('finds a cycle that runs through three modules', () => {
    expect(importCycles([
      { module: 'a.ts', imports: ['./b.ts'] },
      { module: 'b.ts', imports: ['./c.ts'] },
      { module: 'c.ts', imports: ['./a.ts'] },
    ])).toEqual(['a.ts -> b.ts -> c.ts -> a.ts'])
  })

  it('ignores dependencies outside the package', () => {
    expect(importCycles([{ module: 'a.ts', imports: ['node:path', '../elsewhere.ts'] }])).toEqual([])
  })
})

describe('the acceptance package', () => {
  const modules = packageModules(acceptanceDir)

  it('keeps every module on the side of the boundary the rules declare', () => {
    expect(layerViolations(modules, acceptanceRules)).toEqual([])
  })

  it('has no import cycles', () => {
    expect(importCycles(modules)).toEqual([])
  })
})

describe('the application sources', () => {
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
