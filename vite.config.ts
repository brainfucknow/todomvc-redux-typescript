import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { measuredCoverage } from './vitest.coverage.ts'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.spec.{ts,tsx}', 'acceptance/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    coverage: measuredCoverage,
  },
})
