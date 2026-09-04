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
import { isPortBound, npm, projectRoot, run, startBackendStub, startServer } from './harness.ts'
import {
  declaredScripts,
  documentedChecks,
  documentedScripts,
  gitStatus,
  isCoveredBy,
  pathsWith,
  plain,
  reportedFiles,
  scenarioExecutions,
  testCases,
  testFiles,
} from './reports.ts'

test.describe.configure({ mode: 'serial' })

const BACKEND_PORT = 4000
const BACKEND_BODY = '[{"id":1,"text":"Buy milk","completed":false}]'

const readme = (): string => readFileSync(join(projectRoot, 'README.md'), 'utf8')

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
      expect(plain(installed.output)).not.toMatch(/react-scripts/)
      expect(existsSync(join(scratch, 'node_modules'))).toBe(true)
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  await test.step('A3 grep the manifests', async () => {
    const counted = run('grep', ['-c', 'react-scripts', 'package.json', 'package-lock.json'])
    expect(plain(counted.output).trim().split('\n')).toEqual(['package.json:0', 'package-lock.json:0'])
  })

  await test.step('A4 npm ls react-scripts', async () => {
    const listed = npm('ls', 'react-scripts')
    expect(plain(listed.output)).toContain('(empty)')
    expect(plain(listed.output)).not.toMatch(/react-scripts@/)
  })

  await test.step('A5 grep the sources', async () => {
    const found = run('grep', ['-rn', 'react-scripts', 'src'])
    expect(plain(found.output).trim()).toBe('')
    expect(found.code).toBe(1)
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

test('Procedure D: test tiers', async () => {
  const unit = npm('test', '--', '--reporter=verbose')

  await test.step('D1 npm test', async () => {
    expect(unit.code, unit.output).toBe(0)
    expect(testFiles(unit.output)).toBe('23 passed (23)')
    expect(testCases(unit.output)).toBe('228 passed (228)')
  })

  await test.step('D2 the D1 file list', async () => {
    expect(reportedFiles(unit.output)).toEqual([
      ...filesUnder('src', /\.spec\.tsx?$/),
      'acceptance/assertions.spec.ts',
      'acceptance/generator.spec.ts',
      'acceptance/inspection.spec.ts',
      'acceptance/layout.spec.ts',
      'acceptance/runtime.spec.ts',
      'scripts/architecture/layering.spec.ts',
      'scripts/architecture/packages.spec.ts',
      'scripts/crap/complexity.spec.ts',
      'scripts/crap/coverage.spec.ts',
      'scripts/crap/options.spec.ts',
      'scripts/crap/report.spec.ts',
      'scripts/crap/score.spec.ts',
      'scripts/crap/tiers.spec.ts',
    ].sort())
    expect(reportedFiles(unit.output).filter((file) =>
      file.startsWith('build/acceptance/generated/') || file.startsWith('property/') || file.startsWith('hardening/')))
      .toEqual([])
  })

  await test.step('D2a the pre-existing suite under src', async () => {
    const suite = run('npx', ['vitest', 'run', 'src'])
    expect(suite.code, suite.output).toBe(0)
    expect(testFiles(suite.output)).toBe('10 passed (10)')
    expect(testCases(suite.output)).toBe('54 passed (54)')
  })

  await test.step('D2b the acceptance-pipeline unit tests', async () => {
    const suite = run('npx', ['vitest', 'run', 'acceptance'])
    expect(suite.code, suite.output).toBe(0)
    expect(testFiles(suite.output)).toBe('5 passed (5)')
    expect(testCases(suite.output)).toBe('63 passed (63)')
  })

  await test.step('D2c the project tooling unit tests, and the sum', async () => {
    const suite = run('npx', ['vitest', 'run', 'scripts'])
    expect(suite.code, suite.output).toBe(0)
    expect(testFiles(suite.output)).toBe('8 passed (8)')
    expect(testCases(suite.output)).toBe('111 passed (111)')
    expect(54 + 63 + 111).toBe(228)
    expect(10 + 5 + 8).toBe(23)
  })

  const acceptance = npm('run', 'test:acceptance')

  await test.step('D3 npm run test:acceptance', async () => {
    expect(acceptance.code, acceptance.output).toBe(0)
    const printed = plain(acceptance.output)
    for (const feature of filesUnder('features', /\.feature$/)) {
      expect(printed).toContain(`parsing ${feature}`)
      expect(printed).toContain(`generated build/acceptance/generated/${feature.split('/')[1].replace('.feature', '.acceptance.ts')}`)
    }
    expect(testFiles(acceptance.output)).toBe('5 passed (5)')
    expect(testCases(acceptance.output)).toBe('27 passed (27)')
    generatedPaths.push('build/acceptance')
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
    expect(filesUnder('build/acceptance/ir', /\.json$/).length).toBe(5)
    expect(filesUnder('build/acceptance/generated', /\.acceptance\.ts$/).length).toBe(5)
  })

  await test.step('D5 the scenario executions', async () => {
    const executions = run('npx', ['vitest', 'run', '--config', 'vitest.acceptance.config.ts', '--reporter=verbose'])
    expect(executions.code, executions.output).toBe(0)
    const counted = {
      'development server 1': 4,
      'api proxy 1': 2,
      'production build 1': 3,
      'production build 2': 1,
      'production build 3': 1,
      'production build 4': 2,
      'toolchain dependencies 1': 3,
      'toolchain dependencies 2': 9,
      'typescript compilation 1': 1,
      'typescript compilation 2': 1,
    }
    for (const [scenario, expected] of Object.entries(counted)) {
      expect(scenarioExecutions(executions.output, scenario), scenario).toBe(expected)
    }
    expect(Object.values(counted).reduce((total, count) => total + count, 0)).toBe(27)
    expect(testCases(executions.output)).toBe('27 passed (27)')
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

  await test.step('D8 npm run test:property', async () => {
    expect(property.code, property.output).toBe(0)
    expect(testFiles(property.output)).toBe('14 passed (14)')
    expect(testCases(property.output)).toBe('141 passed (141)')
  })

  await test.step('D9 npm run test:hardening', async () => {
    expect(hardening.code, hardening.output).toBe(0)
    expect(testFiles(hardening.output)).toBe('12 passed (12)')
    expect(testCases(hardening.output)).toBe('128 passed (128)')
  })

  await test.step('D10 the tiers do not overlap', async () => {
    const inUnit = reportedFiles(unit.output)
    const inProperty = reportedFiles(property.output)
    const inHardening = reportedFiles(hardening.output)
    expect(inProperty.length).toBe(14)
    expect(inHardening.length).toBe(12)
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
