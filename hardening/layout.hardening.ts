import { describe, expect, test } from 'vitest'
import {
  FEATURES_DIR,
  FEATURE_EXTENSION,
  GENERATED_DIR,
  IR_DIR,
  METADATA_DIR,
  MUTATION_FEATURES_DIR,
  MUTATION_GENERATED_DIR,
  MUTATION_IR_DIR,
  MUTATION_WORK_DIR,
  generatedEntrypointGlob,
  mutationEntrypointGlob,
} from '../acceptance/layout.ts'

// The pipeline's directories are a contract with three things outside this
// package: scripts/acceptance.ts writes them, vitest.acceptance.config.ts reads
// them, and PLAN.md section 4 fixes them. Naming each one here is what makes
// moving a directory a decision rather than an accident.
describe('where the acceptance pipeline keeps its files', () => {
  test('feature files are read from features/', () => {
    expect(FEATURES_DIR).toBe('features')
  })

  test('parser IR is written under build/acceptance/ir', () => {
    expect(IR_DIR).toBe('build/acceptance/ir')
  })

  test('generated entry points are written under build/acceptance/generated', () => {
    expect(GENERATED_DIR).toBe('build/acceptance/generated')
  })

  test('generated metadata sits in a metadata/ directory beside them', () => {
    expect(METADATA_DIR).toBe('metadata')
  })

  test('the two build directories are distinct, so generating cannot overwrite the IR', () => {
    expect(GENERATED_DIR).not.toBe(IR_DIR)
  })

  test('feature files carry the .feature extension', () => {
    expect(FEATURE_EXTENSION).toBe('.feature')
  })

  test('the acceptance runner is pointed at the generated directory', () => {
    expect(generatedEntrypointGlob.startsWith(`${GENERATED_DIR}/`)).toBe(true)
  })
})

describe('where acceptance mutation keeps its files', () => {
  test('the whole mutation run lives under build/acceptance-mutation', () => {
    expect(MUTATION_WORK_DIR).toBe('build/acceptance-mutation')
  })

  test('staged features, IR and generated tests each get their own directory', () => {
    expect([MUTATION_FEATURES_DIR, MUTATION_IR_DIR, MUTATION_GENERATED_DIR]).toEqual([
      'build/acceptance-mutation/features',
      'build/acceptance-mutation/ir',
      'build/acceptance-mutation/generated',
    ])
  })

  test('the mutation run reads entry points from its own directory, not the normal one', () => {
    expect(mutationEntrypointGlob).toBe('build/acceptance-mutation/generated/*.acceptance.ts')
    expect(mutationEntrypointGlob).not.toBe(generatedEntrypointGlob)
  })

  test('staging a feature never writes anywhere near the feature files themselves', () => {
    expect(MUTATION_FEATURES_DIR.startsWith(`${FEATURES_DIR}/`)).toBe(false)
  })
})
