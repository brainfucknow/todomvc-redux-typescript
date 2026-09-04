// What the QA procedures need from outside the browser: run a command, start a
// server the way a developer starts it, hold a backend on port 4000, and see
// whether a port is still bound.
//
// Everything here goes through a public affordance - an npm script, a shell
// command, an HTTP request. Nothing imports a project module: the QA tier has
// to be able to fail when the project's own code is wrong about itself.
import { spawn, spawnSync } from 'node:child_process'
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http'
import { connect } from 'node:net'
import { fileURLToPath } from 'node:url'
import { plain } from './reports.ts'

export const projectRoot = fileURLToPath(new URL('..', import.meta.url))

export type CommandResult = {
  code: number
  output: string
}

export function run(command: string, args: string[], cwd: string = projectRoot): CommandResult {
  const finished = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  return { code: finished.status ?? -1, output: `${finished.stdout ?? ''}${finished.stderr ?? ''}` }
}

export const npm = (...args: string[]): CommandResult => run('npm', args)

export type Server = {
  url: string
  port: number
  output: string
  stop: () => Promise<void>
}

const LOCAL_URL = /(http:\/\/localhost:\d+)\/?/

// `npm run dev` and `npm run preview` both print the URL they picked and then
// keep running. Started detached so the whole process group can be signalled:
// npm spawns vite, and killing npm alone leaves the port bound.
export async function startServer(script: string, timeoutMs = 60_000): Promise<Server> {
  const child = spawn('npm', ['run', script], { cwd: projectRoot, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  // A signalled process leaves `exitCode` null, so the exit is recorded here
  // rather than read back off the child. Stopping twice has to be harmless:
  // the procedures stop a server in a step and again when the test unwinds.
  let finished = false
  const ended = new Promise<void>((resolve) => child.on('exit', () => {
    finished = true
    resolve()
  }))
  const url = await new Promise<string>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`${script} printed no URL in ${timeoutMs}ms:\n${output}`)), timeoutMs)
    const read = (chunk: Buffer): void => {
      output += chunk.toString()
      const found = LOCAL_URL.exec(plain(output))
      if (found) {
        clearTimeout(deadline)
        resolve(found[1])
      }
    }
    child.stdout.on('data', read)
    child.stderr.on('data', read)
    child.on('error', reject)
    child.on('exit', (code) => reject(new Error(`${script} exited with ${code} before printing a URL:\n${output}`)))
  })
  const stop = async (): Promise<void> => {
    if (finished) {
      return
    }
    process.kill(-child.pid!, 'SIGTERM')
    await ended
  }

  return { url, port: Number(new URL(url).port), output, stop }
}

export type BackendStub = {
  requests: string[]
  stop: () => Promise<void>
}

// The Todo-Backend stand-in procedure B asks for on port 4000: anything that
// answers `GET /api/todos/` with a JSON array.
export function startBackendStub(port: number, body: string): Promise<BackendStub> {
  const requests: string[] = []
  const handle = (request: IncomingMessage, response: ServerResponse): void => {
    requests.push(`${request.method} ${request.url}`)
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(body)
  }
  const server: HttpServer = createServer(handle)
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve({
      requests,
      stop: () => new Promise<void>((closed) => server.close(() => closed())),
    }))
  })
}

export function isPortBound(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.setTimeout(2_000)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    const no = (): void => {
      socket.destroy()
      resolve(false)
    }
    socket.on('error', no)
    socket.on('timeout', no)
  })
}
