import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Layer, LayerRules, ModuleImports } from '../scripts/architecture/layering.ts'
import { importCycles, layerViolations } from '../scripts/architecture/layering.ts'

const PURE = ['node:path', 'node:crypto']

const moduleNames = fc.uniqueArray(fc.stringMatching(/^[a-z]{1,6}$/), { minLength: 2, maxLength: 6 })
  .map((names) => names.map((name) => `${name}.ts`))

type Package = { names: string[]; layers: Layer[]; rules: LayerRules }

const packages = moduleNames.chain((names) => fc
  .array(fc.constantFrom<Layer>('core', 'shell'), { minLength: names.length, maxLength: names.length })
  .map((layers) => ({
    names,
    layers,
    rules: {
      layers: Object.fromEntries(names.map((name, index) => [name, layers[index]])),
      pureExternals: PURE,
    },
  })))

const withEdges = (edges: boolean[][]) => (pack: Package): ModuleImports[] =>
  pack.names.map((module, from) => ({
    module,
    imports: pack.names
      .filter((_, to) => edges[from][to])
      .map((member) => `./${member}`),
  }))

const square = (size: number) => fc.array(
  fc.array(fc.boolean(), { minLength: size, maxLength: size }),
  { minLength: size, maxLength: size },
)

const withOneImport = (pack: Package, from: number, specifier: string): ModuleImports[] =>
  pack.names.map((module, index) => ({ module, imports: index === from ? [specifier] : [] }))

const indexOfLayer = (pack: Package, layer: Layer): number => pack.layers.indexOf(layer)

const bothLayers = packages.filter((pack) =>
  pack.layers.includes('core') && pack.layers.includes('shell'))

describe('layerViolations', () => {
  it('reports nothing when every import runs shell -> core', () => {
    fc.assert(fc.property(packages.chain((pack) => square(pack.names.length)
      .map((edges) => ({ pack, edges }))), ({ pack, edges }) => {
      const legal = pack.names.map((module, from) => ({
        module,
        imports: [
          ...pack.names
            .filter((_, to) => edges[from][to] && (pack.layers[from] === 'shell' || pack.layers[to] === 'core'))
            .map((member) => `./${member}`),
          ...(pack.layers[from] === 'core' ? PURE : ['node:fs', 'vitest']),
        ],
      }))
      expect(layerViolations(legal, pack.rules)).toEqual([])
    }))
  })

  it('reports every core module that imports a shell module', () => {
    fc.assert(fc.property(bothLayers, (pack) => {
      const core = indexOfLayer(pack, 'core')
      const shell = pack.names[indexOfLayer(pack, 'shell')]
      expect(layerViolations(withOneImport(pack, core, `./${shell}`), pack.rules))
        .toEqual([`core module ${pack.names[core]} imports shell module ${shell}`])
    }))
  })

  it('reports every core module that imports a dependency the rules do not call pure', () => {
    const impure = fc.stringMatching(/^[a-z][a-z:/-]{0,12}$/).filter((name) => !PURE.includes(name))
    fc.assert(fc.property(packages.filter((pack) => pack.layers.includes('core')), impure, (pack, external) => {
      const core = indexOfLayer(pack, 'core')
      expect(layerViolations(withOneImport(pack, core, external), pack.rules))
        .toEqual([`core module ${pack.names[core]} imports ${external}, which is not a pure dependency`])
    }))
  })

  it('lets a shell module import anything that is not a package member', () => {
    const external = fc.stringMatching(/^[a-z][a-z:/-]{0,12}$/)
    fc.assert(fc.property(bothLayers, external, (pack, specifier) => {
      const shell = indexOfLayer(pack, 'shell')
      expect(layerViolations(withOneImport(pack, shell, specifier), pack.rules)).toEqual([])
    }))
  })

  it('reports any relative import that climbs out of the package, from either layer', () => {
    const outside = fc.stringMatching(/^\.\.\/[a-z]{1,6}\/[a-z]{1,6}\.ts$/)
    fc.assert(fc.property(packages, fc.nat(5), outside, (pack, pick, specifier) => {
      const from = pick % pack.names.length
      expect(layerViolations(withOneImport(pack, from, specifier), pack.rules))
        .toEqual([`${pack.names[from]} imports ${specifier}, which leaves the package`])
    }))
  })

  it('reports an import of a member the layer map does not declare', () => {
    fc.assert(fc.property(packages, fc.nat(5), fc.stringMatching(/^[a-z]{1,6}$/), (pack, pick, absent) => {
      fc.pre(!pack.names.includes(`${absent}.ts`))
      const from = pick % pack.names.length
      expect(layerViolations(withOneImport(pack, from, `./${absent}.ts`), pack.rules))
        .toEqual([`${pack.names[from]} imports ${absent}.ts, which the layer map does not declare`])
    }))
  })

  it('makes the map and the package agree in both directions', () => {
    fc.assert(fc.property(packages, fc.nat(5), (pack, pick) => {
      const dropped = pack.names[pick % pack.names.length]
      const graph = pack.names.map((module) => ({ module, imports: [] }))
      expect(layerViolations(graph.filter((entry) => entry.module !== dropped), pack.rules))
        .toEqual([`the layer map declares ${dropped}, which does not exist`])
      expect(layerViolations([...graph, { module: 'extra.ts', imports: [] }], pack.rules))
        .toEqual(['extra.ts is not declared in the layer map'])
    }))
  })
})

describe('importCycles', () => {
  it('reports a ring once, naming every module it runs through', () => {
    fc.assert(fc.property(moduleNames, (names) => {
      const ring = names.map((module, index) => ({
        module,
        imports: [`./${names[(index + 1) % names.length]}`],
      }))
      const [cycle, ...rest] = importCycles(ring)
      expect(rest).toEqual([])
      const walked = cycle.split(' -> ')
      expect(walked).toHaveLength(names.length + 1)
      expect(walked[0]).toBe(walked[walked.length - 1])
      expect(new Set(walked)).toEqual(new Set(names))
    }))
  })

  it('reports nothing when every import points forward', () => {
    fc.assert(fc.property(packages.chain((pack) => square(pack.names.length)
      .map((edges) => withEdges(edges.map((row, from) => row.map((edge, to) => edge && to > from)))(pack))),
    (forwardOnly) => {
      expect(importCycles(forwardOnly)).toEqual([])
    }))
  })

  it('never closes a cycle through a specifier that is not a package member', () => {
    const outside = fc.array(fc.stringMatching(/^(node:[a-z]{1,6}|\.\.\/[a-z]{1,6}\.ts)$/), { maxLength: 3 })
    fc.assert(fc.property(moduleNames, outside, (names, imports) => {
      expect(importCycles(names.map((module) => ({ module, imports })))).toEqual([])
    }))
  })
})
