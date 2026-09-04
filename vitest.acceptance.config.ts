import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'acceptance',
    include: ['build/acceptance/generated/*.acceptance.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
