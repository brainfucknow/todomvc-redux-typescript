import { readFileSync } from 'node:fs'
import { describe, test } from 'vitest'

/**
 * The acceptance runtime: it expands parser JSON IR into scenario executions
 * and routes each step to a project step handler. It never reads a `.feature`
 * file - the IR is the only input - and it holds no knowledge of what any step
 * means, which is `acceptance/steps/`.
 *
 * It does not know which vocabulary it will run, either. `runFeature` is given
 * one, and `acceptance/run-feature.ts` is the single place that picks this
 * project's - which is what keeps the engine from importing the steps that
 * import the engine.
 *
 * The IR shape is APS parser-spec.md.
 */

export interface IrStep {
  keyword: string
  text: string
  parameters?: string[]
}

export interface IrScenario {
  name: string
  steps: IrStep[]
  examples?: Record<string, string>[]
}

export interface IrFeature {
  name: string
  background?: IrStep[]
  scenarios: IrScenario[]
}

/** What a step handler is given: the execution's world, and its example row. */
export interface StepContext<W> {
  world: W
  example: Readonly<Record<string, string>>
  /** Substitutes example values into text. Fails on a placeholder the row has no value for. */
  expand(text: string): string
  /**
   * Substitutes example values into a JSON template. A placeholder between two
   * quotes is escaped as a JSON string body; anywhere else the value is written
   * as the literal it stands for, so `{"id":<id>}` yields a number.
   */
  expandJson(template: string): string
}

export type StepHandler<W> = (
  context: StepContext<W>,
  ...captures: string[]
) => void | Promise<void>

export interface StepDefinition<W> {
  pattern: RegExp
  handle: StepHandler<W>
}

/** One project vocabulary: how to start an execution, and what its steps mean. */
export interface StepSuite<W> {
  createWorld: () => W
  definitions: StepDefinition<W>[]
}

const PLACEHOLDER = /<([A-Za-z0-9_]+)>/g

export function readFeature(irPath: string): IrFeature {
  const feature: unknown = JSON.parse(readFileSync(irPath, 'utf8'))
  if (!isFeature(feature)) {
    throw new Error(`${irPath} is not parser JSON IR: no scenarios array`)
  }
  return feature
}

export function runFeature<W>(feature: IrFeature, suite: StepSuite<W>): void {
  describe(feature.name, () => {
    for (const scenario of feature.scenarios) {
      const executions = scenario.examples?.length ? scenario.examples : [{}]
      executions.forEach((example, index) => {
        test(`${scenario.name}/example_${index + 1}`, async () => {
          const context = contextFor(suite.createWorld(), example)
          for (const step of [
            ...(feature.background ?? []),
            ...scenario.steps,
          ]) {
            await runStep(step, context, suite.definitions)
          }
        })
      })
    }
  })
}

async function runStep<W>(
  step: IrStep,
  context: StepContext<W>,
  definitions: StepDefinition<W>[],
): Promise<void> {
  const matches = definitions.flatMap((definition) => {
    const match = definition.pattern.exec(step.text)
    return match ? [{ definition, match }] : []
  })

  if (matches.length === 0) {
    throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous step: ${step.keyword} ${step.text} matches ${matches.length} handlers`,
    )
  }

  const { definition, match } = matches[0]
  await definition.handle(context, ...match.slice(1))
}

function contextFor<W>(
  world: W,
  example: Record<string, string>,
): StepContext<W> {
  const valueOf = (name: string) => {
    if (!(name in example)) {
      throw new Error(`No example value for <${name}>`)
    }
    return example[name]
  }

  return {
    world,
    example,
    expand: (text) => text.replace(PLACEHOLDER, (_, name) => valueOf(name)),
    expandJson: (template) =>
      template.replace(PLACEHOLDER, (placeholder, name, offset: number) => {
        const value = valueOf(name)
        return inStringLiteral(template, offset, placeholder.length)
          ? JSON.stringify(value).slice(1, -1)
          : value
      }),
  }
}

function inStringLiteral(
  template: string,
  offset: number,
  length: number,
): boolean {
  return template[offset - 1] === '"' && template[offset + length] === '"'
}

function isFeature(feature: unknown): feature is IrFeature {
  return (
    typeof feature === 'object' &&
    feature !== null &&
    Array.isArray((feature as IrFeature).scenarios)
  )
}
