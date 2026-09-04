import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

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
    include: ['src/**/*.spec.{ts,tsx}', 'acceptance/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      include: ['src/**/*.{ts,tsx}', 'acceptance/**/*.ts'],
      // Adapter shells: browser mount, filesystem, servers and child processes,
      // and the CLI wrappers around them. Their logic lives in the modules they
      // call; what is left is translation the unit tier cannot observe.
      exclude: [
        '**/*.spec.{ts,tsx}',
        '**/*.d.ts',
        'src/index.tsx',
        'src/setupTests.ts',
        'acceptance/commands.ts',
        'acceptance/fixtures.ts',
        'acceptance/generate-entrypoints.ts',
        'acceptance/project-files.ts',
        'acceptance/steps.ts',
      ],
    },
  },
})
