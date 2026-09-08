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
 * decides without exiting so it can be tested; this file supplies the
 * projects, the process, and the exit code.
 *
 * Six of the seven projects are here because no file in this repository should
 * sit outside all of them: the app, the QA suite, the acceptance pipeline's
 * runtime and step handlers, the property suite, the hardening suite, and the
 * tooling - which includes this script and the gate module it imports, so the
 * thing deciding whether the project typechecks is itself typechecked.
 *
 * The seventh covers no new file. `src/todo-input/tsconfig.json` compiles two
 * modules the app project already compiles, a second time and with nothing
 * around them, because that is the only way to check a claim task 11 makes
 * about them: no React, and no DOM type in the signature. Its own comment says
 * what it proves and how it was shown to fail.
 *
 * The projects are absolute paths anchored to this script rather than found by
 * ancestor search, so the verdict is the same from any working directory. Do
 * not put a `working-directory:` on the CI step without re-proving that.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECTS = [
  resolve(ROOT, 'tsconfig.json'),
  resolve(ROOT, 'src/todo-input/tsconfig.json'),
  resolve(ROOT, 'qa/tsconfig.json'),
  resolve(ROOT, 'acceptance/tsconfig.json'),
  resolve(ROOT, 'properties/tsconfig.json'),
  resolve(ROOT, 'hardening/tsconfig.json'),
  resolve(ROOT, 'tsconfig.tools.json'),
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
