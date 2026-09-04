import type { ViteUserConfig } from 'vitest/config'

type TestOptions = NonNullable<ViteUserConfig['test']>

// How a run of generated acceptance entry points is executed. Both the normal
// run and the mutation run drive the same fixtures - a production build, the
// dev and preview servers, and a backend stub on the fixed port 4000 - so both
// run one file at a time and allow for a build inside a single test.
export const generatedTests = (name: string, include: string): TestOptions => ({
  name,
  include: [include],
  environment: 'node',
  fileParallelism: false,
  testTimeout: 120_000,
  hookTimeout: 120_000,
})
