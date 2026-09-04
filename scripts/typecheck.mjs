import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The whole-program type gate. TypeScript 5 can parse every .d.ts the project's
 * dependencies ship, so a diagnostic anywhere - the app's sources, the QA
 * specs, or node_modules - fails this gate. There is no longer a category of
 * error it forgives.
 *
 * Two properties this gate must never lose, both of which it once did:
 *
 * It must never pass by accident. A run that reaches the summary line has
 * resolved the compiler, executed it, and read a complete tsc report back.
 * Anything else exits non-zero here rather than reporting zero errors it never
 * looked for.
 *
 * It must not depend on the working directory. tsc searches ancestors for a
 * tsconfig.json and prints paths relative to wherever it was started, so a gate
 * that reads either of those reports something different when it runs from a
 * subdirectory - which is exactly what a CI `working-directory:` key produces.
 * Every project below is named by an absolute path anchored to this script, run
 * from the directory that holds it, and reported relative to the repository
 * root.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECTS = [
  resolve(ROOT, 'tsconfig.json'),
  resolve(ROOT, 'qa/tsconfig.json'),
]

const LOCATED_DIAGNOSTIC = /^(\S.*?)\((\d+),(\d+)\): (?:error|warning) TS\d+: /
const PROJECT_DIAGNOSTIC = /^(?:error|warning) TS\d+: /
const MESSAGE_CONTINUATION = /^\s+\S/

function fail(message) {
  process.stderr.write(`typecheck: ${message}\n`)
  process.exit(1)
}

function compilerPath() {
  try {
    const manifestPath = createRequire(import.meta.url).resolve(
      'typescript/package.json',
    )
    const relativeBin = JSON.parse(readFileSync(manifestPath, 'utf8')).bin?.tsc
    if (!relativeBin) {
      return fail(
        `the installed typescript package declares no tsc binary (${manifestPath})`,
      )
    }
    return resolve(dirname(manifestPath), relativeBin)
  } catch (cause) {
    return fail(
      `could not resolve typescript from this project: ${cause.message}`,
    )
  }
}

function runCompiler(tsc, project) {
  const args = [tsc, '--project', project, '--noEmit', '--pretty', 'false']
  const run = spawnSync(process.execPath, args, {
    cwd: dirname(project),
    encoding: 'utf8',
  })
  if (run.error) fail(`could not run tsc on ${project}: ${run.error.message}`)
  if (run.signal) fail(`tsc on ${project} was killed by ${run.signal}`)
  const noise = (run.stderr ?? '').trim()
  if (noise)
    fail(
      `tsc on ${project} did not run to completion; it wrote to stderr:\n${noise}`,
    )
  return run
}

/** tsc reports paths relative to its own working directory, which is the project's. */
function reportedAt(project, file) {
  return relative(ROOT, resolve(dirname(project), file))
}

function readReport(project, stdout) {
  const diagnostics = []
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue
    const located = LOCATED_DIAGNOSTIC.exec(line)
    const elaboration = MESSAGE_CONTINUATION.test(line)
      ? diagnostics[diagnostics.length - 1]
      : undefined
    if (located) {
      const rooted = line.replace(located[1], reportedAt(project, located[1]))
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

function check(tsc, project) {
  const run = runCompiler(tsc, project)
  const diagnostics = readReport(project, run.stdout ?? '')
  if (run.status !== 0 && diagnostics.length === 0) {
    fail(
      `tsc exited ${run.status} on ${project} without reporting a diagnostic`,
    )
  }
  return diagnostics
}

const compiler = compilerPath()
const errors = PROJECTS.flatMap((project) => check(compiler, project))
for (const { lines } of errors) {
  process.stdout.write(`${lines.join('\n')}\n`)
}
const projectNames = PROJECTS.map((project) => relative(ROOT, project)).join(
  ', ',
)
process.stdout.write(`${errors.length} error(s) in ${projectNames}\n`)
process.exit(errors.length === 0 ? 0 : 1)
