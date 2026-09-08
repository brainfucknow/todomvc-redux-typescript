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
 * Task 10 added the two that separate the state layer from the UI, in both
 * directions: a reducer or an operation may not reach outward to a component,
 * and a component may not reach past `src/actions/` and `src/selectors/` into
 * the slices, the store or the API client.
 *
 * One trap in the vocabulary, learned here: `a/**` matches what is under `a`
 * and not `a` itself, so a directory that has an `index.ts` - `src/reducers`,
 * `src/containers` - has to be named twice to be refused. `matches` in
 * `boundaries.mjs` is right about that; a rule that means both says both.
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
    name: 'the state layer knows no UI and no transport',
    files: ['src/reducers/**', 'src/actions/**'],
    deny: [
      'react',
      'react-dom',
      'react-dom/*',
      'react-redux',
      'src/components',
      'src/components/**',
      'src/containers',
      'src/containers/**',
      'src/todo-api/fetchTransport',
      'src/index',
    ],
    reason:
      'Task 10 required the slice reducers and the operations to be testable modules with no network, framework-IO or UI dependency, and until this rule that requirement had no check. What is allowed is what the state layer legitimately decides with: Redux Toolkit, the domain types, the todo API client and the store. What is refused is the direction of the arrow - a reducer or an operation reaching outward to a component, a container, the entry point or the fetch transport. src/selectors/ is deliberately not in files: it imports RootState from src/containers today, which is the hand-written type task 12 replaces with one derived from the store. Add it here in the same change that moves RootState.',
  },
  {
    name: 'the UI reaches the state layer only through actions and selectors',
    files: ['src/components/**', 'src/containers/**'],
    deny: [
      'src/reducers',
      'src/reducers/**',
      'src/store',
      'src/store/**',
      'src/todo-api',
      'src/todo-api/**',
    ],
    reason:
      'A slice keeps its own business to itself: which action creators it generates, which key it is combined under, and which client answers for it. What the UI is given instead is a name to dispatch and a selector to ask. This is also what keeps a DOM event out of the store - React calls a click handler with its event, so the only creators a component may bind are the ones in src/actions/, which take no argument they do not want; properties/ui-bound-actions.property.test.ts states that, and this rule is what stops a component importing the slice creator and going around it.',
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
      'src/todo-input/*',
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
      'Three families of feature now, and each drives the module that answers its questions: todo-api-* runs the client, todo-state-* runs the store the app itself builds, dispatching the same actions the app dispatches and reading the same selectors, and todo-input-* runs the text-input rules in src/todo-input/. Widened in task 10 for the second family and in task 11 for the third, whose modules exist precisely so that the rules can be asked without a component. What stays out is the list that matters: src/todo-api/fetchTransport.ts would put fetch back in the suite - the store takes its transport as an argument precisely so the suite can supply its own - and src/components, src/containers and src/middlewares would make the acceptance suite a second renderer of the app.',
  },
  {
    name: 'the property suite drives the policy, not the network shell',
    files: ['properties/**'],
    allow: [
      'src/todo-api/client',
      'src/reducers/*',
      'src/actions',
      'src/actions/*',
      'src/models/*',
      'properties/**',
      'vitest',
    ],
    reason:
      'Same boundary as acceptance, for the same reason: a property that needed the network would be a property of the network. Widened in task 10 to the state layer, whose reducers are pure functions of a state and an action and are exactly what a property is for - the id rule and the toggle-all rule are statements about every list, which no table of examples can make. What stays out is unchanged: src/todo-api/fetchTransport, src/components and src/containers. src/store stays out too, though nothing forbids it elsewhere - a property here is a statement about a function, not about a running store.',
  },
  {
    name: 'the hardening suite drives modules, never the network shell',
    files: ['hardening/**'],
    allow: [
      'src/todo-api/client',
      'src/actions/*',
      'properties/tiny-check',
      'scripts/**',
      'hardening/**',
      'vitest',
      'node:*',
    ],
    reason:
      'Hardening tests exist to break whichever module is under mutation, so unlike acceptance and properties they reach the repository tooling as well as the policy. Widened in task 10 to src/actions/*, which is where the first state-layer module this suite has had to hold lives: the five backend operations, whose action type names are what tells them apart in every reducer matcher and which nothing else in the project pinned. What they still may not reach is src/todo-api/fetchTransport.ts, src/store, src/components or src/containers: a mutation killed by the network, or by a rendered component, would be measuring the network or the component.',
  },
]
