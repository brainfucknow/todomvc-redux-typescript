// `qa/toolchain-commands.md`, executed. One test per procedure, one step per
// lettered row.
//
// Every command run here is a public affordance: an npm script, a shell
// command, or a request to a server one of them started. Nothing imports a
// project module.
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isPortBound, npm, projectRoot, run, startBackendStub, startServer, type CommandResult } from './harness.ts'
import {
  behaviourIds,
  declaredPackages,
  declaredScripts,
  documentedChecks,
  documentedScripts,
  frozenSuites,
  gitStatus,
  importedPackages,
  isCoveredBy,
  pathsWith,
  plain,
  reportedFiles,
  scenarioExecutions,
  testCases,
  testFiles,
  testResults,
} from './reports.ts'

test.describe.configure({ mode: 'serial' })

const BACKEND_PORT = 4000
const BACKEND_BODY = '[{"id":1,"text":"Buy milk","completed":false}]'

const readme = (): string => readFileSync(join(projectRoot, 'README.md'), 'utf8')
const inventory = (): string => readFileSync(join(projectRoot, 'qa/component-behaviour-inventory.md'), 'utf8')

// The two packages procedure A requires gone: task 01 removed the first, task
// 02 the second. Every A row reads both.
const GONE_PACKAGES = ['react-scripts', 'react-shallow-renderer']

// A7's scope, and what "imported" means for it: a specifier an import or a
// require names, so a package merely mentioned in prose - which this file, the
// procedure, and the plan all do - is not a use.
const TESTING_LIBRARY = '@testing-library/'
const IMPORT_SPECIFIER = "(from|import|require\\() *\\(?'@testing-library/[a-z-]+'"
const UNREAD_BY_A7 = ['node_modules', 'dist', 'build', 'coverage'].map((directory) => `--exclude-dir=${directory}`)

// D5's breakdown, and the total D3 and D3a read as a green tier.
const SCENARIO_EXECUTIONS: Record<string, number> = {
  'development server 1': 4,
  'api proxy 1': 2,
  'production build 1': 3,
  'production build 2': 1,
  'production build 3': 1,
  'production build 4': 2,
  'toolchain dependencies 1': 3,
  'toolchain dependencies 2': 9,
  'toolchain dependencies 3': 3,
  'typescript compilation 1': 1,
  'typescript compilation 2': 1,
}
const TOTAL_EXECUTIONS = Object.values(SCENARIO_EXECUTIONS).reduce((total, count) => total + count, 0)

// What B3 reads off the page, so C5 can say "exactly as it did in B3" and mean it.
const expectTodoPage = async (page: Page): Promise<void> => {
  await expect(page).toHaveTitle('Redux TodoMVC Example')
  await expect(page.locator('h1')).toHaveText('todos')
  await expect(page.locator('input.new-todo')).toHaveAttribute('placeholder', 'What needs to be done?')
  await expect(page.locator('ul.todo-list li')).toHaveCount(1)
}

const filesUnder = (directory: string, matching: RegExp): string[] =>
  readdirSync(join(projectRoot, directory), { recursive: true, encoding: 'utf8' })
    .map((entry) => `${directory}/${entry.split('\\').join('/')}`)
    .filter((entry) => matching.test(entry))
    .sort()

// "the port is released", polled rather than sampled once. Killing the process
// group ends `npm run <script>`, but the server it spawned releases its
// listening socket a beat later - measured at ~20ms, and the single sample this
// replaces failed on it. Bounded, so a port a leaked child is still holding
// fails B8/C7 the way those rows intend.
const expectPortReleased = async (port: number): Promise<void> => {
  await expect.poll(() => isPortBound(port), { message: `port ${port} is still bound` }).toBe(false)
}

// `grep -c PATTERN FILE`, as C3a and C3b write it: matching lines, as a number.
// grep exits 1 when there are none and still prints `0`, which is the answer
// those rows want, so the exit code is not consulted.
const matchingLines = (marker: string, file: string): number =>
  Number(plain(run('grep', ['-c', '-F', marker, file]).output).trim())

