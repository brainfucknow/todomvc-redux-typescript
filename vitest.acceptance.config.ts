import { defineConfig } from 'vitest/config'
import { generatedEntrypointGlob } from './acceptance/layout.ts'

export default defineConfig({
  test: {
    name: 'acceptance',
    include: [generatedEntrypointGlob],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
