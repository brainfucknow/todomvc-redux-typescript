import type { World } from './assertions.ts'
import {
  assetsReferencedByResponse,
  bodyContains,
  bodyEquals,
  bodyExcludes,
  compilationSucceeded,
  everyAssetRespondsWith,
  majorVersionIsAtLeast,
  nothingReferences,
  scriptIsAvailable,
  statusIs,
} from './assertions.ts'
import { runCommand, typescriptCompiler } from './commands.ts'
import {
  backendRepliesTo,
  buildForProduction,
  requestPath,
  requestPaths,
  startDevServer,
  startPreviewServer,
} from './fixtures.ts'
import { availableScripts, compilerMajorVersion } from './inspection.ts'
import { filesReferencing, readProjectFile } from './project-files.ts'
import type { StepHandler } from './runtime.ts'

export { createWorld } from './assertions.ts'
export { releaseFixtures } from './fixtures.ts'

export const stepHandlers: StepHandler<World>[] = [
  {
    pattern: /^the todo backend on port 4000 replies to (\S+) with (.+)$/,
    run: (_world, [path, body]) => backendRepliesTo(path, body),
  },
  {
    pattern: /^the development server is running$/,
    run: async () => {
      await startDevServer()
    },
  },
  {
    pattern: /^the project has been built for production$/,
    run: () => buildForProduction(),
  },
  {
    pattern: /^the preview server is serving the build output$/,
    run: async () => {
      await startPreviewServer()
    },
  },
  {
    pattern: /^a client (?:requests|has requested) (\S+)$/,
    run: async (world, [path]) => {
      world.response = await requestPath(path)
    },
  },
  {
    pattern: /^a client requests every script and stylesheet referenced by the index page$/,
    run: async (world) => {
      world.assets = await requestPaths(assetsReferencedByResponse(world))
    },
  },
  {
    pattern: /^the TypeScript compiler checks the project$/,
    run: async (world) => {
      world.compilation = await runCommand(typescriptCompiler, ['--noEmit'])
    },
  },
  {
    pattern: /^the response status is (\d+)$/,
    run: (world, [expected]) => statusIs(world, expected),
  },
  {
    pattern: /^the response body contains (.+)$/,
    run: (world, [content]) => bodyContains(world, content),
  },
  {
    pattern: /^the response body does not contain (\S+)$/,
    run: (world, [content]) => bodyExcludes(world, content),
  },
  {
    pattern: /^the response body equals (.+)$/,
    run: (world, [expected]) => bodyEquals(world, expected),
  },
  {
    pattern: /^every referenced asset responds with status (\d+)$/,
    run: (world, [expected]) => everyAssetRespondsWith(world, expected),
  },
  {
    pattern: /^(\S+) contains no reference to (\S+)$/,
    run: (_world, [location, reference]) =>
      nothingReferences(reference, filesReferencing(location, reference)),
  },
  {
    pattern: /^npm run (\S+) is an available command$/,
    run: (_world, [script]) =>
      scriptIsAvailable(script, availableScripts(readProjectFile('package.json'))),
  },
  {
    pattern: /^the compiler reports no errors$/,
    run: (world) => compilationSucceeded(world),
  },
  {
    pattern: /^the TypeScript compiler major version is at least (\d+)$/,
    run: async (_world, [minimum]) => {
      const { output } = await runCommand(typescriptCompiler, ['--version'])
      majorVersionIsAtLeast(compilerMajorVersion(output), minimum)
    },
  },
]
