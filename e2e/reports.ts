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

const RESULT_LINE = /^\s*[✓×↓✗]\s/
const SOURCE_FILE = /([\w./-]+\.tsx?)\s*$/

// Which files a `--reporter=verbose` run reported results from.
export const reportedFiles = (output: string): string[] => {
  const files = new Set<string>()
  for (const line of plain(output).split('\n')) {
    const [head] = line.split(' > ')
    const found = SOURCE_FILE.exec(head)
    if (RESULT_LINE.test(line) && found !== null) {
      files.add(found[1])
    }
  }
  return [...files].sort()
}

// How many executions a named scenario reported, counted off the test names the
// generated entry points produce: `<scenario name>/example_<n>`.
export const scenarioExecutions = (output: string, scenario: string): number =>
  plain(output).split('\n').filter((line) => RESULT_LINE.test(line) && line.includes(`> ${scenario}/example_`)).length

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
