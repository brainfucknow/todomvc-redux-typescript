// Reading what the commands in `qa/toolchain-commands.md` print. Text in,
// answers out: no filesystem, no processes, nothing project-specific.
//
// The QA tier parses these itself rather than importing the project's own
// inspection code, so a procedure can fail on a project that is wrong about
// itself.

// Colour escapes, so a matcher never has to know about them.
export const plain = (text: string): string => text.replace(/\u001b\[[0-9;]*m/g, '')

// The tail of a Vitest summary line, e.g. `22 passed (22)`. Kept whole rather
// than reduced to a number: a run with failures or skips says so on this line,
// so comparing the whole tail checks the count and the health together.
export const summaryLine = (output: string, label: string): string => {
  const found = new RegExp(`^\\s*${label}\\s+(\\S.*?)\\s*$`, 'm').exec(plain(output))
  return found === null ? `no "${label}" line in the output` : found[1]
}

export const testFiles = (output: string): string => summaryLine(output, 'Test Files')
export const testCases = (output: string): string => summaryLine(output, 'Tests')

const RESULT_LINE = /^\s*([✓×↓✗])\s/
const SOURCE_FILE = /([\w./-]+\.tsx?)\s*$/
const DURATION = /\s+[\d.]+m?s$/
// `src/foo.spec.ts (3 tests) 12ms` - a file's own line, not a test's.
const FILE_SUMMARY = /\(\d+ tests?[^)]*\)$/

export type TestResult = {
  passed: boolean
  file: string
  name: string
}

// One result line: a marker, then either the full `[|project|] file > suite >
// ... > name` a verbose run prints, or just the name, which is what the default
// reporter's list of failures gives. Read whole rather than by marker alone, so
// the rows that require a *passing* test carrying an id and the rows that
// require a *failing* one read the same output the same way.
export const testResults = (output: string): TestResult[] => {
  const results: TestResult[] = []
  for (const line of plain(output).split('\n')) {
    const marked = RESULT_LINE.exec(line)
    if (marked === null) {
      continue
    }
    const named = line.slice(marked[0].length).split(' > ')
    const file = named.length > 1 ? SOURCE_FILE.exec(named[0]) : null
    const name = named[named.length - 1].replace(DURATION, '').trim()
    // A failure list names the test and nothing else, so a nameless-file result
    // is kept; a file's own summary line is not a test and is dropped.
    if ((named.length > 1 && file === null) || FILE_SUMMARY.test(name)) {
      continue
    }
    results.push({ passed: marked[1] === '✓', file: file === null ? '' : file[1], name })
  }
  return results
}

// Which files a `--reporter=verbose` run reported results from.
export const reportedFiles = (output: string): string[] =>
  [...new Set(testResults(output).map((result) => result.file))].sort()

// How many executions a named scenario reported, counted off the test names the
// generated entry points produce: `<scenario name>/example_<n>`.
export const scenarioExecutions = (output: string, scenario: string): number =>
  testResults(output).filter((result) => result.name.startsWith(`${scenario}/example_`)).length

// The behaviour ids `qa/component-behaviour-inventory.md` records, read out of
// the first cell of every table row that carries one. D2a1 asks for a passing
// test name holding each of them.
export const behaviourIds = (inventory: string): string[] =>
  [...inventory.matchAll(/^\| ([CN]\d+) \|/gm)].map((found) => found[1])

export type FrozenSuite = {
  file: string
  cases: number
  names: string[]
}

// The two out-of-scope spec files the inventory freezes, with the case count
// and the case names it freezes them at. D2a2 asks for exactly these.
export const frozenSuites = (inventory: string): FrozenSuite[] =>
  [...inventory.matchAll(/^\| `(\S+\.spec\.tsx?)` \| (\d+) \| (.+) \|$/gm)].map((found) => ({
    file: found[1],
    cases: Number(found[2]),
    names: [...found[3].matchAll(/`([^`]+)`/g)].map((name) => name[1]),
  }))

// The packages under a scope that a `package.json` declares, from either
// dependency block. A7 compares this against what the checkout imports.
export const declaredPackages = (packageJson: string, scope: string): string[] => {
  const manifest = JSON.parse(packageJson) as Record<string, Record<string, string> | undefined>
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
    .filter((name) => name.startsWith(scope))
    .sort()
}

// The packages under a scope that a `grep` over the checkout found named in an
// import or a require, read out of the quoted specifier.
export const importedPackages = (grepOutput: string, scope: string): string[] =>
  [...new Set([...plain(grepOutput).matchAll(/['"]([^'"]+)['"]/g)]
    .map((found) => found[1])
    .filter((name) => name.startsWith(scope)))].sort()

// The script names `npm run` prints. Two-space indent is a name; the command
// under it is indented further. Lifecycle scripts are printed in a block of
// their own, and are named the same way, so both blocks are read.
export const declaredScripts = (output: string): string[] =>
  [...plain(output).matchAll(/^ {2}(\S+)$/gm)].map((found) => found[1]).sort()

const section = (markdown: string, heading: string): string =>
  markdown.split(`\n## ${heading}\n`)[1]?.split('\n## ')[0] ?? ''

const headings = (markdown: string, heading: string): string[] =>
  [...section(markdown, heading).matchAll(/^### `([^`]+)`$/gm)].map((found) => found[1])

// The script names the README documents, one per `###` heading under
// `Available Scripts`: `npm run dev` and `npm test` both name a script.
export const documentedScripts = (readme: string): string[] =>
  headings(readme, 'Available Scripts').map((command) => command.replace(/^npm (run )?/, '')).sort()

// The commands the README documents under `Other checks`, as written.
export const documentedChecks = (readme: string): string[] => headings(readme, 'Other checks')

export type GitEntry = {
  status: string
  path: string
}

export const gitStatus = (output: string): GitEntry[] =>
  plain(output).split('\n').filter((line) => line.trim() !== '').map((line) => ({
    status: line.slice(0, 2).trim(),
    path: line.slice(3).trim(),
  }))

export const pathsWith = (entries: GitEntry[], status: string): string[] =>
  entries.filter((entry) => entry.status === status).map((entry) => entry.path)

export const isCoveredBy = (path: string, entries: string[]): boolean =>
  entries.some((entry) => path === entry || path === entry.replace(/\/$/, '') || path.startsWith(entry))
