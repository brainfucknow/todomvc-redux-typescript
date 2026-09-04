import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Feature, Step, StepHandler } from '../acceptance/runtime.ts'
import { expandScenarios, matchStep, resolveArgument, runExecution } from '../acceptance/runtime.ts'

const placeholderName = fc.stringMatching(/^[A-Za-z0-9_]{1,10}$/)
const stepArb: fc.Arbitrary<Step> = fc.record({
  keyword: fc.constantFrom('Given', 'When', 'Then', 'And'),
  text: fc.string({ minLength: 1, maxLength: 20 }),
})
const exampleArb = fc.dictionary(placeholderName, fc.string(), { maxKeys: 4 })
const featureArb: fc.Arbitrary<Feature> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 10 }),
  background: fc.array(stepArb, { maxLength: 3 }),
  scenarios: fc.array(fc.record({
    name: fc.string({ minLength: 1, maxLength: 10 }),
    steps: fc.array(stepArb, { maxLength: 4 }),
    examples: fc.array(exampleArb, { maxLength: 4 }),
  }), { maxLength: 4 }),
})

describe('expandScenarios', () => {
  it('runs a scenario once per example row, and once when it has none', () => {
    fc.assert(fc.property(featureArb, (feature) => {
      const rows = feature.scenarios.reduce((total, scenario) =>
        total + Math.max(1, scenario.examples?.length ?? 0), 0)
      expect(expandScenarios(feature)).toHaveLength(rows)
    }))
  })

  it('gives every execution the background steps followed by the scenario steps', () => {
    fc.assert(fc.property(featureArb, (feature) => {
      const background = feature.background ?? []
      const expected = feature.scenarios.flatMap((scenario) =>
        (scenario.examples?.length ? scenario.examples : [{}]).map(() => [...background, ...scenario.steps]))
      expect(expandScenarios(feature).map((execution) => execution.steps)).toEqual(expected)
    }))
  })

  it('numbers examples from one, in the order the rows were written', () => {
    fc.assert(fc.property(featureArb, (feature) => {
      const executions = expandScenarios(feature)
      const expected = feature.scenarios.flatMap((scenario) =>
        (scenario.examples?.length ? scenario.examples : [{}])
          .map((example, index) => ({ name: `${scenario.name}/example_${index + 1}`, example })))
      expect(executions.map(({ name, example }) => ({ name, example }))).toEqual(expected)
    }))
  })
})

describe('resolveArgument', () => {
  it('answers with the example value itself, whatever the value contains', () => {
    fc.assert(fc.property(placeholderName, fc.string(), exampleArb, (name, value, rest) => {
      expect(resolveArgument(`<${name}>`, { ...rest, [name]: value })).toBe(value)
    }))
  })

  it('substitutes once, so a value that looks like a placeholder stays a value', () => {
    fc.assert(fc.property(placeholderName, placeholderName, fc.string(), (outer, inner, value) => {
      fc.pre(outer !== inner)
      const example = { [outer]: `<${inner}>`, [inner]: value }
      expect(resolveArgument(`<${outer}>`, example)).toBe(`<${inner}>`)
    }))
  })

  it('passes anything that is not a bare placeholder through unchanged', () => {
    fc.assert(fc.property(fc.string(), exampleArb, (capture, example) => {
      fc.pre(!/^<[A-Za-z0-9_]+>$/.test(capture))
      expect(resolveArgument(capture, example)).toBe(capture)
    }))
  })

  it('names the placeholder it has no value for', () => {
    fc.assert(fc.property(placeholderName, exampleArb, (name, example) => {
      fc.pre(!(name in example))
      expect(() => resolveArgument(`<${name}>`, example)).toThrow(name)
    }))
  })
})

const recording = (pattern: RegExp): StepHandler<string[][]> => ({
  pattern,
  run: (world, args) => { world.push(args) },
})

describe('matchStep', () => {
  it('returns the one handler whose pattern matches, with its captures', () => {
    fc.assert(fc.property(fc.array(fc.stringMatching(/^[a-z]{1,6}$/), { maxLength: 3 }), (words) => {
      const text = ['step', ...words].join(' ')
      const wanted = recording(/^step([\s\S]*)$/)
      expect(matchStep(text, [recording(/^nothing$/), wanted]).handler).toBe(wanted)
    }))
  })

  it('refuses to choose when more than one handler matches', () => {
    fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 10 }), (text) => {
      const handlers = [recording(/^([\s\S]*)$/), recording(/^([\s\S]+|)$/)]
      expect(() => matchStep(text, handlers)).toThrow(/ambiguous/i)
    }))
  })

  it('refuses step text no handler claims', () => {
    fc.assert(fc.property(fc.string({ minLength: 1 }), (text) => {
      expect(() => matchStep(text, [])).toThrow(/unsupported/i)
    }))
  })
})

describe('runExecution', () => {
  it('runs every step once, in order, with its arguments resolved', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.tuple(placeholderName, fc.string()), { minLength: 1, maxLength: 6 }),
      async (bindings) => {
        const example = Object.fromEntries(bindings)
        const world: string[][] = []
        const execution = {
          name: 'scenario/example_1',
          steps: bindings.map(([name]) => ({ keyword: 'Then', text: `step <${name}>` })),
          example,
        }

        await runExecution(execution, [recording(/^step (\S+)$/)], world)

        expect(world).toEqual(bindings.map(([name]) => [example[name]]))
      },
    ))
  })
})
