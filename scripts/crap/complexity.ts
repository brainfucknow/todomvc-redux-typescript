// Cyclomatic complexity per function, read off the TypeScript AST.
import ts from 'typescript'

// A source position as istanbul reports it: 1-based line, 0-based column.
export type Position = { line: number; column: number }

export type Span = { start: Position; end: Position }

export type FunctionComplexity = {
  name: string
  span: Span
  complexity: number
}

export const MODULE_SCOPE = '(module)'

const DECISION_KINDS = new Set<ts.SyntaxKind>([
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

const SHORT_CIRCUIT_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
])

const FUNCTION_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
])

const isDecisionPoint = (node: ts.Node): boolean =>
  DECISION_KINDS.has(node.kind) ||
  (ts.isBinaryExpression(node) && SHORT_CIRCUIT_OPERATORS.has(node.operatorToken.kind))

// A function expression is usually named by what it is assigned to rather than
// by itself: `const f = () => {}`, `{ f: () => {} }`, `f = () => {}`.
const namingNode = (node: ts.Node): ts.Node | undefined => {
  const own = (node as { name?: ts.Node }).name
  const holder = node.parent as { name?: ts.Node; left?: ts.Node } | undefined
  return own ?? holder?.name ?? holder?.left
}

const functionName = (node: ts.Node): string => {
  const named = namingNode(node)
  if (named && (ts.isIdentifier(named) || ts.isStringLiteral(named))) {
    return named.text
  }
  // A named class names its own constructor through the clause above, so only
  // a class with no name of its own reaches here.
  if (ts.isConstructorDeclaration(node)) {
    return 'class.constructor'
  }
  return '<anonymous>'
}

const spanOf = (node: ts.Node, source: ts.SourceFile): Span => {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source))
  const end = source.getLineAndCharacterOfPosition(node.getEnd())
  return {
    start: { line: start.line + 1, column: start.character },
    end: { line: end.line + 1, column: end.character },
  }
}

const parse = (fileName: string, text: string): ts.SourceFile => ts.createSourceFile(
  fileName,
  text,
  ts.ScriptTarget.Latest,
  true,
  fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
)

// Every decision point counts towards the innermost function enclosing it, so a
// callback never inflates the complexity of the function it is passed to. Code
// outside any function is the module scope's own complexity.
export function complexityByFunction(fileName: string, text: string): FunctionComplexity[] {
  const source = parse(fileName, text)
  const moduleScope = { name: MODULE_SCOPE, span: spanOf(source, source), complexity: 1 }
  const functions = [moduleScope]
  const visit = (node: ts.Node, enclosing: FunctionComplexity): void => {
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
