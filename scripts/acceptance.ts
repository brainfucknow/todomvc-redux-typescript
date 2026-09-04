import { join } from 'node:path'
import { FEATURES_DIR, GENERATED_DIR, IR_DIR, irFileName } from '../acceptance/layout.ts'
import {
  announce,
  bootstrapTools,
  emptyDirectories,
  featureFiles,
  generateEntrypoints,
  parseFeature,
  runTool,
} from '../acceptance/pipeline.ts'
import { projectRoot } from '../acceptance/project-files.ts'

const featuresDir = join(projectRoot, FEATURES_DIR)
const irDir = join(projectRoot, IR_DIR)
const generatedDir = join(projectRoot, GENERATED_DIR)
const vitest = join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')

bootstrapTools()
emptyDirectories(irDir, generatedDir)

for (const feature of featureFiles()) {
  const irPath = join(irDir, irFileName(feature))
  announce(`parsing ${FEATURES_DIR}/${feature}`)
  parseFeature(join(featuresDir, feature), irPath)
  generateEntrypoints(irPath, generatedDir)
}

announce('running generated acceptance tests')
runTool(process.execPath, [vitest, 'run', '--config', 'vitest.acceptance.config.ts'])
