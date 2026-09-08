import { describe, expect, it } from 'vitest'
import { violationsOf } from '../scripts/architecture/boundaries.mjs'
import { BOUNDARY_RULES } from '../scripts/architecture/rules.mjs'

/**
 * Every rule in `scripts/architecture/rules.mjs`, broken on purpose.
 *
 * `boundaries.spec.mjs` runs the real rules over the real repository, which
 * says nothing at all about whether any particular rule works: a repository
 * that obeys every rule gives the same answer as a repository with no rules.
 * A mutation scan said so out loud - deleting the whole rule list, emptying any
 * rule's globs, or blanking any pattern in it left the suite green. That is the
 * shape of gate this project keeps finding and removing.
 *
 * So each rule gets a module that breaks it and a module that obeys it, and the
 * last test asserts the table names every rule there is. A rule added without a
 * planted violation turns this file red, which is the point: the cost of a new
 * boundary is proving it can fail.
 */

const module = (path: string, ...targets: string[]) => ({
  path,
  targets,
})

/**
 * What the real rules say about these modules, as `[rule, target]` pairs - so a
 * module that breaks nothing reads as `[]` and one test shape covers both
 * directions.
 */
const judged = (...modules: { path: string; targets: string[] }[]) =>
  violationsOf(modules, BOUNDARY_RULES).map((violation) => [
    violation.rule,
    violation.target,
  ])

describe('the todo API policy depends on nothing', () => {
  it('refuses any import at all, including one that looks harmless', () => {
    expect(judged(module('src/todo-api/client.ts', 'redux'))).toStrictEqual([
      ['the todo API policy depends on nothing', 'redux'],
    ])
    expect(
      judged(module('src/todo-api/client.ts', 'src/constants/ActionTypes')),
    ).toStrictEqual([
      ['the todo API policy depends on nothing', 'src/constants/ActionTypes'],
    ])
  })

  it('is content with the module as it stands, importing nothing', () => {
    expect(judged(module('src/todo-api/client.ts'))).toStrictEqual([])
  })
})

describe('the todo input rules depend on nothing', () => {
  it('refuses the way back into a component: React, a DOM type, the store', () => {
    expect(
      judged(
        module('src/todo-input/field.ts', 'react'),
        module('src/todo-input/effects.ts', 'src/components/TodoItem'),
        module('src/todo-input/field.ts', 'src/store'),
        module('src/todo-input/effects.ts', 'src/models/Todo'),
      ).map(([, target]) => target),
    ).toStrictEqual([
      'react',
      'src/components/TodoItem',
      'src/store',
      'src/models/Todo',
    ])
  })

  it('refuses a module the directory does not have yet, not just the two it has', () => {
    expect(
      judged(module('src/todo-input/editing.ts', 'react')).map(
        ([, target]) => target,
      ),
    ).toStrictEqual(['react'])
  })

  it('is content with the two modules as they stand, importing nothing', () => {
    expect(
      judged(
        module('src/todo-input/field.ts'),
        module('src/todo-input/effects.ts'),
      ),
    ).toStrictEqual([])
  })

  /**
   * Both spellings of the exception, because they are a pair and the directory
   * as it stands exercises only one. The first covers a spec sitting in the
   * directory, which is where both of today's are; the second covers a spec
   * under it, and needs saying separately because `**` stands for at least one
   * segment here and so matches nothing this directory has. Without the third
   * module below, dropping the second pattern changes no answer anywhere -
   * which is how a mutation scan found it.
   */
  it('lets a spec import the module it drives, wherever under the directory it sits', () => {
    expect(
      judged(
        module('src/todo-input/field.spec.ts', 'src/todo-input/field'),
        module('src/todo-input/effects.spec.ts', 'src/todo-input/effects'),
        module(
          'src/todo-input/editing/rules.spec.ts',
          'src/todo-input/editing/rules',
        ),
      ),
    ).toStrictEqual([])
  })
})

describe('the fetch transport translates for the client and knows nothing else', () => {
  it('refuses the transport reaching past the client', () => {
    expect(
      judged(module('src/todo-api/fetchTransport.ts', 'src/reducers/todos')),
    ).toStrictEqual([
      [
        'the fetch transport translates for the client and knows nothing else',
        'src/reducers/todos',
      ],
    ])
  })

  it('allows the one import it has', () => {
    expect(
      judged(module('src/todo-api/fetchTransport.ts', 'src/todo-api/client')),
    ).toStrictEqual([])
  })
})

