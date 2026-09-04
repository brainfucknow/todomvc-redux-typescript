import { basename } from 'node:path'

export const FEATURES_DIR = 'features'
export const IR_DIR = 'build/acceptance/ir'
export const GENERATED_DIR = 'build/acceptance/generated'
export const METADATA_DIR = 'metadata'
export const FEATURE_EXTENSION = '.feature'

const IR_EXTENSION = '.json'
const ENTRYPOINT_EXTENSION = '.acceptance.ts'

export const generatedEntrypointGlob = `${GENERATED_DIR}/*${ENTRYPOINT_EXTENSION}`

export function irFileName(featureFile: string): string {
  return `${basename(featureFile, FEATURE_EXTENSION)}${IR_EXTENSION}`
}

// The APS generator command takes exactly two arguments, so the generator is
// never told which feature it came from and has to read it back out of the
// slug the parse step wrote. Both halves of that round trip live here.
export function featurePathForIr(irPath: string): string {
  return `${FEATURES_DIR}/${basename(irPath, IR_EXTENSION)}${FEATURE_EXTENSION}`
}

export function entrypointFileName(irPath: string): string {
  return `${basename(irPath, IR_EXTENSION)}${ENTRYPOINT_EXTENSION}`
}
