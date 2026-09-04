import { defineConfig } from 'vitest/config'
import { generatedEntrypointGlob } from './acceptance/layout.ts'
import { generatedTests } from './vitest.generated-tests.ts'

export default defineConfig({
  test: generatedTests('acceptance', generatedEntrypointGlob),
})
