export type Layer = 'core' | 'shell'

export type ModuleImports = {
  module: string
  imports: string[]
}

export type LayerRules = {
  layers: Record<string, Layer>
  pureExternals: string[]
}

// Core modules answer questions; shell modules reach the filesystem, the
// network, child processes or the test runner. Dependencies run shell -> core,
// so a core module may import only other core modules and dependencies that
// compute rather than perform.
export const acceptanceRules: LayerRules = {
  layers: {
    'generator.ts': 'core',
    'inspection.ts': 'core',
    'layering.ts': 'core',
    'layout.ts': 'core',
    'runtime.ts': 'core',
    'commands.ts': 'shell',
    'fixtures.ts': 'shell',
    'generate-entrypoints.ts': 'shell',
    'project-files.ts': 'shell',
    'steps.ts': 'shell',
  },
  pureExternals: ['node:crypto', 'node:path'],
}

const packageMember = (specifier: string): string | undefined =>
  specifier.startsWith('./') ? specifier.slice(2) : undefined

const leavesPackage = (specifier: string): boolean =>
  specifier.startsWith('.') && packageMember(specifier) === undefined

const memberFault = (module: string, member: string, rules: LayerRules): string | undefined => {
  const layer = rules.layers[member]
  if (!layer) {
    return `${module} imports ${member}, which the layer map does not declare`
  }
  if (rules.layers[module] === 'core' && layer === 'shell') {
    return `core module ${module} imports shell module ${member}`
  }
  return undefined
}

const externalFault = (module: string, specifier: string, rules: LayerRules): string | undefined => {
  if (rules.layers[module] !== 'core' || rules.pureExternals.includes(specifier)) {
    return undefined
  }
  return `core module ${module} imports ${specifier}, which is not a pure dependency`
}

const importFault = (module: string, specifier: string, rules: LayerRules): string | undefined => {
  if (leavesPackage(specifier)) {
    return `${module} imports ${specifier}, which leaves the package`
  }
  const member = packageMember(specifier)
  return member ? memberFault(module, member, rules) : externalFault(module, specifier, rules)
}

const classificationFaults = (modules: ModuleImports[], rules: LayerRules): string[] => {
  const present = new Set(modules.map((entry) => entry.module))
  return [
    ...modules
      .filter((entry) => !(entry.module in rules.layers))
      .map((entry) => `${entry.module} is not declared in the layer map`),
    ...Object.keys(rules.layers)
      .filter((module) => !present.has(module))
      .map((module) => `the layer map declares ${module}, which does not exist`),
  ]
}

export function layerViolations(modules: ModuleImports[], rules: LayerRules): string[] {
  return [
    ...classificationFaults(modules, rules),
    ...modules.flatMap((entry) =>
      entry.imports.flatMap((specifier) => importFault(entry.module, specifier, rules) ?? [])),
  ]
}

export function importCycles(modules: ModuleImports[]): string[] {
  const edges = new Map(modules.map((entry) => [
    entry.module,
    entry.imports.map(packageMember).filter((member): member is string => member !== undefined),
  ]))
  const cycles: string[] = []
  const finished = new Set<string>()

  const walk = (module: string, path: string[]): void => {
    if (path.includes(module)) {
      cycles.push([...path.slice(path.indexOf(module)), module].join(' -> '))
      return
    }
    if (finished.has(module)) {
      return
    }
    for (const next of edges.get(module) ?? []) {
      walk(next, [...path, module])
    }
    finished.add(module)
  }

  for (const entry of modules) {
    walk(entry.module, [])
  }
  return cycles
}
