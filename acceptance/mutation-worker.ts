import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { METADATA_DIR } from './layout.ts'
import type { Completion, Job } from './mutation-jobs.ts'
import { classify, jobTimeout, responseLine } from './mutation-jobs.ts'
import { projectRoot } from './project-files.ts'

// The runner adapter gherkin-mutator drives: one newline-delimited JSON job per
// line on stdin, one response per line on stdout, diagnostics on stderr, and
// nothing else on stdout ever.
//
// A generated entry point reads its IR from the path recorded in its metadata,
// so running the same tests against a mutated IR means putting the mutation's
// feature.json at that path. The mutator sends one job at a time.

const vitest = join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')
const config = 'vitest.acceptance-mutation.config.ts'

const irPathFor = (generatedDir: string): string => {
  const metadataDir = join(projectRoot, generatedDir, METADATA_DIR)
  const [metadataFile] = readdirSync(metadataDir).filter((entry) => entry.endsWith('.json'))
  if (!metadataFile) {
    throw new Error(`no generated metadata in ${metadataDir}`)
  }
  const metadata: { ir_path?: string } = JSON.parse(readFileSync(join(metadataDir, metadataFile), 'utf8'))
  if (!metadata.ir_path) {
    throw new Error(`${metadataFile} records no ir_path`)
  }
  return join(projectRoot, metadata.ir_path)
}

const runGeneratedTests = (job: Job): Completion => {
  copyFileSync(join(projectRoot, job.feature_json), irPathFor(job.generated_dir))
  const run = spawnSync(process.execPath, [vitest, 'run', '--config', config], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: jobTimeout(job.timeout),
  })
  return {
    exitCode: run.status,
    output: `${run.stdout ?? ''}${run.stderr ?? ''}`,
    failure: run.error?.message,
  }
}

const complete = (job: Job): Completion => {
  try {
    return runGeneratedTests(job)
  } catch (failure) {
    return { exitCode: null, output: '', failure: (failure as Error).message }
  }
}

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  if (line.trim() === '') {
    continue
  }
  const job: Job = JSON.parse(line)
  const startedAt = process.hrtime.bigint()
  const result = classify(complete(job))
  process.stdout.write(responseLine(job.id, result, Number(process.hrtime.bigint() - startedAt)))
}
