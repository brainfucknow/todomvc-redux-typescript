import { isAbsolute, relative } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * The acceptance run, deliberately a separate Vitest configuration from
 * vite.config.mts. `npm test` reads that file and knows only the `unit` and
 * `scripts` projects; generated acceptance tests are never part of its count.
 *
 * The files it runs are generated - see scripts/acceptance/run-acceptance.mjs -
 * so there is nothing to look at under `include` unless a run just produced it.
 * $ACCEPTANCE_GENERATED_DIR points the run at another generated tree, which is
 * what a mutation run does.
 */

const generated =
  process.env.ACCEPTANCE_GENERATED_DIR ?? 'build/acceptance/generated'
const include = isAbsolute(generated)
  ? relative(process.cwd(), generated)
  : generated

export default defineConfig({
  test: {
    name: 'acceptance',
    environment: 'node',
    include: [`${include}/**/*.acceptance.test.mjs`],
  },
})
