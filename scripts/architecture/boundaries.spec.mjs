import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { importTargetsOf } from './imports.mjs'
import { cyclesOf, violationsOf } from './boundaries.mjs'
import { BOUNDARY_RULES } from './rules.mjs'

/**
 * Two halves, and both are needed.
 *
 * The first half proves the checker can fail: every rule shape is driven with
 * a module that breaks it and a module that does not, because a boundary check
 * that cannot say no is a comment with a test runner attached.
 *
 * The second half runs the real rules over the real repository. That is what
 * turns four handoff notes into a gate: `npm test` runs it, and CI runs
 * `npm test`, so a later task that imports fetch into the policy module or
 * pulls test-support into shipped code goes red here rather than in review.
 *
 * What it still cannot prove is that any *particular* rule in rules.mjs would
 * catch anything, because a repository that obeys every rule says the same
 * thing as a repository with no rules at all. `hardening/rules.hardening.test.ts`
 * is the half that breaks each rule on purpose.
 *
 * qa/ is deliberately outside the scan. QA owns it, and a dependency rule
 * written here would constrain a role that never reads this file.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCANNED = ['src', 'acceptance', 'properties', 'hardening', 'scripts']
const SOURCE = /\.(ts|tsx|mjs)$/

describe('reading what a module imports', () => {
  it('resolves a relative import to a repository path with no extension', () => {
    expect(
      importTargetsOf(
        'src/actions/api.ts',
        "export { loadTodosCall } from '../todo-api/client'",
      ),
    ).toStrictEqual(['src/todo-api/client'])
  })

  it('keeps a package specifier exactly as written', () => {
    expect(
      importTargetsOf(
        'src/store/index.ts',
        "import { Middleware } from 'redux'\nimport x from '@testing-library/react'",
      ),
    ).toStrictEqual(['redux', '@testing-library/react'])
  })

  it('counts a type-only import, which is still one module naming another', () => {
    expect(
      importTargetsOf(
        'src/todo-api/fetchTransport.ts',
        "import type { SendRequest } from './client'",
      ),
    ).toStrictEqual(['src/todo-api/client'])
  })

  it('counts side-effect, dynamic and require imports', () => {
    expect(
      importTargetsOf(
        'scripts/x.mjs',
        "import './setup.mjs'\nawait import('./late.mjs')\nrequire('node:fs')",
      ),
    ).toStrictEqual(['scripts/setup', 'scripts/late', 'node:fs'])
  })

  it('names each target once, however often it is imported', () => {
    expect(
      importTargetsOf(
        'src/a.ts',
        "import { one } from './b'\nimport type { Two } from './b'",
      ),
    ).toStrictEqual(['src/b'])
  })
})

/**
 * @param {string} path
 * @param {...string} targets
 * @returns {{path: string, targets: string[]}}
 */
const module = (path, ...targets) => ({ path, targets })

describe('checking a module graph against a rule', () => {
  it('fails a target outside an allow list, and passes one inside it', () => {
    const rules = [
      {
        name: 'transport talks to the client only',
        files: ['src/todo-api/fetchTransport.ts'],
        allow: ['src/todo-api/client'],
        reason: 'the adapter translates',
      },
    ]

    expect(
      violationsOf(
        [module('src/todo-api/fetchTransport.ts', 'src/todo-api/client')],
        rules,
      ),
    ).toStrictEqual([])
    expect(
      violationsOf(
        [module('src/todo-api/fetchTransport.ts', 'src/reducers/todos')],
        rules,
      ),
    ).toStrictEqual([
      {
        module: 'src/todo-api/fetchTransport.ts',
        target: 'src/reducers/todos',
        rule: 'transport talks to the client only',
        reason: 'the adapter translates',
      },
    ])
  })

  it('fails an empty allow list on any import at all', () => {
    const rules = [
      {
        name: 'policy depends on nothing',
        files: ['src/todo-api/client.ts'],
        allow: [],
        reason: 'it answers domain questions',
      },
    ]

    expect(
      violationsOf([module('src/todo-api/client.ts')], rules),
    ).toStrictEqual([])
    expect(
      violationsOf([module('src/todo-api/client.ts', 'redux')], rules).map(
        (violation) => violation.target,
      ),
    ).toStrictEqual(['redux'])
  })

  it('fails a denied target and lets everything else through', () => {
    const rules = [
      {
        name: 'no test support in shipped code',
        files: ['src/**'],
        except: ['src/**/*.spec.ts'],
        deny: ['src/test-support/**'],
        reason: 'it calls vi',
      },
    ]

    expect(
      violationsOf(
        [module('src/components/App.tsx', 'src/test-support/store')],
        rules,
      ).map((violation) => violation.module),
    ).toStrictEqual(['src/components/App.tsx'])
    expect(
      violationsOf([module('src/components/App.tsx', 'react')], rules),
    ).toStrictEqual([])
  })

  it('skips a module the rule excepts', () => {
    const rules = [
      {
        name: 'no test support in shipped code',
        files: ['src/**'],
        except: ['src/**/*.spec.ts'],
        deny: ['src/test-support/**'],
        reason: 'it calls vi',
      },
    ]

    expect(
      violationsOf(
        [module('src/components/App.spec.ts', 'src/test-support/store')],
        rules,
      ),
    ).toStrictEqual([])
  })

  it('matches one segment with * and any number with **', () => {
    const rules = [
      {
        name: 'node only in tooling',
        files: ['src/*.ts'],
        deny: ['node:*'],
        reason: 'the app is not a Node program',
      },
    ]

    expect(
      violationsOf([module('src/index.ts', 'node:fs')], rules),
    ).toHaveLength(1)
    expect(
      violationsOf([module('src/deep/index.ts', 'node:fs')], rules),
    ).toStrictEqual([])
  })
})

