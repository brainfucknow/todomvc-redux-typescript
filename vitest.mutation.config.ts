import { defineConfig } from 'vitest/config'

// What the mutants are judged by: every deterministic test that exercises a
// mutated module, whichever tier owns it. Stryker runs this config; it is not
// a tier of its own and adds no test the other commands do not already run.
// `scripts/mutation.ts` reads the same list to decide whether the recorded
// mutation results still stand, so the tiers are named once, here.
export const mutationTierTests = [
  { directory: 'acceptance', suffix: '.spec.ts' },
  { directory: 'scripts', suffix: '.spec.ts' },
  { directory: 'hardening', suffix: '.hardening.ts' },
  { directory: 'property', suffix: '.property.ts' },
]

export default defineConfig({
  test: {
    name: 'mutation',
    include: mutationTierTests.map(({ directory, suffix }) => `${directory}/**/*${suffix}`),
    environment: 'node',
  },
})
