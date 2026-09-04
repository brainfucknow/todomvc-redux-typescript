import { defineConfig } from 'vitest/config'
import { measuredCoverage } from './vitest.coverage.ts'
import { renderingProject } from './vitest.rendering.ts'

export default defineConfig({
  test: {
    coverage: measuredCoverage,
    projects: [
      {
        test: {
          name: 'hardening',
          include: ['hardening/**/*.hardening.ts'],
          environment: 'node',
        },
      },
      renderingProject(['hardening/**/*.hardening.tsx']),
    ],
  },
})
