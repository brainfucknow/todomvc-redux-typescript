import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GateFailure,
  resolveCompiler,
  spawnCompiler,
  typecheck,
} from './typecheck-gate.mjs'

/**
 * `npm run typecheck`: the projects, the process and the exit code, over the gate
 * in typecheck-gate.mjs, which decides without exiting so it can be tested.
 *
 * Six of the seven cover files no other project covers. The seventh,
 * src/todo-input/tsconfig.json, recompiles two modules the app already compiles,
 * with nothing around them; its own comment says what that proves.
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
