// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Feature, StepHandler } from './runtime.ts'
import { expandScenarios, matchStep, resolveArgument, runExecution } from './runtime.ts'

const feature = (overrides: Partial<Feature> = {}): Feature => ({
  name: 'A feature',
  scenarios: [],
  ...overrides,
})

describe('expandScenarios', () => {
  it('creates one execution per example row, named one-based', () => {
    const executions = expandScenarios(feature({
      scenarios: [{
        name: 'api proxy 1',
        steps: [{ keyword: 'When', text: 'a client requests <path>' }],
        examples: [{ path: '/a' }, { path: '/b' }],
      }],
    }))

    expect(executions.map((execution) => execution.name)).toEqual([
      'api proxy 1/example_1',
      'api proxy 1/example_2',
    ])
    expect(executions.map((execution) => execution.example)).toEqual([{ path: '/a' }, { path: '/b' }])
  })

  it('runs a scenario without examples once with an empty example object', () => {
    const executions = expandScenarios(feature({
      scenarios: [{ name: 'production build 3', steps: [{ keyword: 'Then', text: 'done' }] }],
    }))

    expect(executions).toHaveLength(1)
    expect(executions[0].name).toBe('production build 3/example_1')
    expect(executions[0].example).toEqual({})
  })

  it('prepends background steps to every execution', () => {
    const executions = expandScenarios(feature({
      background: [{ keyword: 'Given', text: 'the server is running' }],
      scenarios: [{
        name: 'scenario 1',
        steps: [{ keyword: 'Then', text: 'it works' }],
        examples: [{ a: '1' }, { a: '2' }],
      }],
    }))

    expect(executions.map((execution) => execution.steps.map((step) => step.text))).toEqual([
      ['the server is running', 'it works'],
      ['the server is running', 'it works'],
    ])
  })

  it('preserves scenario order', () => {
    const executions = expandScenarios(feature({
      scenarios: [
        { name: 'first', steps: [] },
        { name: 'second', steps: [] },
      ],
    }))

    expect(executions.map((execution) => execution.name)).toEqual(['first/example_1', 'second/example_1'])
  })
})

describe('resolveArgument', () => {
  it('reads a placeholder capture from the example object', () => {
    expect(resolveArgument('<path>', { path: '/api/todos/' })).toBe('/api/todos/')
  })

  it('passes a literal capture through unchanged', () => {
    expect(resolveArgument('/src/index.tsx', { path: '/api/todos/' })).toBe('/src/index.tsx')
  })

  it('fails when the example object has no value for the placeholder', () => {
    expect(() => resolveArgument('<body>', { path: '/a' })).toThrow(/body/)
  })

  it('substitutes once and does not rescan the substituted value', () => {
    expect(resolveArgument('<path>', { path: '<body>', body: 'rescanned' })).toBe('<body>')
  })

  it('keeps example values containing quotes and braces intact', () => {
    const example = { body: '{"id":1,"text":"Use Redux"}' }
    expect(resolveArgument('<body>', example)).toBe('{"id":1,"text":"Use Redux"}')
  })
})

const handler = (pattern: RegExp, calls: string[][] = []): StepHandler<string[][]> => ({
  pattern,
  run: (world, args) => {
    world.push(args)
    calls.push(args)
  },
})

describe('matchStep', () => {
  it('returns the matching handler and its captures', () => {
    const requests = handler(/^a client requests (\S+)$/)
    const match = matchStep('a client requests <path>', [requests])

    expect(match.handler).toBe(requests)
    expect(match.captures).toEqual(['<path>'])
  })

  it('fails on unsupported step text', () => {
    expect(() => matchStep('a step nobody handles', [handler(/^something else$/)]))
      .toThrow(/a step nobody handles/)
  })

  it('fails on ambiguous step text rather than picking one handler', () => {
    const handlers = [handler(/^a client requests (\S+)$/), handler(/^a client requests (.+)$/)]
    expect(() => matchStep('a client requests /', handlers)).toThrow(/ambiguous/i)
  })
})

describe('runExecution', () => {
  it('runs steps in order against one shared world, with resolved arguments', async () => {
    const world: string[][] = []
    const handlers = [handler(/^step (\S+)$/)]
    const execution = {
      name: 'scenario/example_1',
      steps: [{ keyword: 'Given', text: 'step <a>' }, { keyword: 'Then', text: 'step literal' }],
      example: { a: 'first' },
    }

    await runExecution(execution, handlers, world)

    expect(world).toEqual([['first'], ['literal']])
  })

  it('reports which step failed', async () => {
    const handlers: StepHandler<null>[] = [{
      pattern: /^exploding step$/,
      run: () => { throw new Error('boom') },
    }]
    const execution = { name: 'scenario/example_1', steps: [{ keyword: 'Then', text: 'exploding step' }], example: {} }

    await expect(runExecution(execution, handlers, null)).rejects.toThrow(/Then exploding step[\s\S]*boom/)
  })

  it('awaits asynchronous handlers before moving on', async () => {
    const order: string[] = []
    const handlers: StepHandler<null>[] = [
      {
        pattern: /^slow$/,
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          order.push('slow')
        },
      },
      { pattern: /^fast$/, run: () => { order.push('fast') } },
    ]
    const execution = {
      name: 'scenario/example_1',
      steps: [{ keyword: 'Given', text: 'slow' }, { keyword: 'Then', text: 'fast' }],
      example: {},
    }

    await runExecution(execution, handlers, null)

    expect(order).toEqual(['slow', 'fast'])
  })
})