describe('the state layer knows no UI and no transport', () => {
  it('refuses a reducer or an operation reaching outward', () => {
    expect(
      judged(
        module('src/reducers/todos.ts', 'react'),
        module('src/reducers/visibilityFilter.ts', 'react-redux'),
        module('src/actions/api.ts', 'src/todo-api/fetchTransport'),
        module('src/actions/local.ts', 'src/components/MainSection'),
        module('src/reducers/index.ts', 'src/containers'),
      ).map(([, target]) => target),
    ).toStrictEqual([
      'react',
      'react-redux',
      'src/todo-api/fetchTransport',
      'src/components/MainSection',
      'src/containers',
    ])
  })

  it('refuses every direction it names, one import per pattern', () => {
    const outward = [
      'react',
      'react-dom',
      'react-dom/client',
      'react-redux',
      'src/components',
      'src/components/MainSection',
      'src/containers',
      'src/containers/VisibleTodoList',
      'src/todo-api/fetchTransport',
      'src/index',
    ]

    expect(
      judged(module('src/reducers/todos.ts', ...outward)).map(
        ([, target]) => target,
      ),
    ).toStrictEqual(outward)
  })

  it('allows what the state layer decides with', () => {
    expect(
      judged(
        module(
          'src/reducers/todos.ts',
          '@reduxjs/toolkit',
          'src/actions/api',
          'src/models/Todo',
        ),
        module('src/actions/api.ts', 'src/todo-api/client'),
        module('src/actions/index.spec.ts', 'src/store'),
      ),
    ).toStrictEqual([])
  })
})

describe('the UI reaches the state layer only through actions and selectors', () => {
  it('refuses a component or a container going around the seam', () => {
    expect(
      judged(
        module('src/components/MainSection.tsx', 'src/reducers/todos'),
        module('src/components/Footer.tsx', 'src/reducers'),
        module('src/containers/VisibleTodoList.ts', 'src/store'),
        module('src/components/TodoList.tsx', 'src/todo-api/client'),
        module('src/containers/Header.ts', 'src/todo-api/fetchTransport'),
      ).map(([, target]) => target),
    ).toStrictEqual([
      'src/reducers/todos',
      'src/reducers',
      'src/store',
      'src/todo-api/client',
      'src/todo-api/fetchTransport',
    ])
  })

  it('refuses every way past the seam, one import per pattern', () => {
    const around = [
      'src/reducers',
      'src/reducers/todos',
      'src/store',
      'src/store/middleware',
      'src/todo-api',
      'src/todo-api/client',
    ]

    expect(
      judged(module('src/containers/MainSection.ts', ...around)).map(
        ([, target]) => target,
      ),
    ).toStrictEqual(around)
  })

  it('allows the two seams it is given, and the shapes it renders', () => {
    expect(
      judged(
        module(
          'src/components/MainSection.tsx',
          'react',
          'src/actions',
          'src/selectors',
          'src/models/Todo',
          'src/constants/TodoFilters',
          'src/containers/VisibleTodoList',
        ),
      ),
    ).toStrictEqual([])
  })
})

describe('shipped code never reaches into test support', () => {
  it('refuses each of the three things that do not exist in a bundle', () => {
    expect(
      judged(
        module('src/components/App.tsx', 'src/test-support/store'),
        module('src/reducers/todos.ts', 'vitest'),
        module('src/containers/Header.ts', '@testing-library/react'),
      ),
    ).toStrictEqual([
      [
        'shipped code never reaches into test support',
        'src/test-support/store',
      ],
      ['shipped code never reaches into test support', 'vitest'],
      [
        'shipped code never reaches into test support',
        '@testing-library/react',
      ],
    ])
  })

  it('lets a spec and test support itself do exactly that', () => {
    expect(
      judged(
        module('src/components/App.spec.tsx', 'src/test-support/store'),
        module('src/todo-api/client.spec.ts', 'vitest'),
        module('src/test-support/fetch.ts', 'vitest'),
      ),
    ).toStrictEqual([])
  })
})

describe('the application never imports its own harnesses', () => {
  it('refuses every harness directory by name', () => {
    const harnesses = [
      'qa/stub/server',
      'acceptance/runtime',
      'properties/tiny-check',
      'hardening/rules.hardening.test',
      'scripts/architecture/rules',
      'build/acceptance/ir/todo-api-requests.json',
      'features/todo-api-requests.feature',
    ]

    expect(
      judged(module('src/index.tsx', ...harnesses)).map(([, target]) => target),
    ).toStrictEqual(harnesses)
  })

  it('leaves an ordinary application import alone', () => {
    expect(
      judged(module('src/index.tsx', 'react-dom/client', 'src/components/App')),
    ).toStrictEqual([])
  })
})