// What C1 emitted, named and hashed, so procedure C's closing paragraph can say
// whether D3 left the same artifact behind.
const distFingerprint = (): string =>
  filesUnder('dist', /./)
    .filter((entry) => statSync(join(projectRoot, entry)).isFile())
    .map((file) => `${file} ${createHash('sha256').update(readFileSync(join(projectRoot, file))).digest('hex')}`)
    .join('\n')

// React's production entry carries both of these and its development entry
// carries neither, so their presence is what tells the two builds apart.
const PRODUCTION_MARKERS = ['Minified React error', 'act(...) is not supported in production builds of React.']
const DEVELOPMENT_MARKER = 'Invalid hook call'

// C3a's reading and C3b's, each taken in two places: on the artifact C1
// emitted, and again after D3 has rebuilt it.
const expectProductionEntry = (files: string[]): void => {
  for (const file of files) {
    for (const marker of PRODUCTION_MARKERS) {
      expect(matchingLines(marker, file), `${marker} in ${file}`).toBe(1)
    }
  }
}

const expectNoDevelopmentEntry = (files: string[]): void => {
  for (const file of files) {
    expect(matchingLines(DEVELOPMENT_MARKER, file), `${DEVELOPMENT_MARKER} in ${file}`).toBe(0)
  }
}

// The JavaScript C2 listed and the fingerprint C1's output hashed to, both read
// again in D once the acceptance tier has rebuilt `dist/`.
let bundles: string[] = []
let builtDist = ''

// What procedures A-D leave behind, recorded as they create it. E1 reads this
// rather than a list of directory names, so output a later task generates is
// covered without editing the procedure.
const generatedPaths: string[] = []

// Taken before any procedure runs, so E1 can tell what the run added.
let untrackedBefore: string[] = []

test.beforeAll(() => {
  untrackedBefore = pathsWith(gitStatus(run('git', ['status', '--porcelain', '--ignored']).output), '??')
})

