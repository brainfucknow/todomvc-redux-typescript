import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { projectRoot } from './project-files.ts'

const runFile = promisify(execFile)

export type CommandResult = {
  code: number
  output: string
}

export const typescriptCompiler = join(projectRoot, 'node_modules', '.bin', 'tsc')

export async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await runFile(command, args, { cwd: projectRoot })
    return { code: 0, output: `${stdout}${stderr}` }
  } catch (failure) {
    const failed = failure as { code?: number; stdout?: string; stderr?: string }
    return { code: failed.code ?? 1, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }
  }
}
