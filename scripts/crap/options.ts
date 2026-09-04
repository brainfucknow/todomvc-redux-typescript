// What a command line asks the gate for.
export type Options = {
  max: number
  reuse: boolean
  all: boolean
  paths: string[]
}

export const DEFAULT_GATE = 10

const gateFrom = (value: string | undefined): number => {
  const max = Number(value)
  if (Number.isNaN(max)) {
    throw new Error(`--max wants a number, got ${value ?? 'nothing'}`)
  }
  return max
}

export function readOptions(argv: string[]): Options {
  const options: Options = { max: DEFAULT_GATE, reuse: false, all: false, paths: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--max') {
      index += 1
      options.max = gateFrom(argv[index])
    } else if (argument === '--reuse') {
      options.reuse = true
    } else if (argument === '--all') {
      options.all = true
    } else if (argument.startsWith('-')) {
      throw new Error(`unknown option ${argument}`)
    } else {
      options.paths.push(argument.replace(/\/+$/, ''))
    }
  }
  return options
}

// A path argument names a file or a directory to gate; without any, the gate
// covers every measured file.
export const isGated = (file: string, paths: string[]): boolean =>
  paths.length === 0 || paths.some((path) => file === path || file.startsWith(`${path}/`))
