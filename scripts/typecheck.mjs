import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

/**
 * TypeScript 3.9 cannot parse the .d.ts files shipped by the project's current
 * dependencies, so `tsc --noEmit` never exits zero and, while those parse errors
 * stand, withholds every semantic diagnostic. Until task 05 bumps the compiler
 * this gate is therefore limited to what tsc still reports about the project's
 * own sources; it turns into a full type check on the same script once the
 * node_modules parse errors are gone.
 *
 * Because the gate is narrow it must never pass by accident: a run that reaches
 * the summary line has resolved the compiler, executed it, and read a complete
 * tsc report back. Anything else exits non-zero here rather than reporting zero
 * errors it never looked for.
 */

const LOCATED_DIAGNOSTIC = /^(\S.*?)\((\d+),(\d+)\): (?:error|warning) TS\d+: /
const PROJECT_DIAGNOSTIC = /^(?:error|warning) TS\d+: /
const MESSAGE_CONTINUATION = /^\s+\S/

function fail(message) {
  process.stderr.write(`typecheck: ${message}\n`)
  process.exit(1)
}

function compilerPath() {
  try {
    const manifestPath = createRequire(import.meta.url).resolve('typescript/package.json')
    const relativeBin = JSON.parse(readFileSync(manifestPath, 'utf8')).bin?.tsc
    if (!relativeBin) {
      return fail(`the installed typescript package declares no tsc binary (${manifestPath})`)
    }
    return resolve(dirname(manifestPath), relativeBin)
  } catch (cause) {
    return fail(`could not resolve typescript from this project: ${cause.message}`)
  }
}

function runCompiler(tsc) {
  const run = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false'], { encoding: 'utf8' })
  if (run.error) fail(`could not run tsc: ${run.error.message}`)
  if (run.signal) fail(`tsc was killed by ${run.signal}`)
  const noise = (run.stderr ?? '').trim()
  if (noise) fail(`tsc did not run to completion; it wrote to stderr:\n${noise}`)
  return run
}

function readReport(stdout) {
  const diagnostics = []
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue
    const located = LOCATED_DIAGNOSTIC.exec(line)
    const elaboration = MESSAGE_CONTINUATION.test(line) ? diagnostics[diagnostics.length - 1] : undefined
    if (located) {
      diagnostics.push({ file: located[1], lines: [line] })
    } else if (elaboration) {
      elaboration.lines.push(line)
    } else if (PROJECT_DIAGNOSTIC.test(line)) {
      fail(`tsc reported a project-level error, so no source file was checked:\n${line}`)
    } else {
      fail(`tsc printed output this gate cannot read as a diagnostic:\n${line}`)
    }
  }
  return diagnostics
}

const compiler = runCompiler(compilerPath())
const diagnostics = readReport(compiler.stdout ?? '')
if (compiler.status !== 0 && diagnostics.length === 0) {
  fail(`tsc exited ${compiler.status} without reporting a diagnostic`)
}

const inSources = diagnostics.filter(({ file }) => file.startsWith('src/'))
for (const { lines } of inSources) {
  process.stdout.write(`${lines.join('\n')}\n`)
}
process.stdout.write(`${inSources.length} error(s) under src/, ${diagnostics.length - inSources.length} in dependencies (task 05)\n`)
process.exit(inSources.length === 0 ? 0 : 1)
