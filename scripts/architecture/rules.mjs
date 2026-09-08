/**
 * The boundaries this repository has, written down where something can check
 * them. Data only: what each layer is allowed to know about, and why.
 *
 * Task 09 created several that existed only in prose: the todo API client owns
 * policy and must run with no environment at all, the fetch transport
 * translates for it and does nothing else, `src/test-support/` is for specs and
 * must never be reachable from shipped code, and the acceptance pipeline drives
 * the policy rather than the network shell. Every one of them was a comment in
 * a handoff note, and a comment cannot fail.
 *
 * A rule is intent, not scripture. When the correct inward call changes the
 * graph, widen the list in the same change and say why in the reason - that is
 * the point of keeping the intent as data. What must not happen is the graph
 * changing while the list still claims otherwise.
 *
 * How a rule is decided is `boundaries.mjs`, which knows no paths of its own.
 * The two were one file until the hardener's mutation scan made the seam
 * visible: every mutation of a rule's data survived, because the only thing
 * driving these rules was a repository that obeys them, and a rule nothing can
 * break is a rule nothing checks. `rules.hardening.test.ts` breaks each of them
 * on purpose.
 */

/** @typedef {import('./boundaries.mjs').Rule} Rule */

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
      'hardening/**',
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
    allow: [
      'src/todo-api/client',
      'src/store',
      'src/actions/*',
      'src/selectors',
      'src/models/*',
      'src/constants/*',
      'acceptance/**',
      'vitest',
      'node:*',
    ],
    reason:
      'Two families of feature now, and each drives the module that answers its questions: todo-api-* runs the client, and todo-state-* runs the store the app itself builds, dispatching the same actions the app dispatches and reading the same selectors. Widened in task 10, which is where the second family and the state it specifies arrived. What stays out is the list that matters: src/todo-api/fetchTransport.ts would put fetch back in the suite - the store takes its transport as an argument precisely so the suite can supply its own - and src/components, src/containers and src/middlewares would make the acceptance suite a second renderer of the app.',
  },
  {
    name: 'the property suite drives the policy, not the network shell',
    files: ['properties/**'],
    allow: ['src/todo-api/client', 'properties/**', 'vitest'],
    reason:
      'Same boundary as acceptance, for the same reason: a property that needed the network would be a property of the network.',
  },
  {
    name: 'the hardening suite drives modules, never the network shell',
    files: ['hardening/**'],
    allow: [
      'src/todo-api/client',
      'properties/tiny-check',
      'scripts/**',
      'hardening/**',
      'vitest',
      'node:*',
    ],
    reason:
      'Hardening tests exist to break whichever module is under mutation, so unlike acceptance and properties they reach the repository tooling as well as the policy. What they still may not reach is src/todo-api/fetchTransport.ts or any other part of src/: a mutation killed by the network would be measuring the network.',
  },
]
