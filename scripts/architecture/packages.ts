// The packages this project declares, and the layer map each one is held to.
//
// Core modules answer questions; shell modules reach the filesystem, the
// network, child processes or the test runner. Dependencies run shell -> core,
// so a core module may import only other core modules and dependencies that
// compute rather than perform.
//
// Every module in a declared directory has to appear in its map, so adding a
// file forces a core-or-shell decision rather than letting it land on either
// side. `vitest.coverage.ts` reads the shells back out of here, so a module is
// declared a shell once and both the boundary check and the CRAP gate follow.
import type { Layer, LayerRules } from './layering.ts'

export type PackageRules = {
  directory: string
  rules: LayerRules
}

// The APS acceptance pipeline: PLAN.md section 4 puts the project-written
// pipeline parts here and nothing else.
const acceptanceRules: LayerRules = {
  layers: {
    'assertions.ts': 'core',
    'generator.ts': 'core',
    'inspection.ts': 'core',
    'layout.ts': 'core',
    'mutation-jobs.ts': 'core',
    'runtime.ts': 'core',
    'commands.ts': 'shell',
    'fixtures.ts': 'shell',
    'generate-entrypoints.ts': 'shell',
    'mutation-worker.ts': 'shell',
    'pipeline.ts': 'shell',
    'project-files.ts': 'shell',
    'steps.ts': 'shell',
  },
  pureExternals: ['node:crypto', 'node:path'],
}

// The CRAP gate's core. Its only shell is `scripts/crap.mjs`, which sits
// outside the directory: it runs the tiers, reads their reports and the
// sources, and writes the lines. Nothing in here may reach an environment.
// `typescript` is pure as these modules use it - text in, AST out, never
// `ts.sys` - and it is what keeps complexity measured off a real parse.
const crapRules: LayerRules = {
  layers: {
    'complexity.ts': 'core',
    'coverage.ts': 'core',
    'options.ts': 'core',
    'report.ts': 'core',
    'score.ts': 'core',
    'tiers.ts': 'core',
  },
  pureExternals: ['node:path', 'typescript'],
}

// What the two mutation runners record between runs and when they believe it.
// The runners themselves are `scripts/mutation.ts` and
// `scripts/acceptance-mutation.ts`, outside the directory: they list what their
// stamp covers, spawn the mutator and write the stamp. `files.ts` is the one
// place inside that touches a disk, so every decision here can be tested
// without one.
const mutationReuseRules: LayerRules = {
  layers: {
    'fingerprint.ts': 'core',
    'layout.ts': 'core',
    'manifest.ts': 'core',
    'stamp.ts': 'core',
    'files.ts': 'shell',
  },
  pureExternals: ['node:crypto', 'node:path'],
}

// The boundary check itself, which is held to the rule it enforces. Reading
// the tree is the spec's job, so nothing here needs an environment at all.
const architectureRules: LayerRules = {
  layers: {
    'layering.ts': 'core',
    'packages.ts': 'core',
  },
  pureExternals: [],
}

export const PACKAGES: PackageRules[] = [
  { directory: 'acceptance', rules: acceptanceRules },
  { directory: 'scripts/crap', rules: crapRules },
  { directory: 'scripts/mutation-reuse', rules: mutationReuseRules },
  { directory: 'scripts/architecture', rules: architectureRules },
]

// Project-relative paths, for the callers that measure or skip a whole layer.
export const modulesIn = (layer: Layer): string[] => PACKAGES.flatMap(({ directory, rules }) =>
  Object.entries(rules.layers)
    .filter(([, declared]) => declared === layer)
    .map(([module]) => `${directory}/${module}`))
