import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GateFailure,
  resolveCompiler,
  spawnCompiler,
  typecheck,
} from './typecheck-gate.mjs'

/**
 * `npm run typecheck`. The gate itself lives in typecheck-gate.mjs, which
 * decides without exiting so it can be tested; this file supplies the two
 * projects, the process, and the exit code.
 *
 * The projects are absolute paths anchored to this script rather than found by
 * ancestor search, so the verdict is the same from any working directory. Do
 * not put a `working-directory:` on the CI step without re-proving that.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECTS = [
  resolve(ROOT, 'tsconfig.json'),
  resolve(ROOT, 'qa/tsconfig.json'),
]

try {
  const tsc = resolveCompiler(import.meta.url)
  const { errorCount, output } = typecheck({
    root: ROOT,
    projects: PROJECTS,
    runCompiler: (project) => spawnCompiler(tsc, project),
  })
  process.stdout.write(output)
  process.exit(errorCount === 0 ? 0 : 1)
} catch (failure) {
  if (!(failure instanceof GateFailure)) throw failure
  process.stderr.write(`typecheck: ${failure.message}\n`)
  process.exit(1)
}
