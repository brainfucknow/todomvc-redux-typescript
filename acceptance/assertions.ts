import { referencedAssets, referencedScripts } from './inspection.ts'

// What a scenario has observed, and whether an observation satisfies its step.
// The shell gathers; this decides. Nothing here reaches the environment, so
// every judgment a step makes is reachable from a test.

export type Response = {
  status: number
  body: string
}

export type AssetResult = {
  path: string
  status: number
}

export type Compilation = {
  code: number
  output: string
}

export type World = {
  response?: Response
  assets?: AssetResult[]
  compilation?: Compilation
}

export const createWorld = (): World => ({})

const EXCERPT_LIMIT = 400

const excerpt = (body: string): string =>
  body.length > EXCERPT_LIMIT ? `${body.slice(0, EXCERPT_LIMIT)}...` : body

export function observedResponse(world: World): Response {
  if (!world.response) {
    throw new Error('no response has been requested in this scenario')
  }
  return world.response
}

export function assetsReferencedByResponse(world: World): string[] {
  const assets = referencedAssets(observedResponse(world).body)
  if (assets.length === 0) {
    throw new Error('the index page references no scripts or stylesheets')
  }
  return assets
}

export function statusIs(world: World, expected: string): void {
  const { status } = observedResponse(world)
  if (status !== Number(expected)) {
    throw new Error(`expected status ${expected} but got ${status}`)
  }
}

export function scriptReferencedByResponse(world: World): string {
  const scripts = referencedScripts(observedResponse(world).body)
  if (scripts.length === 0) {
    throw new Error('the index page references no script')
  }
  if (scripts.length > 1) {
    throw new Error(`the index page references more than one script: ${scripts.join(', ')}`)
  }
  return scripts[0]
}

export function responseContains(response: Response, content: string): void {
  if (!response.body.includes(content)) {
    throw new Error(`response body does not contain "${content}":\n${excerpt(response.body)}`)
  }
}

export function bodyContains(world: World, content: string): void {
  responseContains(observedResponse(world), content)
}

export function bodyExcludes(world: World, content: string): void {
  const { body } = observedResponse(world)
  if (body.includes(content)) {
    throw new Error(`response body unexpectedly contains "${content}":\n${excerpt(body)}`)
  }
}

export function bodyEquals(world: World, expected: string): void {
  const { body } = observedResponse(world)
  if (body !== expected) {
    throw new Error(`expected response body\n${expected}\nbut got\n${excerpt(body)}`)
  }
}

export function everyAssetRespondsWith(world: World, expected: string): void {
  const assets = world.assets ?? []
  if (assets.length === 0) {
    throw new Error('no referenced assets were requested in this scenario')
  }
  const failures = assets.filter((asset) => asset.status !== Number(expected))
  if (failures.length > 0) {
    throw new Error(`assets did not respond with ${expected}: ${failures
      .map((asset) => `${asset.path} -> ${asset.status}`)
      .join(', ')}`)
  }
}

export function nothingReferences(reference: string, offenders: string[]): void {
  if (offenders.length > 0) {
    throw new Error(`"${reference}" still appears in ${offenders.join(', ')}`)
  }
}

export function scriptIsAvailable(script: string, declared: string[]): void {
  if (!declared.includes(script)) {
    throw new Error(`package.json declares no "${script}" script; it has: ${declared.join(', ')}`)
  }
}

export function compilationSucceeded(world: World): void {
  if (!world.compilation) {
    throw new Error('the TypeScript compiler has not been run in this scenario')
  }
  if (world.compilation.code !== 0) {
    throw new Error(`tsc exited ${world.compilation.code}:\n${world.compilation.output}`)
  }
}

export function majorVersionIsAtLeast(major: number, minimum: string): void {
  if (major < Number(minimum)) {
    throw new Error(`TypeScript major version ${major} is below the required ${minimum}`)
  }
}
