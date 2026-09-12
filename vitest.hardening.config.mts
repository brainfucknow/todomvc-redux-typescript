import { defineConfig } from 'vitest/config'

/**
 * The hardening run: the tests written to kill a mutant that survived, and
 * nothing else. A separate command and a separate configuration for the reason
 * the acceptance and property runs are - `npm test` reads vite.config.mts and
 * knows only the `unit` and `scripts` projects, so what runs here never joins
 * that count and the unit suite keeps meaning what it meant.
 *
 * Node environment: what these tests drive is the todo API policy module and
 * the repository's own tooling, none of which has a DOM.
 */
export default defineConfig({
  test: {
    name: 'hardening',
    environment: 'node',
    include: ['hardening/**/*.hardening.test.ts'],
  },
})
