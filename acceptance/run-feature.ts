import { readFeature, runFeature } from './runtime'
import { projectSteps } from './steps'

// Its own module so that `runtime.ts` never names `./steps`, which would be the
// import cycle scripts/architecture/boundaries.mjs rejects.
export function runGeneratedFeature(irPath: string): void {
  runFeature(readFeature(irPath), projectSteps)
}