describe('finding import cycles', () => {
  it('sees nothing in an acyclic graph', () => {
    expect(
      cyclesOf([
        module('a.ts', 'b'),
        module('b.ts', 'c'),
        module('c.ts'),
        module('d.ts', 'b'),
      ]),
    ).toStrictEqual([])
  })

  it('reports a loop once, as the loop', () => {
    expect(
      cyclesOf([module('a.ts', 'b'), module('b.ts', 'c'), module('c.ts', 'a')]),
    ).toStrictEqual([['a.ts', 'b.ts', 'c.ts', 'a.ts']])
  })

  it('follows a directory import to its index module', () => {
    expect(
      cyclesOf([
        module('acceptance/runtime.ts', 'acceptance/steps'),
        module('acceptance/steps/index.ts', 'acceptance/runtime'),
      ]),
    ).toStrictEqual([
      [
        'acceptance/runtime.ts',
        'acceptance/steps/index.ts',
        'acceptance/runtime.ts',
      ],
    ])
  })

  it('ignores an import of something outside the scanned set', () => {
    expect(cyclesOf([module('a.ts', 'redux', 'node:fs')])).toStrictEqual([])
  })
})

/**
 * The repository itself. Read once so a failure names every violation at once
 * rather than one per run.
 */
const repository = SCANNED.flatMap((directory) =>
  sourcesUnder(join(ROOT, directory)).map((file) => {
    const path = relative(ROOT, file).split(sep).join('/')
    return { path, targets: importTargetsOf(path, readFileSync(file, 'utf8')) }
  }),
)

describe('this repository', () => {
  it('has modules to check, so an empty scan cannot pass for a clean one', () => {
    expect(repository.length).toBeGreaterThan(30)
    expect(repository.map((module) => module.path)).toContain(
      'src/todo-api/client.ts',
    )
  })

  /**
   * The rules are only as good as the graph they are checked against, and the
   * graph comes out of a regex. These are the edges of the modules task 09
   * drew a boundary around, written out so an over-reading pattern - one that
   * mistook prose for an import - fails here rather than passing everywhere.
   */
  it('has the import edges it looks like it has', () => {
    /** @param {string} path */
    const targetsOf = (path) =>
      repository.find((module) => module.path === path)?.targets

    expect(targetsOf('src/todo-api/client.ts')).toStrictEqual([])
    expect(targetsOf('src/todo-api/fetchTransport.ts')).toStrictEqual([
      'src/todo-api/client',
    ])
    expect(targetsOf('src/actions/api.ts')).toStrictEqual([
      '@reduxjs/toolkit',
      'src/todo-api/client',
      'src/models/Todo',
    ])
    expect(targetsOf('src/store/index.ts')).toStrictEqual([
      '@reduxjs/toolkit',
      'src/reducers',
      'src/actions/api',
      'src/todo-api/client',
    ])
    expect(targetsOf('src/index.tsx')).toStrictEqual([
      'react',
      'react-dom/client',
      'react-redux',
      'src/components/App',
      'src/store',
      'src/todo-api/fetchTransport',
      'todomvc-app-css/index.css',
    ])
    expect(targetsOf('acceptance/runtime.ts')).toStrictEqual([
      'node:fs',
      'vitest',
    ])
    expect(targetsOf('acceptance/run-feature.ts')).toStrictEqual([
      'acceptance/runtime',
      'acceptance/steps',
    ])
    expect(
      targetsOf('properties/todo-api-client.property.test.ts'),
    ).toStrictEqual(['vitest', 'src/todo-api/client', 'properties/tiny-check'])
  })

  it('obeys every boundary rule', () => {
    expect(violationsOf(repository, BOUNDARY_RULES)).toStrictEqual([])
  })

  it('has no import cycles', () => {
    expect(cyclesOf(repository)).toStrictEqual([])
  })
})

/**
 * @param {string} directory
 * @returns {string[]}
 */
function sourcesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourcesUnder(path)
    return SOURCE.test(entry.name) ? [path] : []
  })
}
