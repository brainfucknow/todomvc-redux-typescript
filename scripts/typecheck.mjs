import { spawnSync } from 'node:child_process'

/**
 * TypeScript 3.9 cannot parse the .d.ts files shipped by the project's current
 * dependencies, so a bare `tsc --noEmit` never exits zero. Until task 05 bumps
 * the compiler, gate on the project's own sources and report the rest as noise.
 */
const compiler = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8' })
const diagnostics = `${compiler.stdout ?? ''}${compiler.stderr ?? ''}`.split('\n').filter(Boolean)
const inSources = diagnostics.filter((line) => line.startsWith('src/'))

for (const line of inSources) {
  process.stdout.write(`${line}\n`)
}
const skipped = diagnostics.length - inSources.length
process.stdout.write(`${inSources.length} error(s) under src/, ${skipped} outside it (node_modules, task 05)\n`)
process.exit(inSources.length === 0 ? 0 : 1)
