import { defineConfig } from 'vitest/config'
import { measuredCoverage } from './vitest.coverage.ts'

export default defineConfig({
  test: {
    name: 'property',
    include: ['property/**/*.property.ts'],
    environment: 'node',
    coverage: measuredCoverage,
  },
})
