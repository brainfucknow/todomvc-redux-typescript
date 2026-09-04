import { describe, expect, test } from 'vitest'
import type { Feature, StepHandler } from '../acceptance/runtime.ts'
import { expandScenarios, resolveArgument, runExecution } from '../acceptance/runtime.ts'

const step = (text: string) => ({ keyword: 'Then', text })

describe('a capture is a placeholder only when it is nothing else', () => {
  const example = { path: '/api/todos/' }

  test('text after the closing angle bracket makes it a literal', () => {
    expect(resolveArgument('<path>/1', example)).toBe('<path>/1')
  })

  test('text before the opening angle bracket makes it a literal', () => {
    expect(resolveArgument('api<path>', example)).toBe('api<path>')
  })

  test('two placeholders in one capture are a literal, not a substitution', () => {
    expect(resolveArgument('<path><path>', example)).toBe('<path><path>')
  })
})

describe('the error for a placeholder with no example value', () => {
  test('lists the names the example does have, comma-separated', () => {
    expect(() => resolveArgument('<body>', { path: '/', status: '200' }))
      .toThrow('no example value for <body>; available: path, status')
  })

  test('says "none" when the example carries no names at all', () => {
    expect(() => resolveArgument('<body>', {}))
      .toThrow('no example value for <body>; available: none')
  })
})

describe('a feature without a background', () => {
  const feature: Feature = {
    name: 'Toolchain dependencies',
    scenarios: [{ name: 'toolchain dependencies 1', steps: [step('npm run dev is an available command')] }],
  }

  test('contributes no steps of its own to the execution', () => {
    expect(expandScenarios(feature)[0].steps).toEqual([step('npm run dev is an available command')])
  })

  test('so an empty background is the absence of steps, not a step', () => {
    expect(expandScenarios({ ...feature, background: [] })[0].steps)
      .toEqual(expandScenarios(feature)[0].steps)
  })
})

describe('a step that fails', () => {
  const failure = new Error('expected status 200 but got 404')
  const handlers: StepHandler<unknown>[] = [{
    pattern: /^the response status is 200$/,
    run: () => {
      throw failure
    },
  }]

  const run = (): Promise<void> => runExecution(
    { name: 'api proxy 1/example_1', steps: [step('the response status is 200')], example: {} },
    handlers,
    {},
  )

  test('reports the step that failed and what it said', async () => {
    await expect(run()).rejects.toThrow('Then the response status is 200\nexpected status 200 but got 404')
  })

  test('keeps the original failure as the cause, so the stack is not lost', async () => {
    await expect(run()).rejects.toThrowError(expect.objectContaining({ cause: failure }))
  })
})
