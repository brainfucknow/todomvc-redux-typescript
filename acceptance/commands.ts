import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { projectRoot } from './project-files.ts'

const runFile = promisify(execFile)

export type CommandResult = {
  code: number
  output: string
}

const executable = (name: string): string => join(projectRoot, 'node_modules', '.bin', name)

export const typescriptCompiler = executable('tsc')
export const viteBundler = executable('vite')

// Overrides are merged onto this process's environment, not a replacement for it.
export async function runCommand(
  command: string,
  args: string[],
  environmentOverrides: NodeJS.ProcessEnv = {},
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await runFile(command, args, {
      cwd: projectRoot,
      env: { ...process.env, ...environmentOverrides },
    })
    return { code: 0, output: `${stdout}${stderr}` }
  } catch (failure) {
    const failed = failure as { code?: number; stdout?: string; stderr?: string }
    return { code: failed.code ?? 1, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }
  }
}