describe('the acceptance pipeline drives the policy, not the network shell', () => {
  it('refuses the transport, and any other way into src/', () => {
    expect(
      judged(
        module('acceptance/steps/todo-api.ts', 'src/todo-api/fetchTransport'),
        module('acceptance/runtime.ts', 'src/reducers/todos'),
      ),
    ).toStrictEqual([
      [
        'the acceptance pipeline drives the policy, not the network shell',
        'src/todo-api/fetchTransport',
      ],
      [
        'the acceptance pipeline drives the policy, not the network shell',
        'src/reducers/todos',
      ],
    ])
  })

  it('allows the whole state layer the todo-state family drives', () => {
    expect(
      judged(
        module(
          'acceptance/steps/todo-state.ts',
          'src/todo-api/client',
          'src/store',
          'src/actions/api',
          'src/actions/local',
          'src/selectors',
          'src/models/Todo',
          'src/constants/TodoFilters',
          'acceptance/runtime',
          'vitest',
          'node:fs',
        ),
      ),
    ).toStrictEqual([])
  })
})

describe('the property suite drives the policy, not the network shell', () => {
  it('refuses the transport', () => {
    expect(
      judged(
        module(
          'properties/todo-api-client.property.test.ts',
          'src/todo-api/fetchTransport',
        ),
      ),
    ).toStrictEqual([
      [
        'the property suite drives the policy, not the network shell',
        'src/todo-api/fetchTransport',
      ],
    ])
  })

  it('allows the client, the state layer, its own runner and Vitest', () => {
    expect(
      judged(
        module(
          'properties/todo-api-client.property.test.ts',
          'src/todo-api/client',
          'properties/tiny-check',
          'vitest',
        ),
        module(
          'properties/todos-reducer.property.test.ts',
          'src/reducers/todos',
          'src/actions',
          'src/actions/local',
          'src/models/Todo',
        ),
      ),
    ).toStrictEqual([])
  })
})

describe('the hardening suite drives modules, never the network shell', () => {
  it('refuses the transport, as the other two harnesses do', () => {
    expect(
      judged(
        module(
          'hardening/todo-api-client.hardening.test.ts',
          'src/todo-api/fetchTransport',
        ),
      ),
    ).toStrictEqual([
      [
        'the hardening suite drives modules, never the network shell',
        'src/todo-api/fetchTransport',
      ],
    ])
  })

  /**
   * The last module named here is one this directory does not have. Task 11
   * widened this rule to `src/todo-input/*` so that a hardening test could
   * import the modules it was asked to break, and then the mutation run found
   * no survivor to write one for - so the entry has no caller, and a mutation
   * scan showed that blanking it changed no answer anywhere. It stays, because
   * the next survivor in those modules should not also need a rule change; the
   * module below is what says so.
   */
  it('allows the tooling it exists to break, which the other two may not touch', () => {
    expect(
      judged(
        module(
          'hardening/boundary-checking.hardening.test.ts',
          'src/todo-api/client',
          'properties/tiny-check',
          'scripts/architecture/boundaries',
          'hardening/support',
          'vitest',
          'node:fs',
        ),
        module(
          'hardening/todo-operations.hardening.test.ts',
          'src/actions/api',
        ),
        module(
          'hardening/todo-input.hardening.test.ts',
          'src/todo-input/field',
          'src/todo-input/effects',
        ),
      ),
    ).toStrictEqual([])
  })

  it('refuses the store and the UI, which no mutation of a module needs', () => {
    expect(
      judged(
        module('hardening/todo-operations.hardening.test.ts', 'src/store'),
        module(
          'hardening/todo-operations.hardening.test.ts',
          'src/components/MainSection',
        ),
      ).map(([, target]) => target),
    ).toStrictEqual(['src/store', 'src/components/MainSection'])
  })
})

describe('the table above', () => {
  it('leaves every rule able to explain itself when it fails', () => {
    for (const rule of BOUNDARY_RULES) {
      expect(rule.reason.length).toBeGreaterThan(rule.name.length)
    }
  })

  it('names every rule there is, so a new boundary cannot arrive unproven', () => {
    const proven = [
      'the todo API policy depends on nothing',
      'the todo input rules depend on nothing',
      'the fetch transport translates for the client and knows nothing else',
      'the state layer knows no UI and no transport',
      'the UI reaches the state layer only through actions and selectors',
      'shipped code never reaches into test support',
      'the application never imports its own harnesses',
      'the acceptance pipeline drives the policy, not the network shell',
      'the property suite drives the policy, not the network shell',
      'the hardening suite drives modules, never the network shell',
    ]

    expect(BOUNDARY_RULES.map((rule) => rule.name)).toStrictEqual(proven)
  })
})
