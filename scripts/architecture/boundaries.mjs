/**
 * The boundaries this repository has, written down where something can check
 * them.
 *
 * Task 09 created several that existed only in prose: the todo API client owns
 * policy and must run with no environment at all, the fetch transport
 * translates for it and does nothing else, `src/test-support/` is for specs and
 * must never be reachable from shipped code, and the acceptance pipeline drives
 * the policy rather than the network shell. Every one of them was a comment in
 * a handoff note, and a comment cannot fail.
 *
 * Two kinds of statement live here, and neither is a style rule:
 *
 *   - an allowed- or forbidden-dependency list per group of modules, which is
 *     how a layer says what it is allowed to know about;
 *   - no import cycles anywhere, including cycles made only of type imports,
 *     which erase at run time but still mean two modules each define the other.
 *
 * A rule is intent, not scripture. When the correct inward call changes the
 * graph, widen the list in the same change and say why in the reason - that is
 * the point of keeping the intent as data. What must not happen is the graph
 * changing while the list still claims otherwise.
 *
 * Deciding only: this module reads no files and knows no paths of its own. Its
 * spec supplies the repository.
 */

/**
 * @typedef {object} Module
 * @property {string} path repository-relative, with its extension
 * @property {string[]} targets what it imports, per imports.mjs
 */

/**
 * @typedef {object} Rule
 * @property {string} name
 * @property {string[]} files globs over module paths
 * @property {string[]} [except] globs over module paths the rule skips
 * @property {string[]} [allow] the only targets permitted; anything else fails
 * @property {string[]} [deny] targets not permitted
 * @property {string} reason
 */

/** @type {Rule[]} */
export const BOUNDARY_RULES = [
  {
    name: 'the todo API policy depends on nothing',
    files: ['src/todo-api/client.ts'],
    allow: [],
    reason:
      'It answers domain questions and is the module the acceptance and property suites drive directly. It imports nothing today, so the empty list is the truth rather than a guess; a later task that needs a domain type here should widen it deliberately.',
  },
  {
    name: 'the fetch transport translates for the client and knows nothing else',
    files: ['src/todo-api/fetchTransport.ts'],
    allow: ['src/todo-api/client'],
    reason:
      'The adapter performs a request and hands back a status and bytes. Anything else it imported would be a domain decision moving into the shell.',
  },
  {
    name: 'shipped code never reaches into test support',
    files: ['src/**'],
    except: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/test-support/**'],
    deny: ['src/test-support/**', 'vitest', '@testing-library/**'],
    reason:
      'src/test-support/ calls `vi` and renders through @testing-library, neither of which exists in a built bundle. A shipped module importing it would typecheck, lint and build, and fail in the browser.',
  },
  {
    name: 'the application never imports its own harnesses',
    files: ['src/**'],
    deny: [
      'qa/**',
      'acceptance/**',
      'properties/**',
      'scripts/**',
      'build/**',
      'features/**',
    ],
    reason:
      'The harnesses drive the application. An arrow the other way would put test infrastructure in the bundle and make the thing under test depend on the thing testing it.',
  },
  {
    name: 'the acceptance pipeline drives the policy, not the network shell',
    files: ['acceptance/**'],
    allow: ['src/todo-api/client', 'acceptance/**', 'vitest', 'node:*'],
    reason:
      'Acceptance runs the client against a stand-in transport. Importing src/todo-api/fetchTransport.ts would put fetch back in the suite, and reaching into any other part of src/ would be a second, unowned way in.',
  },
  {
    name: 'the property suite drives the policy, not the network shell',
    files: ['properties/**'],
    allow: ['src/todo-api/client', 'properties/**', 'vitest'],
    reason:
      'Same boundary as acceptance, for the same reason: a property that needed the network would be a property of the network.',
  },
]

/**
 * @param {Module[]} modules
 * @param {Rule[]} rules
 * @returns {{module: string, target: string, rule: string, reason: string}[]}
 */
export function violationsOf(modules, rules) {
  return modules.flatMap((module) =>
    rules
      .filter((rule) => appliesTo(rule, module.path))
      .flatMap((rule) =>
        module.targets
          .filter((target) => forbids(rule, target))
          .map((target) => ({
            module: module.path,
            target,
            rule: rule.name,
            reason: rule.reason,
          })),
      ),
  )
}

/**
 * Every import cycle among the given modules, each reported once as the loop
 * itself: the modules in the order they call each other, first repeated last.
 *
 * @param {Module[]} modules
 * @returns {string[][]}
 */
export function cyclesOf(modules) {
  const edges = internalEdges(modules)
  /** @type {Set<string>} */
  const settled = new Set()
  /** @type {string[][]} */
  const found = []

  for (const module of modules) {
    walk(module.path, [], edges, settled, found)
  }
  return distinct(found)
}

/**
 * One entry per loop. A diamond reaches the same loop by two routes and would
 * otherwise report it twice.
 *
 * @param {string[][]} cycles
 * @returns {string[][]}
 */
function distinct(cycles) {
  /** @type {Map<string, string[]>} */
  const byMembers = new Map()
  for (const cycle of cycles) {
    const key = [...new Set(cycle)].sort().join(' ')
    if (!byMembers.has(key)) byMembers.set(key, cycle)
  }
  return [...byMembers.values()]
}

/**
 * @param {string} path
 * @param {string[]} stack
 * @param {Map<string, string[]>} edges
 * @param {Set<string>} settled
 * @param {string[][]} found
 */
function walk(path, stack, edges, settled, found) {
  const looped = stack.indexOf(path)
  if (looped !== -1) {
    found.push([...stack.slice(looped), path])
    return
  }
  if (settled.has(path)) return

  for (const next of edges.get(path) ?? []) {
    walk(next, [...stack, path], edges, settled, found)
  }
  settled.add(path)
}

/**
 * The import graph restricted to modules in the set, with a target matched to
 * the module it names - `acceptance/steps` to `acceptance/steps/index.ts`.
 *
 * @param {Module[]} modules
 * @returns {Map<string, string[]>}
 */
function internalEdges(modules) {
  /** @type {Map<string, string>} */
  const byTarget = new Map()
  for (const module of modules) {
    const withoutExtension = module.path.replace(/\.[^./]+$/, '')
    byTarget.set(withoutExtension, module.path)
    if (withoutExtension.endsWith('/index')) {
      byTarget.set(withoutExtension.slice(0, -'/index'.length), module.path)
    }
  }

  return new Map(
    modules.map((module) => [
      module.path,
      module.targets.flatMap((target) => {
        const resolved = byTarget.get(target)
        return resolved && resolved !== module.path ? [resolved] : []
      }),
    ]),
  )
}

/**
 * @param {Rule} rule
 * @param {string} path
 * @returns {boolean}
 */
function appliesTo(rule, path) {
  return (
    rule.files.some((pattern) => matches(pattern, path)) &&
    !(rule.except ?? []).some((pattern) => matches(pattern, path))
  )
}

/**
 * @param {Rule} rule
 * @param {string} target
 * @returns {boolean}
 */
function forbids(rule, target) {
  if (rule.allow) {
    return !rule.allow.some((pattern) => matches(pattern, target))
  }
  return (rule.deny ?? []).some((pattern) => matches(pattern, target))
}

/**
 * A path glob with the two wildcards a dependency list needs: `*` for one
 * segment, `**` for any number.
 *
 * @param {string} pattern
 * @param {string} value
 * @returns {boolean}
 */
function matches(pattern, value) {
  const expression = pattern
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((literal) => literal.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*')
  return new RegExp(`^${expression}$`).test(value)
}