test('Procedure A: install', async () => {
  await test.step('A1/A2 install from the lockfile into an empty tree', async () => {
    // Run in a scratch directory holding copies of the manifests: deleting this
    // project's `node_modules` would delete the runner executing the procedure.
    const scratch = mkdtempSync(join(tmpdir(), 'qa-install-'))
    try {
      for (const manifest of ['package.json', 'package-lock.json']) {
        copyFileSync(join(projectRoot, manifest), join(scratch, manifest))
      }
      const cleared = run('rm', ['-rf', 'node_modules'], scratch)
      expect(cleared.code).toBe(0)
      expect(existsSync(join(scratch, 'node_modules'))).toBe(false)

      const installed = run('npm', ['ci'], scratch)
      expect(installed.code, installed.output).toBe(0)
      for (const gone of GONE_PACKAGES) {
        expect(plain(installed.output), gone).not.toContain(gone)
      }
      expect(existsSync(join(scratch, 'node_modules'))).toBe(true)
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  await test.step('A3 grep the manifests', async () => {
    for (const gone of GONE_PACKAGES) {
      const counted = run('grep', ['-c', gone, 'package.json', 'package-lock.json'])
      expect(plain(counted.output).trim().split('\n'), gone).toEqual(['package.json:0', 'package-lock.json:0'])
    }
  })

  await test.step('A4 npm ls', async () => {
    for (const gone of GONE_PACKAGES) {
      const listed = npm('ls', gone)
      expect(plain(listed.output), gone).toContain('(empty)')
      expect(plain(listed.output), gone).not.toContain(`${gone}@`)
    }
  })

  await test.step('A5 grep the sources', async () => {
    for (const gone of GONE_PACKAGES) {
      const found = run('grep', ['-rn', gone, 'src'])
      expect(plain(found.output).trim(), gone).toBe('')
      expect(found.code, gone).toBe(1)
    }
  })

  await test.step('A6 the ambient declaration went with the package it declared', async () => {
    expect(existsSync(join(projectRoot, 'src/react-shallow-renderer.d.ts'))).toBe(false)
  })

  await test.step('A7 the declared testing-library packages are the imported ones', async () => {
    const declared = declaredPackages(readFileSync(join(projectRoot, 'package.json'), 'utf8'), TESTING_LIBRARY)
    const found = run('grep', ['-rhoE', IMPORT_SPECIFIER, ...UNREAD_BY_A7, '.'])
    const imported = importedPackages(found.output, TESTING_LIBRARY)
    // Two empty sets would agree, and would mean the grep stopped working
    // rather than that the checkout is clean.
    expect(imported.length, 'no testing-library import found, so A7 would pass by arithmetic').toBeGreaterThan(0)
    expect(declared, 'declared but not imported, or imported but not declared').toEqual(imported)
  })
})

test('Procedure B: development server and API proxy', async ({ page }) => {
  const backend = await startBackendStub(BACKEND_PORT, BACKEND_BODY)
  const dev = await startServer('dev')
  const headerSource = join(projectRoot, 'src/components/Header.tsx')
  const header = readFileSync(headerSource, 'utf8')
  try {
    await test.step('B1 a backend answers on port 4000', async () => {
      const answered = await fetch(`http://localhost:${BACKEND_PORT}/api/todos/`)
      expect(answered.status).toBe(200)
      expect(JSON.parse(await answered.text())).toBeInstanceOf(Array)
    })

    await test.step('B2 npm run dev prints a local URL', async () => {
      expect(dev.url).toMatch(/^http:\/\/localhost:\d+$/)
      expect(await isPortBound(dev.port)).toBe(true)
    })

    await test.step('B3 the page renders', async () => {
      await page.goto(dev.url)
      await expectTodoPage(page)
    })

    await test.step('B4 the proxy answers 200', async () => {
      expect((await fetch(`${dev.url}/api/todos/`)).status).toBe(200)
    })

    await test.step('B5 the proxy answers with what the backend served', async () => {
      expect(await (await fetch(`${dev.url}/api/todos/`)).text()).toBe(BACKEND_BODY)
    })

    await test.step('B6 the page requests api/todos/ and gets 200', async () => {
      const answers: number[] = []
      page.on('response', (response) => {
        if (new URL(response.url()).pathname.startsWith('/api/todos')) {
          answers.push(response.status())
        }
      })
      await page.reload()
      await expect.poll(() => answers.length).toBeGreaterThan(0)
      expect(answers.every((status) => status === 200)).toBe(true)
    })

    await test.step('B7 an edit reaches the open page without a reload', async () => {
      await page.evaluate(() => {
        ;(window as unknown as { qaLoadedOnce: boolean }).qaLoadedOnce = true
      })
      writeFileSync(headerSource, header.replace('<h1>todos</h1>', '<h1>todos, edited</h1>'))
      await expect(page.locator('h1')).toHaveText('todos, edited')
      const survived = await page.evaluate(() => (window as unknown as { qaLoadedOnce?: boolean }).qaLoadedOnce)
      expect(survived, 'the page reloaded instead of hot-updating').toBe(true)
    })

    await test.step('B8 revert the edit and stop the server', async () => {
      writeFileSync(headerSource, header)
      await expect(page.locator('h1')).toHaveText('todos')
      expect(readFileSync(headerSource, 'utf8')).toBe(header)
      await dev.stop()
      await expectPortReleased(dev.port)
    })
  } finally {
    writeFileSync(headerSource, header)
    await dev.stop()
    await backend.stop()
  }
})

test('Procedure C: production build and preview', async ({ page }) => {
  await test.step('C1 build', async () => {
    rmSync(join(projectRoot, 'dist'), { recursive: true, force: true })
    const built = npm('run', 'build')
    expect(built.code, built.output).toBe(0)
    expect(plain(built.output)).toContain('dist/index.html')
    builtDist = distFingerprint()
    generatedPaths.push('dist')
  })

  await test.step('C2 the build output', async () => {
    const emitted = filesUnder('dist', /./)
    expect(emitted).toContain('dist/index.html')
    bundles = emitted.filter((file) => file.endsWith('.js'))
    expect(bundles.length).toBeGreaterThan(0)
    expect(emitted.filter((file) => file.endsWith('.css')).length).toBeGreaterThan(0)
  })

  await test.step('C3 the built page references no TypeScript source', async () => {
    const counted = run('grep', ['-c', 'src/index.tsx', 'dist/index.html'])
    expect(plain(counted.output).trim()).toBe('0')
  })

  await test.step('C3a the bundle carries React\'s production entry', async () => {
    // An empty `bundles` would make the reading pass by arithmetic, so C2's own
    // count is asserted above and named again here.
    expect(bundles.length, 'C2 listed no JavaScript file for C3a to read').toBeGreaterThan(0)
    expectProductionEntry(bundles)
  })

  await test.step('C3b no development-mode React warning text is in the bundle', async () => {
    expectNoDevelopmentEntry(bundles)
  })

  const preview = await startServer('preview')
  const backend = await startBackendStub(BACKEND_PORT, BACKEND_BODY)
  try {
    await test.step('C4 npm run preview prints a local URL', async () => {
      expect(preview.url).toMatch(/^http:\/\/localhost:\d+$/)
      expect(await isPortBound(preview.port)).toBe(true)
    })

    const assets: { url: string; status: number }[] = []
    await test.step('C5 the previewed page renders as the dev page did', async () => {
      page.on('response', async (response) => {
        const kind = response.request().resourceType()
        if (kind === 'script' || kind === 'stylesheet') {
          assets.push({ url: response.url(), status: response.status() })
        }
      })
      await page.goto(preview.url)
      await expectTodoPage(page)
    })

    await test.step('C6 every script and stylesheet answers 200', async () => {
      await expect.poll(() => assets.length).toBeGreaterThan(0)
      expect(assets.filter((asset) => asset.status !== 200)).toEqual([])
    })

    await test.step('C7 stop the preview server', async () => {
      await preview.stop()
      await expectPortReleased(preview.port)
    })
  } finally {
    await preview.stop()
    await backend.stop()
  }
})

// A Vitest summary tail, as a number, requiring the run it came from to be
// clean: `28 passed (28)`. A run with failures or skips says so on this line,
// so a tail that is not of this shape fails the row reading it. The rows that
// record a total rather than matching one read it through here.
const cleanTotal = (tail: string): number => {
  const found = /^(\d+) passed \((\d+)\)$/.exec(tail)
  expect(found, `not a clean run: ${tail}`).not.toBeNull()
  expect(found![1], `not every test reported passed: ${tail}`).toBe(found![2])
  return Number(found![1])
}

type Totals = {
  files: number
  cases: number
}

const totalsOf = (output: string): Totals => ({
  files: cleanTotal(testFiles(output)),
  cases: cleanTotal(testCases(output)),
})

// What `npm test` is supposed to have run, read off the tree rather than
// listed here: `src/**/*.spec.{ts,tsx}`, `acceptance/*.spec.ts` and
// `scripts/**/*.spec.ts`. A task that splits or merges a spec file passes D2
// only by leaving the tree and the run agreeing.
const specFilesInTree = (): string[] => [
  ...filesUnder('src', /\.spec\.tsx?$/),
  ...filesUnder('acceptance', /^acceptance\/[^/]+\.spec\.ts$/),
  ...filesUnder('scripts', /\.spec\.ts$/),
].sort()

// The three commands procedure D runs more than once, each spelled where the
// row that names it can be read against the procedure.
const suiteUnderSrc = (): CommandResult => run('npx', ['vitest', 'run', 'src', '--reporter=verbose'])
const acceptanceTier = (): CommandResult => npm('run', 'test:acceptance')
const featureFiles = (): string[] => filesUnder('features', /\.feature$/)

// What `git status` says about one path, which is how the two rows that put a
// file back check that they did.
const gitStatusOf = (path: string): string => plain(run('git', ['status', '--porcelain', path]).output).trim()

const passingNames = (output: string): string[] =>
  testResults(output).filter((result) => result.passed).map((result) => result.name)

const failingNames = (output: string): string[] =>
  testResults(output).filter((result) => !result.passed).map((result) => result.name)

// D2a3-D2a5: break one behaviour, require a failing test carrying the id that
// answers it, put the file back. A green run there would mean D2a1 is
// attributing coverage to tests that assert nothing.
const expectBreakingFails = (file: string, behaviour: string, mutation: string, id: string): void => {
  const source = join(projectRoot, file)
  const original = readFileSync(source, 'utf8')
  expect(original.includes(behaviour), `${file} no longer holds the text this row breaks`).toBe(true)
  try {
    writeFileSync(source, original.replace(behaviour, mutation))
    const reran = suiteUnderSrc()
    expect(reran.code, `${file} was broken and the suite still passed`).not.toBe(0)
    expect(failingNames(reran.output).filter((name) => name.includes(id)), `no failing test carries ${id}`).not.toEqual([])
  } finally {
    writeFileSync(source, original)
  }
  // Procedure E watches untracked paths only, so a modification left behind
  // here has to be caught here.
  expect(gitStatusOf(file), `${file} was left modified`).toBe('')
}

test('Procedure D: test tiers', async () => {
  const unit = npm('test', '--', '--reporter=verbose')
  let whole: Totals = { files: 0, cases: 0 }

  await test.step('D1 npm test', async () => {
    expect(unit.code, unit.output).toBe(0)
    whole = totalsOf(unit.output)
  })

  await test.step('D2 the D1 file list is the spec files in the tree', async () => {
    const reported = reportedFiles(unit.output)
    expect(reported).toEqual(specFilesInTree())
    expect(reported.filter((file) =>
      file.startsWith('build/acceptance/generated/') || file.startsWith('property/') || file.startsWith('hardening/')))
      .toEqual([])
  })

  // D2a runs the suite and D2a1 re-runs it verbose; one verbose run answers
  // both, and prints the same summary line D2a reads.
  const underSrc = suiteUnderSrc()
  let src: Totals = { files: 0, cases: 0 }

  await test.step('D2a the component suite under src', async () => {
    expect(underSrc.code, underSrc.output).toBe(0)
    // Recorded, not matched: task 02 rewrote these files, so a moved total is
    // not by itself a finding. D2a1 is what must hold.
    src = totalsOf(underSrc.output)
    expect(src.files).toBeGreaterThan(0)
  })

  await test.step('D2a1 every behaviour id is carried by a passing test', async () => {
    const ids = behaviourIds(inventory())
    expect(ids.length, 'the inventory records no ids for D2a1 to trace').toBeGreaterThan(0)
    const passing = passingNames(underSrc.output)
    expect(ids.filter((id) => !passing.some((name) => name.includes(id))), 'behaviour ids with no passing test').toEqual([])
  })

  await test.step('D2a2 the two out-of-scope files are frozen', async () => {
    const frozen = frozenSuites(inventory())
    expect(frozen.length, 'the inventory freezes no file for D2a2 to read').toBeGreaterThan(0)
    for (const suite of frozen) {
      const reported = testResults(underSrc.output).filter((result) => result.file === suite.file)
      expect(reported.length, suite.file).toBe(suite.cases)
      expect(reported.filter((result) => !result.passed), suite.file).toEqual([])
      expect(reported.map((result) => result.name).sort(), suite.file).toEqual([...suite.names].sort())
    }
  })

  await test.step('D2a3 breaking the footer count fails C05', async () => {
    expectBreakingFails('src/components/Footer.tsx', "activeCount === 1 ? 'item' : 'items'", "'items'", 'C05')
  })

  await test.step('D2a4 breaking the destroy control fails C25', async () => {
    expectBreakingFails('src/components/TodoItem.tsx', 'deleteTodo(todo.id)', 'deleteTodo(todo.id + 1)', 'C25')
  })

  await test.step('D2a5 breaking the filter link class fails C13', async () => {
    expectBreakingFails('src/components/Link.tsx', 'classnames({ selected: active })', 'classnames({})', 'C13')
  })

  let pipeline: Totals = { files: 0, cases: 0 }

  await test.step('D2b the acceptance-pipeline unit tests', async () => {
    const suite = run('npx', ['vitest', 'run', 'acceptance'])
    expect(suite.code, suite.output).toBe(0)
    pipeline = totalsOf(suite.output)
    expect(pipeline.files).toBeGreaterThanOrEqual(5)
    expect(pipeline.cases).toBeGreaterThanOrEqual(63)
  })

  await test.step('D2c the project tooling unit tests, and the sum', async () => {
    const suite = run('npx', ['vitest', 'run', 'scripts'])
    expect(suite.code, suite.output).toBe(0)
    const tooling = totalsOf(suite.output)
    expect(tooling.files).toBeGreaterThanOrEqual(8)
    expect(tooling.cases).toBeGreaterThanOrEqual(111)
    // The three buckets are disjoint and exhaustive, so a case lost from one
    // cannot hide behind a case gained in another.
    expect(src.files + pipeline.files + tooling.files, 'the bucket file totals do not sum to D1').toBe(whole.files)
    expect(src.cases + pipeline.cases + tooling.cases, 'the bucket case totals do not sum to D1').toBe(whole.cases)
  })

  const acceptance = acceptanceTier()

  await test.step('D3 npm run test:acceptance', async () => {
    expect(acceptance.code, acceptance.output).toBe(0)
    const printed = plain(acceptance.output)
    const features = featureFiles()
    for (const feature of features) {
      expect(printed).toContain(`parsing ${feature}`)
      expect(printed).toContain(`generated build/acceptance/generated/${feature.split('/')[1].replace('.feature', '.acceptance.ts')}`)
    }
    expect(cleanTotal(testFiles(acceptance.output))).toBe(features.length)
    expect(cleanTotal(testCases(acceptance.output))).toBe(TOTAL_EXECUTIONS)
    generatedPaths.push('build/acceptance')
  })

  await test.step('D3a the absence scenarios can fail', async () => {
    // A scenario asserting a package is gone passes whenever the name is
    // missing, which is also what a scenario asserting nothing looks like.
    // Putting both names back, in the one place a scratch file can put them,
    // is what tells the two apart.
    const probe = 'src/absence-probe.ts'
    try {
      writeFileSync(join(projectRoot, probe), `export const probe = '${GONE_PACKAGES.join(' and ')}'\n`)
      const probed = acceptanceTier()
      expect(probed.code, 'the probe is in the tree and the acceptance tier stayed green').not.toBe(0)
      expect(failingNames(probed.output).sort())
        .toEqual(['toolchain dependencies 1/example_3', 'toolchain dependencies 3/example_3'])
      for (const gone of GONE_PACKAGES) {
        expect(plain(probed.output), gone).toContain(`"${gone}" still appears in ${probe}`)
      }
    } finally {
      rmSync(join(projectRoot, probe), { force: true })
    }
    const cleaned = acceptanceTier()
    expect(cleaned.code, cleaned.output).toBe(0)
    expect(cleanTotal(testCases(cleaned.output))).toBe(TOTAL_EXECUTIONS)
    expect(gitStatusOf(probe), 'the probe was left behind').toBe('')
  })

  // Procedure C's closing paragraph: D3 rebuilds `dist/` by running the
  // project's own `build` script, so it has to leave the artifact C1 emitted.
  // A difference here is a finding - the acceptance tier would be building
  // something other than what this project ships - not a reason to re-run C1.
  await test.step('C3a/C3b re-read after D3, and dist/ compared with what C1 emitted', async () => {
    expect(builtDist, 'procedure C has to run before this').not.toBe('')
    expect(distFingerprint(), 'D3 left a different artifact in dist/ than C1 emitted').toBe(builtDist)
    expectProductionEntry(bundles)
    expectNoDevelopmentEntry(bundles)
  })

  await test.step('D4 the pipeline output', async () => {
    const written = readdirSync(join(projectRoot, 'build/acceptance'))
    expect(written.sort()).toEqual(['generated', 'ir'])
    const features = featureFiles().length
    expect(filesUnder('build/acceptance/ir', /\.json$/).length).toBe(features)
    expect(filesUnder('build/acceptance/generated', /\.acceptance\.ts$/).length).toBe(features)
  })

  await test.step('D5 the scenario executions', async () => {
    const executions = run('npx', ['vitest', 'run', '--config', 'vitest.acceptance.config.ts', '--reporter=verbose'])
    expect(executions.code, executions.output).toBe(0)
    for (const [scenario, expected] of Object.entries(SCENARIO_EXECUTIONS)) {
      expect(scenarioExecutions(executions.output, scenario), scenario).toBe(expected)
    }
    expect(cleanTotal(testCases(executions.output))).toBe(TOTAL_EXECUTIONS)
  })

  await test.step('D6 the TypeScript compiler checks the project', async () => {
    const checked = run('npx', ['tsc', '--noEmit'])
    expect(plain(checked.output).trim()).toBe('')
    expect(checked.code).toBe(0)
  })

  await test.step('D7 the TypeScript compiler version', async () => {
    const version = plain(run('npx', ['tsc', '--version']).output).trim()
    expect(version).toMatch(/^Version \d+\.\d+\.\d+/)
    expect(Number(/^Version (\d+)\./.exec(version)![1])).toBeGreaterThanOrEqual(5)
  })

  const property = npm('run', 'test:property', '--', '--reporter=verbose')
  const hardening = npm('run', 'test:hardening', '--', '--reporter=verbose')
  let properties: Totals = { files: 0, cases: 0 }
  let hardened: Totals = { files: 0, cases: 0 }

  await test.step('D8 npm run test:property', async () => {
    expect(property.code, property.output).toBe(0)
    properties = totalsOf(property.output)
    expect(properties.files).toBeGreaterThanOrEqual(14)
    expect(properties.cases).toBeGreaterThanOrEqual(141)
  })

  await test.step('D9 npm run test:hardening', async () => {
    expect(hardening.code, hardening.output).toBe(0)
    hardened = totalsOf(hardening.output)
    expect(hardened.files).toBeGreaterThanOrEqual(12)
    expect(hardened.cases).toBeGreaterThanOrEqual(128)
  })

  await test.step('D10 the tiers do not overlap', async () => {
    const inUnit = reportedFiles(unit.output)
    const inProperty = reportedFiles(property.output)
    const inHardening = reportedFiles(hardening.output)
    expect(inProperty.length, 'the property file list and its summary disagree').toBe(properties.files)
    expect(inHardening.length, 'the hardening file list and its summary disagree').toBe(hardened.files)
    expect(inUnit.filter((file) => inProperty.includes(file) || inHardening.includes(file))).toEqual([])
    expect(inProperty.every((file) => file.startsWith('property/'))).toBe(true)
    expect(inHardening.every((file) => file.startsWith('hardening/'))).toBe(true)
  })
})

test('Procedure E: repository hygiene', async () => {
  await test.step('E1 nothing generated is untracked', async () => {
    const entries = gitStatus(run('git', ['status', '--porcelain', '--ignored']).output)
    const untracked = pathsWith(entries, '??')
    const ignored = pathsWith(entries, '!!')
    expect(untracked.filter((path) => !untrackedBefore.includes(path))).toEqual([])
    expect(generatedPaths.length, 'procedures A-D have to run before E1').toBeGreaterThan(0)
    for (const path of generatedPaths) {
      expect(isCoveredBy(path, ignored), `${path} is not ignored`).toBe(true)
    }
  })

  await test.step('E2 the README documents no command this task removed', async () => {
    for (const gone of ['react-scripts', 'npm start', 'npm run eject']) {
      expect(run('grep', ['-n', gone, 'README.md']).output.trim()).toBe('')
    }
  })

  await test.step('E3 the documented scripts are the declared scripts', async () => {
    const documented = documentedScripts(readme())
    const declared = declaredScripts(npm('run').output)
    expect(documented.length).toBeGreaterThan(0)
    expect(documented).toEqual(declared)
  })

  await test.step('E4 every documented check names a script file that is present', async () => {
    const checks = documentedChecks(readme())
    expect(checks.length).toBeGreaterThan(0)
    for (const check of checks) {
      const file = check.split(' ').find((word) => word.startsWith('scripts/'))!
      expect(existsSync(join(projectRoot, file)), `${file} is missing`).toBe(true)
    }
  })
})
