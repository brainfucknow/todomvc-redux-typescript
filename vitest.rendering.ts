import react from '@vitejs/plugin-react'
import type { ViteUserConfig } from 'vitest/config'

// How a test that renders a component is run, for the tiers that hold one.
//
// A DOM, the JSX transform and Testing Library's cleanup are what such a test
// needs and what nothing else in the project pays for, so a tier holding both
// kinds runs them as two projects rather than giving every test a browser. The
// `.tsx` extension is what tells the two apart, as it already does under `src/`.
//
// `vite.config.ts` does not use this. The unit tier is one jsdom project
// already, and it is the config Vite itself reads.
export const renderingProject = (include: string[]): ViteUserConfig => ({
  plugins: [react()],
  test: {
    name: 'rendering',
    globals: true,
    environment: 'jsdom',
    // A DOM per file costs about half a second to build, which the unit tier
    // pays once and the mutation tier would pay again for every mutant it
    // tests. `vmThreads` builds one per worker and still gives each file its
    // own, so the isolation is the same and the tier is a third cheaper. If a
    // rendering test ever fails only here, this is the first thing to undo.
    pool: 'vmThreads',
    setupFiles: ['./src/setupTests.ts'],
    include,
  },
})
