import { defineConfig } from 'vitest/config'
import { renderingProject } from './vitest.rendering.ts'

// What the mutants are judged by: every deterministic test that exercises a
// mutated module, whichever tier owns it. Stryker runs this config; it is not
// a tier of its own and adds no test the other commands do not already run.
// `scripts/mutation.ts` reads the same lists to decide whether the recorded
// mutation results still stand, so the tiers are named once, here.

// The tests that decide something without a browser.
const toolingTests = [
  { directory: 'acceptance', suffix: '.spec.ts' },
  { directory: 'scripts', suffix: '.spec.ts' },
  { directory: 'hardening', suffix: '.hardening.ts' },
  { directory: 'property', suffix: '.property.ts' },
]

// The tests that render a component, which is what judges a mutated component.
const renderingTests = [
  { directory: 'src', suffix: '.spec.tsx' },
  { directory: 'hardening', suffix: '.hardening.tsx' },
]

// Not tests, but what the rendering tests are written against. Stryker notices
// a change to a source it mutates for itself; nothing mutates these, so without
// them a rewritten render helper would leave every recorded result reading as
// still earned. A new helper the tier's tests share belongs in this list.
const testSupport = [
  { directory: 'src', suffix: 'setupTests.ts' },
  { directory: 'src', suffix: 'test-render.tsx' },
  { directory: 'src', suffix: 'test-queries.ts' },
]

// Everything a recorded mutation result depends on that Stryker cannot see.
export const mutationTierFiles = [...toolingTests, ...renderingTests, ...testSupport]

const globs = (selections: { directory: string, suffix: string }[]): string[] =>
  selections.map(({ directory, suffix }) => `${directory}/**/*${suffix}`)

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'mutation',
          include: globs(toolingTests),
          environment: 'node',
        },
      },
      renderingProject(globs(renderingTests)),
    ],
  },
})
