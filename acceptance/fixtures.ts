import { execFile } from 'node:child_process'
import { createServer as createHttpServer } from 'node:http'
import type { Server } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const runFile = promisify(execFile)

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const BACKEND_PORT = 4000

export type CommandResult = {
  code: number
  output: string
}

type Fixtures = {
  backendRoutes: Map<string, string>
  backend?: Server
  devServer?: { close: () => Promise<void>; url: string }
  previewServer?: { close: () => Promise<void>; url: string }
  build?: Promise<void>
  currentBaseUrl?: string
}

const fixtures: Fixtures = { backendRoutes: new Map() }

const firstLocalUrl = (urls: { local: string[] } | null, what: string): string => {
  const url = urls?.local[0]
  if (!url) {
    throw new Error(`${what} did not report a local URL`)
  }
  return url
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
  fixtures.currentBaseUrl = fixtures.devServer.url
  return fixtures.devServer.url
}

export async function buildForProduction(): Promise<void> {
  fixtures.build ??= (async () => {
    const { build } = await import('vite')
    await build({ logLevel: 'error' })
  })()
  await fixtures.build
}

export async function startPreviewServer(): Promise<string> {
  if (!fixtures.previewServer) {
    const { preview } = await import('vite')
    const server = await preview({ preview: { port: 0 }, logLevel: 'error' })
    fixtures.previewServer = {
      url: firstLocalUrl(server.resolvedUrls, 'the preview server'),
      close: () => new Promise<void>((closed, failed) => {
        server.httpServer.close((failure) => (failure ? failed(failure) : closed()))
      }),
    }
  }
  fixtures.currentBaseUrl = fixtures.previewServer.url
  return fixtures.previewServer.url
}

export function serverUrl(): string {
  if (!fixtures.currentBaseUrl) {
    throw new Error('no server has been started for this scenario')
  }
  return fixtures.currentBaseUrl
}

export async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await runFile(command, args, { cwd: projectRoot })
    return { code: 0, output: `${stdout}${stderr}` }
  } catch (failure) {
    const failed = failure as { code?: number; stdout?: string; stderr?: string }
    return { code: failed.code ?? 1, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }
  }
}

export const typescriptCompiler = join(projectRoot, 'node_modules', '.bin', 'tsc')

export async function releaseFixtures(): Promise<void> {
  await fixtures.devServer?.close()
  await fixtures.previewServer?.close()
  await new Promise<void>((closed) => {
    if (!fixtures.backend) {
      closed()
      return
    }
    fixtures.backend.close(() => closed())
  })
  fixtures.backendRoutes.clear()
  fixtures.backend = undefined
  fixtures.devServer = undefined
  fixtures.previewServer = undefined
  fixtures.build = undefined
  fixtures.currentBaseUrl = undefined
}
