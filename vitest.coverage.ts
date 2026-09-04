import type { ViteUserConfig } from 'vitest/config'
import { modulesIn } from './scripts/architecture/packages.ts'

type CoverageOptions = NonNullable<NonNullable<ViteUserConfig['test']>['coverage']>

// What the CRAP gate measures. Every tier that reports coverage reports it over
// the same sources, so `scripts/crap.mjs` can merge the tiers and score a
// function against the union of the tests that exercise it. The tool decides
// where each tier's report is written; this decides what is in it.
//
// `scripts/**` is in so that the gate measures its own core, which is the one
// piece of project logic nothing else judges. The entry point that runs the
// tiers is `scripts/crap.mjs`, a shell like the others below, and the include
// reaches only TypeScript, so it stays out without an exclude of its own.
export const measuredCoverage: CoverageOptions = {
  provider: 'v8',
  reporter: ['text-summary', 'json'],
  include: ['src/**/*.{ts,tsx}', 'acceptance/**/*.ts', 'scripts/**/*.ts'],
  // Adapter shells: browser mount, filesystem, servers and child processes,
  // and the CLI wrappers around them. Their logic lives in the modules they
  // call; what is left is translation no tier can observe as a decision.
  //
  // Inside a declared package a module is a shell because its layer map says
  // so, and `scripts/architecture/packages.spec.ts` makes every module in the
  // package pick a side, so a new one cannot land here by being forgotten.
  // Listed below are only the shells that belong to no package: the browser
  // entry point, the test setup, and the CLI wrappers under `scripts/`.
  exclude: [
    '**/*.spec.{ts,tsx}',
    '**/*.d.ts',
    'src/index.tsx',
    'src/setupTests.ts',
    'scripts/acceptance.ts',
    'scripts/acceptance-mutation.ts',
    'scripts/mutation.ts',
    ...modulesIn('shell'),
  ],
}
