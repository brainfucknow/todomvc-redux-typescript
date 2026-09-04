import { createServer as createHttpServer } from 'node:http'
import type { Server } from 'node:http'
import type { AssetResult, Response } from './assertions.ts'
import { executable, runCommand } from './commands.ts'
import { scriptArgv } from './inspection.ts'
import { readProjectFile } from './project-files.ts'

const BACKEND_PORT = 4000

type RunningServer = {
  url: string
  close: () => Promise<void>
}

type Fixtures = {
  backendRoutes: Map<string, string>
  backend?: Server
  devServer?: RunningServer
  previewServer?: RunningServer
  build?: Promise<void>
  currentBaseUrl?: string
}

const emptyFixtures = (): Fixtures => ({ backendRoutes: new Map() })

let fixtures = emptyFixtures()

const firstLocalUrl = (urls: { local: string[] } | null, what: string): string => {
  const url = urls?.local[0]
  if (!url) {
    throw new Error(`${what} did not report a local URL`)
  }
  return url
}

type Closable = { close: (whenClosed: (failure?: Error) => void) => void }

const closeServer = (server: Closable): Promise<void> =>
  new Promise((closed, failed) => {
    server.close((failure) => (failure ? failed(failure) : closed()))
  })

// The server the client steps talk to, until another one is started.
const addressed = (server: RunningServer): string => {
  fixtures.currentBaseUrl = server.url
  return server.url
}

export async function backendRepliesTo(path: string, body: string): Promise<void> {
  fixtures.backendRoutes.set(path, body)
  if (fixtures.backend) {
    return
  }
  const server = createHttpServer((request, response) => {
    const reply = fixtures.backendRoutes.get(request.url ?? '')
    if (reply === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end(`no stubbed reply for ${request.url}`)
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(reply)
  })
  await new Promise<void>((listening, failed) => {
    server.once('error', failed)
    server.listen(BACKEND_PORT, '127.0.0.1', listening)
  })
  fixtures.backend = server
}

export async function startDevServer(): Promise<string> {
  if (!fixtures.devServer) {
    const { createServer } = await import('vite')
    const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
    await server.listen()
    fixtures.devServer = {
      url: firstLocalUrl(server.resolvedUrls, 'the development server'),
      close: () => server.close(),
    }
  }
  return addressed(fixtures.devServer)
}

// The scenario is about the bundle this project ships, so the build it runs is
// the one `package.json` declares rather than a second statement of it here.
//
// Vite reads NODE_ENV, not its mode, to decide whether a build is a production
// one, and Vitest runs this process with NODE_ENV=test - so a build driven from
// inside this process bundles React's development entry.
const runProductionBuild = async (): Promise<void> => {
  const [command, ...args] = scriptArgv(readProjectFile('package.json'), 'build')
  const { code, output } = await runCommand(executable(command), args, { NODE_ENV: 'production' })
  if (code !== 0) {
    throw new Error(`the production build failed (exit ${code}):\n${output}`)
  }
}

export async function buildForProduction(): Promise<void> {
  fixtures.build ??= runProductionBuild()
  await fixtures.build
}

export async function startPreviewServer(): Promise<string> {
  if (!fixtures.previewServer) {
    const { preview } = await import('vite')
    const server = await preview({ preview: { port: 0 }, logLevel: 'error' })
    fixtures.previewServer = {
      url: firstLocalUrl(server.resolvedUrls, 'the preview server'),
      close: () => closeServer(server.httpServer),
    }
  }
  return addressed(fixtures.previewServer)
}

const serverUrl = (): string => {
  if (!fixtures.currentBaseUrl) {
    throw new Error('no server has been started for this scenario')
  }
  return fixtures.currentBaseUrl
}

export async function requestPath(path: string): Promise<Response> {
  const response = await fetch(new URL(path.replace(/^\/+/, ''), serverUrl()))
  return { status: response.status, body: await response.text() }
}

export function requestPaths(paths: string[]): Promise<AssetResult[]> {
  return Promise.all(paths.map(async (path) => ({
    path,
    status: (await requestPath(path)).status,
  })))
}

export async function releaseFixtures(): Promise<void> {
  await fixtures.devServer?.close()
  await fixtures.previewServer?.close()
  if (fixtures.backend) {
    await closeServer(fixtures.backend)
  }
  fixtures = emptyFixtures()
}
