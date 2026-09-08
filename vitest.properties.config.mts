import { defineConfig } from 'vitest/config'

/**
 * The property run, a separate command and a separate configuration for the
 * same reason the acceptance run is: `npm test` reads vite.config.mts and knows
 * only the `unit` and `scripts` projects, so what runs here never joins that
 * count and the unit suite keeps meaning what it meant.
 *
 * Node environment and no jsdom: properties/ drives src/todo-api/client.ts,
 * which is the module that has no environment at all. A property that needed a
 * DOM would be a property of something else.
 */
export default defineConfig({
  test: {
    name: 'properties',
    environment: 'node',
    include: ['properties/**/*.property.test.ts'],
  },
})
