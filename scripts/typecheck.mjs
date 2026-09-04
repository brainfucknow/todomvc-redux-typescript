import { spawnSync } from 'node:child_process'

/**
 * TypeScript 3.9 cannot parse the .d.ts files shipped by the project's current
 * dependencies, so `tsc --noEmit` never exits zero and, while those parse errors
 * stand, withholds every semantic diagnostic. Until task 05 bumps the compiler
 * this gate is therefore limited to what tsc still reports about the project's
 * own sources; it turns into a full type check on the same script once the
 * node_modules parse errors are gone.
 */
const compiler = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8' })
if (compiler.error) {
  process.stderr.write(`could not run tsc: ${compiler.error.message}\n`)
  process.exit(1)
}

const diagnostics = `${compiler.stdout ?? ''}${compiler.stderr ?? ''}`.split('\n').filter(Boolean)
const inSources = diagnostics.filter((line) => line.startsWith('src/'))
const compilerRan = diagnostics.length > 0 || compiler.status === 0

for (const line of inSources) {
  process.stdout.write(`${line}\n`)
}
process.stdout.write(`${inSources.length} error(s) under src/, ${diagnostics.length - inSources.length} in dependencies (task 05)\n`)
if (!compilerRan) {
  process.stderr.write(`tsc exited ${compiler.status} without diagnostics\n`)
}
process.exit(inSources.length === 0 && compilerRan ? 0 : 1)
