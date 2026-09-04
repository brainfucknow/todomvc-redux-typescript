export type Step = {
  keyword: string
  text: string
  parameters?: string[]
}

export type Scenario = {
  name: string
  steps: Step[]
  examples?: Record<string, string>[]
}

export type Feature = {
  name: string
  background?: Step[]
  scenarios: Scenario[]
}

export type ScenarioExecution = {
  name: string
  steps: Step[]
  example: Record<string, string>
}

export type StepHandler<TWorld> = {
  pattern: RegExp
  run: (world: TWorld, args: string[]) => void | Promise<void>
}

const PLACEHOLDER = /^<([A-Za-z0-9_]+)>$/

export function expandScenarios(feature: Feature): ScenarioExecution[] {
  const background = feature.background ?? []
  return feature.scenarios.flatMap((scenario) => {
    const examples = scenario.examples?.length ? scenario.examples : [{}]
    return examples.map((example, index) => ({
      name: `${scenario.name}/example_${index + 1}`,
      steps: [...background, ...scenario.steps],
      example,
    }))
  })
}

export function resolveArgument(capture: string, example: Record<string, string>): string {
  const placeholder = PLACEHOLDER.exec(capture)
  if (!placeholder) {
    return capture
  }
  const name = placeholder[1]
  const value = example[name]
  if (value === undefined) {
    throw new Error(`no example value for <${name}>; available: ${Object.keys(example).join(', ') || 'none'}`)
  }
  return value
}

export function matchStep<TWorld>(
  text: string,
  handlers: StepHandler<TWorld>[],
): { handler: StepHandler<TWorld>; captures: string[] } {
  const matches = handlers.flatMap((handler) => {
    const match = handler.pattern.exec(text)
    return match ? [{ handler, captures: match.slice(1) }] : []
  })
  if (matches.length === 0) {
    throw new Error(`unsupported step text: "${text}"`)
  }
  if (matches.length > 1) {
    throw new Error(`ambiguous step text: "${text}" matches ${matches.length} handlers`)
  }
  return matches[0]
}

export async function runExecution<TWorld>(
  execution: ScenarioExecution,
  handlers: StepHandler<TWorld>[],
  world: TWorld,
): Promise<void> {
  for (const step of execution.steps) {
    const { handler, captures } = matchStep(step.text, handlers)
    const args = captures.map((capture) => resolveArgument(capture, execution.example))
    try {
      await handler.run(world, args)
    } catch (cause) {
      throw new Error(`${step.keyword} ${step.text}\n${(cause as Error).message}`, { cause })
    }
  }
}
