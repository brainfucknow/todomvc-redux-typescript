import { defineConfig } from 'vitest/config'
import { mutationEntrypointGlob } from './acceptance/layout.ts'
import { generatedTests } from './vitest.generated-tests.ts'

// One mutated feature at a time, against the entry point generated for it.
export default defineConfig({
  test: generatedTests('acceptance-mutation', mutationEntrypointGlob),
})
