/**
 * The boundaries this repository has, as data something can check. How one is
 * decided is `boundaries.mjs`; `rules.hardening.test.ts` breaks each rule on
 * purpose, because a repository that obeys them falsifies nothing.
 *
 * A trap in the vocabulary: `a/**` matches what is under `a` and not `a` itself, so
 * a directory with an `index.ts` has to be named twice to be refused.
 *
 * A rule is intent, not scripture. When a correct inward call changes the graph,
 * widen the list in the same change and say why in the reason. What must not happen
 * is the graph changing while the list still claims otherwise.
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
    name: 'the todo input rules depend on nothing',
    files: ['src/todo-input/**'],
    except: ['src/todo-input/*.spec.ts', 'src/todo-input/**/*.spec.ts'],
    allow: [],
    reason:
      'The text-input rules answer domain questions with no environment at all, and an import here is the way back to a component: React, a DOM type from @types/react, the store. The empty list is the truth today rather than a guess; widen it deliberately if a domain type is ever needed. Its specs are excepted under both patterns, because `**` stands for at least one segment, so the specs sitting directly in the directory would otherwise be missed. src/todo-input/tsconfig.json is the other half of this claim: an import of React is caught here, and a bare DOM global like KeyboardEvent, which needs no import, is caught there.',
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
      'The slice reducers and the operations are testable modules with no network, framework-IO or UI dependency. What is allowed is what the state layer legitimately decides with: Redux Toolkit, the domain types, the todo API client and the store. What is refused is the direction of the arrow - a reducer or an operation reaching outward to a component, a container, the entry point or the fetch transport. src/selectors/ is deliberately not in files: it imports RootState from src/containers today, so add it here in the same change that moves RootState.',
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
      'Each family of feature drives the module that answers its questions: todo-api-* the client, todo-state-* the store the app itself builds, todo-input-* the text-input rules. What stays out is the list that matters: src/todo-api/fetchTransport.ts would put fetch back in the suite - the store takes its transport as an argument precisely so the suite can supply its own - and src/components, src/containers and src/middlewares would make the acceptance suite a second renderer of the app.',
  },
  {
    name: 'the property suite drives the policy, not the network shell',
    files: ['properties/**'],
    allow: [
      'src/todo-api/client',
      'src/todo-input/*',
      'src/reducers/*',
      'src/actions',
      'src/actions/*',
      'src/models/*',
      'properties/**',
      'vitest',
    ],
    reason:
      'Same boundary as acceptance, for the same reason: a property that needed the network would be a property of the network. What it reaches are pure functions - the reducers, the input rules, the client - which is what a property is for. src/todo-api/fetchTransport, src/components and src/containers stay out, and so does src/store, though nothing forbids it elsewhere: a property here is a statement about a function, not about a running store.',
  },
  {
    name: 'the hardening suite drives modules, never the network shell',
    files: ['hardening/**'],
    allow: [
      'src/todo-api/client',
      'src/todo-input/*',
      'src/actions/*',
      'properties/tiny-check',
      'scripts/**',
      'hardening/**',
      'vitest',
      'node:*',
    ],
    reason:
      'Hardening tests exist to break whichever module is under mutation, so unlike acceptance and properties they reach the repository tooling as well as the policy, and the suite cannot import what it is not allowed to mutate. What they still may not reach is src/todo-api/fetchTransport.ts, src/store, src/components or src/containers: a mutation killed by the network, or by a rendered component, would be measuring the network or the component.',
  },
]
