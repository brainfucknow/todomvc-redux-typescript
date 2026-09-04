import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'

/**
 * The whole-program type gate's decisions, kept apart from the process that
 * runs them so a test can drive them. TypeScript 5 can parse every .d.ts the
 * project's dependencies ship, so a diagnostic anywhere - the app's sources,
 * the QA specs, or node_modules - fails this gate. There is no longer a
 * category of error it forgives.
 *
 * Two properties this gate must never lose, both of which it once did, and
 * `typecheck-gate.spec.mjs` holds a test for each way it lost them:
 *
 * It must never pass by accident. A run that reaches the summary line has
 * resolved the compiler, executed it, and read a complete tsc report back.
 * Anything else raises a GateFailure rather than reporting zero errors it never
 * looked for. Three shapes of "the compiler never checked anything" have
 * reached this project's main branch: `npx` failing to resolve `tsc` and its
 * complaint on stderr being counted as a dependency diagnostic; a project-level
 * error such as TS18003, which means tsc ran and compiled no file; and a
 * non-zero exit with nothing to explain it.
 *
 * It must not depend on the working directory. tsc searches ancestors for a
 * tsconfig.json and prints paths relative to wherever it was started, so a gate
 * that reads either of those reports something different when it runs from a
 * subdirectory - which is exactly what a CI `working-directory:` key produces.
 * Every project is named by an absolute path, run from the directory that holds
 * it, and reported relative to the repository root.
 *
 * One hole is known and open: a compiler that resolves, runs, exits 0 and
 * prints nothing is indistinguishable from a clean compile from outside the
 * process.
 */

/**
 * What this gate reads back from a compiler run. `spawnSync` returns more than
 * this and a test's stand-in compiler supplies less, so every field is
 * optional: the gate exists precisely to survive a compiler that produced none
 * of them.
 *
 * @typedef {object} CompilerRun
 * @property {number | null} [status]
 * @property {string} [stdout]
 * @property {string} [stderr]
 * @property {Error} [error]
 * @property {NodeJS.Signals | null} [signal]
 */

/**
 * One tsc diagnostic: its first line, rooted at the repository, followed by
 * however many elaboration lines tsc printed under it.
 *
 * @typedef {{ lines: string[] }} Diagnostic
 */

export class GateFailure extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = 'GateFailure'
  }
}

const LOCATED_DIAGNOSTIC = /^(\S.*?)\((\d+),(\d+)\): (?:error|warning) TS\d+: /
const PROJECT_DIAGNOSTIC = /^(?:error|warning) TS\d+: /
const MESSAGE_CONTINUATION = /^\s+\S/

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  throw new GateFailure(message)
}

/**
 * The compiler this project installed, never whatever a PATH lookup finds.
 *
 * @param {string} fromUrl
 * @returns {string}
 */
export function resolveCompiler(fromUrl) {
  let manifestPath
  try {
    manifestPath = createRequire(fromUrl).resolve('typescript/package.json')
  } catch (cause) {
    return fail(
      `could not resolve typescript from this project: ${/** @type {Error} */ (cause).message}`,
    )
  }
  const relativeBin = JSON.parse(readFileSync(manifestPath, 'utf8')).bin?.tsc
  if (!relativeBin) {
    return fail(
      `the installed typescript package declares no tsc binary (${manifestPath})`,
    )
  }
  return resolve(dirname(manifestPath), relativeBin)
}

/**
 * The one adapter: everything else in this file decides, this part spawns.
 *
 * @param {string} tsc
 * @param {string} project
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
export function spawnCompiler(tsc, project) {
  const args = [tsc, '--project', project, '--noEmit', '--pretty', 'false']
  return spawnSync(process.execPath, args, {
    cwd: dirname(project),
    encoding: 'utf8',
  })
}

/**
 * @param {string} project
 * @param {CompilerRun} run
 */
function readOutcome(project, run) {
  if (run.error) fail(`could not run tsc on ${project}: ${run.error.message}`)
  if (run.signal) fail(`tsc on ${project} was killed by ${run.signal}`)
  const noise = (run.stderr ?? '').trim()
  if (noise) {
    fail(
      `tsc on ${project} did not run to completion; it wrote to stderr:\n${noise}`,
    )
  }
}

/**
 * tsc reports paths relative to its own working directory, which is the
 * project's.
 *
 * @param {string} root
 * @param {string} project
 * @param {string} file
 * @returns {string}
 */
function reportedAt(root, project, file) {
  return relative(root, resolve(dirname(project), file))
}

/**
 * @param {string} root
 * @param {string} project
 * @param {string} stdout
 * @returns {Diagnostic[]}
 */
function readReport(root, project, stdout) {
  /** @type {Diagnostic[]} */
  const diagnostics = []
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue
    const located = LOCATED_DIAGNOSTIC.exec(line)
    const elaboration = MESSAGE_CONTINUATION.test(line)
      ? diagnostics[diagnostics.length - 1]
      : undefined
    if (located) {
      const rooted = line.replace(
        located[1],
        reportedAt(root, project, located[1]),
      )
      diagnostics.push({ lines: [rooted] })
    } else if (elaboration) {
      elaboration.lines.push(line)
    } else if (PROJECT_DIAGNOSTIC.test(line)) {
      fail(
        `tsc reported an error about ${project} itself, so no source file was checked:\n${line}`,
      )
    } else {
      fail(
        `tsc on ${project} printed output this gate cannot read as a diagnostic:\n${line}`,
      )
    }
  }
  return diagnostics
}

/**
 * @param {string} root
 * @param {string} project
 * @param {CompilerRun} run
 * @returns {Diagnostic[]}
 */
function check(root, project, run) {
  readOutcome(project, run)
  const diagnostics = readReport(root, project, run.stdout ?? '')
  if (run.status !== 0 && diagnostics.length === 0) {
    fail(
      `tsc exited ${run.status} on ${project} without reporting a diagnostic`,
    )
  }
  return diagnostics
}

/**
 * Runs every project through `runCompiler` and returns what a caller should
 * print and exit with. Raises a GateFailure instead of returning whenever the
 * compiler's behavior leaves the result unknown.
 *
 * @param {object} plan
 * @param {string} plan.root
 * @param {string[]} plan.projects
 * @param {(project: string) => CompilerRun} plan.runCompiler
 * @returns {{ errorCount: number, output: string }}
 */
export function typecheck({ root, projects, runCompiler }) {
  const errors = projects.flatMap((project) =>
    check(root, project, runCompiler(project)),
  )
  const names = projects.map((project) => relative(root, project)).join(', ')
  const report = errors.map(({ lines }) => `${lines.join('\n')}\n`).join('')
  return {
    errorCount: errors.length,
    output: `${report}${errors.length} error(s) in ${names}\n`,
  }
}
