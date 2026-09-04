import { modulesIn } from './scripts/architecture/packages.ts'

// Language mutation. What gets mutated is the core of every package the project
// declares - the modules that decide something and that a deterministic tier
// measures. That list is not restated here: `scripts/architecture/packages.ts`
// owns the core-or-shell decision, `vitest.coverage.ts` reads the shells out of
// it to decide what the CRAP gate measures, and this reads the cores out of it
// to decide what Stryker mutates. Declaring a module a shell in its layer map
// therefore takes it out of both, once.
//
// The shells are translation: they reach the filesystem, the network, child
// processes or the test runner, and mutating them would need the acceptance
// tier - the bootstrapped Go binaries, a production build and live servers -
// per mutant.
export default {
  $schema: './node_modules/@stryker-mutator/core/schema/stryker-schema.json',
  packageManager: 'npm',

  // Stryker's own Vitest runner reports false survivors on Vitest 5: a mutant
  // it activates at runtime - every function body - runs no test at all and
  // comes back Survived, while only module-level mutants are really tested.
  // The command runner is version-independent, at the cost of running the whole
  // mutation tier per mutant. Before switching back, check that a mutant inside
  // a function body actually dies.
  testRunner: 'command',
  // `--bail=1` because a mutant needs a verdict, not a report: the first
  // failing test has already killed it, and the rest of the tier is time paid
  // for nothing. A mutant nothing kills still runs the whole tier, which is
  // the run whose result has to be complete. It is on the command rather than
  // in the config so that running the tier by hand still reports every test.
  commandRunner: {
    command: 'npx vitest run --config vitest.mutation.config.ts --bail=1',
  },
  coverageAnalysis: 'off',

  // The components are here as well, and they are the one mutated source that
  // belongs to no package. Task 02 rewrote every component spec against
  // rendered output, and the CRAP gate reports those functions at 100%
  // coverage; coverage says the tests ran the code, and only mutation says
  // whether they would have noticed it change. The rest of `src/` stays out:
  // nothing else in it was rewritten, `callAPIMiddleware` is 0% covered by a
  // task that is barred from testing it, and the reducers and selectors belong
  // to whichever task next opens them.
  mutate: [...modulesIn('core'), 'src/components/*.tsx', '!src/components/*.spec.tsx'],

  // The compiler rejects a mutant that could not have been written: `'core'`
  // to `""` in a layer map, or a dropped `!== undefined` filter. Reporting
  // those as survivors would be noise.
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',

  // The command runner runs the whole mutation tier per mutant, so Stryker's
  // default ceiling - 5s plus 1.5x the initial run - sits close enough to a
  // healthy run under concurrency that a mutant can be recorded as Timeout when
  // an assertion is what really killed it. A Timeout counts as detected either
  // way, which is what makes it dangerous: a mutant that would have survived is
  // scored as killed if it happens to run slow. The tier takes about seven
  // seconds, so 60s catches only a mutant that genuinely does not terminate.
  timeoutMS: 60_000,

  incremental: true,
  incrementalFile: '.mutation/stryker-incremental.json',
  tempDirName: 'build/stryker-tmp',
  cleanTempDir: true,

  reporters: ['clear-text', 'progress'],
  clearTextReporter: { allowColor: false, maxTestsToLog: 0 },
  thresholds: { high: 100, low: 100, break: 100 },
}
