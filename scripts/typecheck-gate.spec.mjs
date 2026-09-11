import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import {
  GateFailure,
  resolveCompiler,
  spawnCompiler,
  typecheck,
} from './typecheck-gate.mjs'

// Three false greens have shipped from this gate, each reporting "0 error(s)" with
// nothing type-checked. The tests are named for the shape each took, not the tool.

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')

const ROOT = resolve('/repo')
const APP = resolve(ROOT, 'tsconfig.json')
const QA = resolve(ROOT, 'qa/tsconfig.json')

/** @typedef {import('./typecheck-gate.mjs').CompilerRun} CompilerRun */

/** @param {CompilerRun} result */
const compileTo = (result) => () => result
const clean = { status: 0, stdout: '', stderr: '' }

/**
 * @param {(project: string) => CompilerRun} runCompiler
 * @param {string[]} [projects]
 */
const runGate = (runCompiler, projects = [APP]) =>
  typecheck({ root: ROOT, projects, runCompiler })

describe('the type gate', () => {
  it('reports a clean compile as zero errors, naming every project it ran', () => {
    const { errorCount, output } = runGate(compileTo(clean), [APP, QA])

    expect(errorCount).toBe(0)
    expect(output).toBe('0 error(s) in tsconfig.json, qa/tsconfig.json\n')
  })

  it('counts a diagnostic in any project it was given', () => {
    const { errorCount, output } = runGate(
      compileTo({
        status: 1,
        stdout: "src/index.tsx(3,1): error TS2322: Type 'string' is not.\n",
        stderr: '',
      }),
    )

    expect(errorCount).toBe(1)
    expect(output).toContain('error TS2322')
    expect(output).toContain('1 error(s) in tsconfig.json\n')
  })

  it('keeps the elaboration lines that follow a diagnostic with it', () => {
    const { errorCount, output } = runGate(
      compileTo({
        status: 1,
        stdout: [
          'src/a.ts(1,1): error TS2345: Argument of type X is not assignable.',
          '  Types of property y are incompatible.',
          '    Type Z is not assignable to type W.',
          '',
        ].join('\n'),
        stderr: '',
      }),
    )

    expect(errorCount).toBe(1)
    expect(output).toContain('    Type Z is not assignable to type W.\n')
  })

  it('reports each diagnostic relative to the repository root, not to the project', () => {
    const { errorCount, output } = runGate(
      compileTo({
        status: 1,
        stdout:
          'tests/03-add-todo.spec.ts(9,3): error TS2551: No such thing.\n',
        stderr: '',
      }),
      [QA],
    )

    expect(errorCount).toBe(1)
    expect(output).toContain('qa/tests/03-add-todo.spec.ts(9,3): error TS2551')
    expect(output).not.toContain('\ntests/03-add-todo.spec.ts')
  })

  it('refuses a verdict when the compiler complained on stderr', () => {
    const npxCouldNotFindTsc = compileTo({
      status: 1,
      stdout: '',
      stderr: 'npm ERR! could not determine executable to run\n',
    })

    expect(() => runGate(npxCouldNotFindTsc)).toThrow(GateFailure)
    expect(() => runGate(npxCouldNotFindTsc)).toThrow(
      /did not run to completion.*could not determine executable/s,
    )
  })

  it('refuses a verdict when the compiler wrote to stderr and still exited 0', () => {
    expect(() =>
      runGate(
        compileTo({
          status: 0,
          stdout: '',
          stderr: 'node: bad option: --project\n',
        }),
      ),
    ).toThrow(GateFailure)
  })

  it('refuses a verdict when the compiler could not be spawned', () => {
    expect(() =>
      runGate(compileTo({ error: new Error('spawn ENOENT'), stdout: '' })),
    ).toThrow(/could not run tsc.*spawn ENOENT/s)
  })

  it('refuses a verdict when the compiler was killed', () => {
    expect(() =>
      runGate(compileTo({ signal: 'SIGKILL', status: null, stdout: '' })),
    ).toThrow(/killed by SIGKILL/)
  })

  it('refuses a verdict when tsc reported an error about the project itself', () => {
    expect(() =>
      runGate(
        compileTo({
          status: 1,
          stdout:
            "error TS18003: No inputs were found in config file '/repo/tsconfig.json'.\n",
          stderr: '',
        }),
      ),
    ).toThrow(/no source file was checked.*TS18003/s)
  })

  it('refuses a verdict when tsc exited non-zero with an empty report', () => {
    expect(() =>
      runGate(compileTo({ status: 2, stdout: '', stderr: '' })),
    ).toThrow(/exited 2 .* without reporting a diagnostic/s)
  })

  it('refuses a verdict on output it cannot read as a diagnostic', () => {
    expect(() =>
      runGate(compileTo({ status: 0, stdout: 'Version 5.9.3\n', stderr: '' })),
    ).toThrow(/cannot read as a diagnostic.*Version 5\.9\.3/s)
  })
})

