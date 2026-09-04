// CRAP = cc^2 * (1 - coverage)^3 + cc, per function, from Vitest coverage.
//
//   node scripts/crap.mjs [--max <n>] [--reuse] [--all] [<path> ...]
//
// Paths restrict the gate to the files under them; without any, every covered
// file is gated. Only functions over the gate are listed unless --all is given.
// --reuse reads the existing coverage/coverage-final.json instead of running
// the unit tier again.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const DEFAULT_GATE = 10
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const coverageFile = join(projectRoot, 'coverage', 'coverage-final.json')

const DECISION_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.CatchClause,
])

const SHORT_CIRCUIT_OPERATORS = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
])

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
])

const isDecisionPoint = (node) =>
  DECISION_KINDS.has(node.kind) ||
  (ts.isBinaryExpression(node) && SHORT_CIRCUIT_OPERATORS.has(node.operatorToken.kind))

const functionName = (node) => {
  const named = node.name ?? node.parent?.name ?? node.parent?.left
  if (named && (ts.isIdentifier(named) || ts.isStringLiteral(named))) {
    return named.text
  }
  if (ts.isConstructorDeclaration(node)) {
    return `${node.parent.name?.text ?? 'class'}.constructor`
  }
  return '<anonymous>'
}

// A function's span, as istanbul reports positions: 1-based line, 0-based column.
const spanOf = (node, source) => {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source))
  const end = source.getLineAndCharacterOfPosition(node.getEnd())
  return {
    startLine: start.line + 1,
    startColumn: start.character,
    endLine: end.line + 1,
    endColumn: end.character,
  }
}

const contains = (span, position) => {
  const afterStart = position.line > span.startLine ||
    (position.line === span.startLine && position.column >= span.startColumn)
  const beforeEnd = position.line < span.endLine ||
    (position.line === span.endLine && position.column <= span.endColumn)
  return afterStart && beforeEnd
}

const spanLength = (span) => (span.endLine - span.startLine) * 1e6 + span.endColumn

const parseSource = (filePath) => ts.createSourceFile(
  filePath,
  readFileSync(filePath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
)

// Every decision point counts towards the innermost function enclosing it, so a
// callback never inflates the complexity of the function it is passed to.
function complexityByFunction(source) {
  const moduleScope = { name: '(module)', span: spanOf(source, source), complexity: 1 }
  const functions = [moduleScope]
  const visit = (node, enclosing) => {
    let scope = enclosing
    if (FUNCTION_KINDS.has(node.kind)) {
      scope = { name: functionName(node), span: spanOf(node, source), complexity: 1 }
      functions.push(scope)
    }
    if (isDecisionPoint(node)) {
      scope.complexity += 1
    }
    ts.forEachChild(node, (child) => visit(child, scope))
  }
  ts.forEachChild(source, (child) => visit(child, moduleScope))
  return functions
}

const innermostContaining = (functions, position) => functions
  .filter((candidate) => contains(candidate.span, position))
  .sort((left, right) => spanLength(left.span) - spanLength(right.span))[0]

function measureFile(filePath, fileCoverage) {
  const functions = complexityByFunction(parseSource(filePath))
  const tally = new Map(functions.map((entry) => [entry, { total: 0, covered: 0 }]))

  for (const [id, location] of Object.entries(fileCoverage.statementMap)) {
    const owner = innermostContaining(functions, {
      line: location.start.line,
      column: location.start.column,
    })
    if (!owner) {
      continue
    }
    const counts = tally.get(owner)
    counts.total += 1
    counts.covered += fileCoverage.s[id] > 0 ? 1 : 0
  }

  return functions.map((entry) => {
    const { total, covered } = tally.get(entry)
    const coverage = total === 0 ? 1 : covered / total
    return {
      name: entry.name,
      line: entry.span.startLine,
      complexity: entry.complexity,
      coverage,
      crap: entry.complexity ** 2 * (1 - coverage) ** 3 + entry.complexity,
    }
  })
}

function runCoverage() {
  execFileSync(
    process.execPath,
    [join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--coverage'],
    { cwd: projectRoot, stdio: 'inherit' },
  )
}

function readOptions(argv) {
  const options = { max: DEFAULT_GATE, reuse: false, all: false, paths: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--max') {
      index += 1
      options.max = Number(argv[index])
      if (Number.isNaN(options.max)) {
        throw new Error(`--max wants a number, got ${argv[index] ?? 'nothing'}`)
      }
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

const isGated = (file, paths) =>
  paths.length === 0 || paths.some((path) => file === path || file.startsWith(`${path}/`))

const formatRow = (file, entry) => [
  `${file}:${entry.line}`.padEnd(52),
  entry.name.padEnd(24),
  `cc ${String(entry.complexity).padStart(3)}`,
  `cov ${(entry.coverage * 100).toFixed(0).padStart(3)}%`,
  `crap ${entry.crap.toFixed(1).padStart(7)}`,
].join('  ')

function report(options) {
  if (!options.reuse) {
    runCoverage()
  }
  if (!existsSync(coverageFile)) {
    throw new Error(`no coverage report at ${coverageFile}`)
  }

  const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'))
  const measured = Object.entries(coverage)
    .map(([absolutePath, fileCoverage]) => ({
      file: relative(projectRoot, absolutePath),
      functions: measureFile(absolutePath, fileCoverage),
    }))
    .filter((entry) => isGated(entry.file, options.paths))
    .sort((left, right) => left.file.localeCompare(right.file))

  if (measured.length === 0) {
    throw new Error(`no covered files under ${options.paths.join(', ') || 'the project'}`)
  }

  const offenders = []
  for (const { file, functions } of measured) {
    const listed = functions.filter((entry) => options.all || entry.crap > options.max)
    for (const entry of listed.sort((left, right) => right.crap - left.crap)) {
      process.stdout.write(`${formatRow(file, entry)}\n`)
    }
    offenders.push(...functions.filter((entry) => entry.crap > options.max))
  }

  const functionCount = measured.reduce((total, entry) => total + entry.functions.length, 0)
  process.stdout.write(
    `\ngate CRAP <= ${options.max} | files: ${measured.length} | ` +
    `functions: ${functionCount} | over the gate: ${offenders.length}\n`,
  )
  return offenders.length === 0 ? 0 : 1
}

try {
  process.exit(report(readOptions(process.argv.slice(2))))
} catch (failure) {
  process.stderr.write(`${failure.message}\n`)
  process.exit(2)
}
