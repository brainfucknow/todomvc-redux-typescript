import type { CommandResult } from './fixtures.ts'
import {
  backendRepliesTo,
  buildForProduction,
  runCommand,
  serverUrl,
  startDevServer,
  startPreviewServer,
  typescriptCompiler,
} from './fixtures.ts'
import { availableScripts, compilerMajorVersion, referencedAssets } from './inspection.ts'
import { filesReferencing, readProjectFile } from './repository.ts'
import type { StepHandler } from './runtime.ts'

export { releaseFixtures } from './fixtures.ts'

export type AssetResult = {
  path: string
  status: number
}

export type World = {
  response?: { status: number; body: string }
  assets?: AssetResult[]
  compilation?: CommandResult
}

export const createWorld = (): World => ({})

const get = async (path: string): Promise<{ status: number; body: string }> => {
  const response = await fetch(new URL(path.replace(/^\/+/, ''), serverUrl()))
  return { status: response.status, body: await response.text() }
}

const currentResponse = (world: World): { status: number; body: string } => {
  if (!world.response) {
    throw new Error('no response has been requested in this scenario')
  }
  return world.response
}

const excerpt = (body: string): string => (body.length > 400 ? `${body.slice(0, 400)}...` : body)

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
      world.response = await get(path)
    },
  },
  {
    pattern: /^a client requests every script and stylesheet referenced by the index page$/,
    run: async (world) => {
      const assets = referencedAssets(currentResponse(world).body)
      if (assets.length === 0) {
        throw new Error('the index page references no scripts or stylesheets')
      }
      world.assets = await Promise.all(assets.map(async (path) => ({
        path,
        status: (await get(path)).status,
      })))
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
    run: (world, [expected]) => {
      const { status } = currentResponse(world)
      if (status !== Number(expected)) {
        throw new Error(`expected status ${expected} but got ${status}`)
      }
    },
  },
  {
    pattern: /^the response body contains (.+)$/,
    run: (world, [content]) => {
      const { body } = currentResponse(world)
      if (!body.includes(content)) {
        throw new Error(`response body does not contain "${content}":\n${excerpt(body)}`)
      }
    },
  },
  {
    pattern: /^the response body does not contain (\S+)$/,
    run: (world, [content]) => {
      const { body } = currentResponse(world)
      if (body.includes(content)) {
        throw new Error(`response body unexpectedly contains "${content}":\n${excerpt(body)}`)
      }
    },
  },
  {
    pattern: /^the response body equals (.+)$/,
    run: (world, [expected]) => {
      const { body } = currentResponse(world)
      if (body !== expected) {
        throw new Error(`expected response body\n${expected}\nbut got\n${excerpt(body)}`)
      }
    },
  },
  {
    pattern: /^every referenced asset responds with status (\d+)$/,
    run: (world, [expected]) => {
      const assets = world.assets ?? []
      const failures = assets.filter((asset) => asset.status !== Number(expected))
      if (assets.length === 0) {
        throw new Error('no referenced assets were requested in this scenario')
      }
      if (failures.length > 0) {
        throw new Error(`assets did not respond with ${expected}: ${failures
          .map((asset) => `${asset.path} -> ${asset.status}`)
          .join(', ')}`)
      }
    },
  },
  {
    pattern: /^(\S+) contains no reference to (\S+)$/,
    run: (_world, [location, needle]) => {
      const offenders = filesReferencing(location, needle)
      if (offenders.length > 0) {
        throw new Error(`"${needle}" still appears in ${offenders.join(', ')}`)
      }
    },
  },
  {
    pattern: /^npm run (\S+) is an available command$/,
    run: (_world, [script]) => {
      const scripts = availableScripts(readProjectFile('package.json'))
      if (!scripts.includes(script)) {
        throw new Error(`package.json declares no "${script}" script; it has: ${scripts.join(', ')}`)
      }
    },
  },
  {
    pattern: /^the compiler reports no errors$/,
    run: (world) => {
      if (!world.compilation) {
        throw new Error('the TypeScript compiler has not been run in this scenario')
      }
      if (world.compilation.code !== 0) {
        throw new Error(`tsc exited ${world.compilation.code}:\n${world.compilation.output}`)
      }
    },
  },
  {
    pattern: /^the TypeScript compiler major version is at least (\d+)$/,
    run: async (_world, [minimum]) => {
      const { output } = await runCommand(typescriptCompiler, ['--version'])
      const major = compilerMajorVersion(output)
      if (major < Number(minimum)) {
        throw new Error(`TypeScript major version ${major} is below the required ${minimum}`)
      }
    },
  },
]