describe('the compiler the gate resolves', () => {
  it("is the one this project installed, found through typescript's manifest", () => {
    const tsc = resolveCompiler(import.meta.url)

    expect(tsc).toBe(resolve(REPO, 'node_modules/typescript/bin/tsc'))
  })

  it('reports the failure to resolve rather than falling back to a PATH lookup', () => {
    const nowhere = new URL('file:///nowhere/typecheck-gate.mjs')

    expect(() => resolveCompiler(nowhere.href)).toThrow(
      /could not resolve typescript/,
    )
  })
})

// The compiler the project installed, over a throwaway project, so tsc itself
// decides what the output looks like.
describe('driving the real compiler over a throwaway project', () => {
  /** @type {string[]} */
  const fixtures = []

  afterAll(() => {
    for (const fixture of fixtures) {
      spawnSync('rm', ['-rf', fixture])
    }
  })

  /** @param {string} source */
  function fixtureProject(source) {
    const root = realpathSync(mkdtempSync(resolve(tmpdir(), 'typecheck-gate-')))
    fixtures.push(root)
    mkdirSync(resolve(root, 'qa'))
    writeFileSync(resolve(root, 'qa/subject.ts'), source)
    writeFileSync(
      resolve(root, 'qa/tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          types: [],
          target: 'ES2022',
        },
        include: ['.'],
      }),
    )
    return { root, project: resolve(root, 'qa/tsconfig.json') }
  }

  /** @param {string} source */
  function gateOver(source) {
    const { root, project } = fixtureProject(source)
    const tsc = resolveCompiler(import.meta.url)
    return typecheck({
      root,
      projects: [project],
      runCompiler: (each) => spawnCompiler(tsc, each),
    })
  }

  it('passes a project that compiles', { timeout: 120_000 }, () => {
    const { errorCount, output } = gateOver('export const n: number = 1\n')

    expect(errorCount).toBe(0)
    expect(output).toBe('0 error(s) in qa/tsconfig.json\n')
  })

  it(
    'fails a project with a type error, from the root',
    { timeout: 120_000 },
    () => {
      const { errorCount, output } = gateOver(
        "export const n: number = 'one'\n",
      )

      expect(errorCount).toBe(1)
      expect(output).toContain('qa/subject.ts(1,14): error TS2322')
      expect(output).toContain('1 error(s) in qa/tsconfig.json\n')
    },
  )
})

// The real script over the real projects, from two working directories - the move a
// CI `working-directory:` key would make. Naming all seven projects in the expected
// line is what turns dropping one red rather than quietly checking less.
describe('the gate as a command', () => {
  /** @param {string} cwd */
  const run = (cwd) =>
    spawnSync(process.execPath, [resolve(HERE, 'typecheck.mjs')], {
      cwd,
      encoding: 'utf8',
    })

  it(
    'gives the same verdict from a subdirectory as from the root',
    { timeout: 300_000 },
    () => {
      const fromRoot = run(REPO)
      const fromSubdirectory = run(resolve(REPO, 'src'))

      expect(fromRoot.stderr).toBe('')
      expect(fromRoot.status).toBe(0)
      expect(fromRoot.stdout).toBe(
        '0 error(s) in tsconfig.json, src/todo-input/tsconfig.json, qa/tsconfig.json, acceptance/tsconfig.json, properties/tsconfig.json, hardening/tsconfig.json, tsconfig.tools.json\n',
      )
      expect(fromSubdirectory.status).toBe(fromRoot.status)
      expect(fromSubdirectory.stdout).toBe(fromRoot.stdout)
    },
  )
})
