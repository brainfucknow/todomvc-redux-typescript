import { readFeature, runFeature } from './runtime'
import { projectSteps } from './steps'

/**
 * Where the generic runtime meets this project's step vocabulary, and the only
 * place that knows both. Generated entry points under
 * `build/acceptance/generated/` call this; nothing else should.
 *
 * It is its own module so that `runtime.ts` never names `./steps`: the steps
 * import the runtime's types, and an engine that imported them back would make
 * the two define each other. scripts/architecture/boundaries.spec.mjs fails on
 * that cycle.
 */
export function runGeneratedFeature(irPath: string): void {
  runFeature(readFeature(irPath), projectSteps)
}
