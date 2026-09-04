import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const apiProxy = { '/api': 'http://localhost:4000' }

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  /**
   * Two suites with nothing in common but the runner, so each is its own
   * project and `vitest run --project <name>` reports either one's file and
   * test counts on its own:
   *
   *   unit     the application's specs, in a browser-shaped environment
   *   scripts  the repository's own tooling, in Node, with no DOM to speak of
   */
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.spec.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'scripts',
          environment: 'node',
          include: ['scripts/**/*.spec.mjs'],
        },
      },
    ],
  },
})
