import { defineConfig } from 'vitest/config'
import { measuredCoverage } from './vitest.coverage.ts'

export default defineConfig({
  test: {
    name: 'hardening',
    include: ['hardening/**/*.hardening.ts'],
    environment: 'node',
    coverage: measuredCoverage,
  },
})
