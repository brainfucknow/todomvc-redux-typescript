/**
 * Prettier owns formatting; ESLint owns everything else. `eslint-config-prettier`
 * is the last block in eslint.config.js, so no lint rule can disagree with what
 * this file produces.
 *
 * Relationship to .editorconfig, which this must not fight:
 *
 *   indent_style = space, indent_size = 2   restated below as useTabs/tabWidth,
 *                                           so the two files agree in writing
 *                                           rather than by resolution order.
 *   charset = utf-8                         Prettier reads and writes UTF-8.
 *   trim_trailing_whitespace = false        Prettier has no option for either of
 *   insert_final_newline = false            these; it always trims trailing
 *                                           whitespace and always ends a file
 *                                           with a newline. `false` in
 *                                           EditorConfig means the editor leaves
 *                                           the decision alone, which is exactly
 *                                           what you want when a formatter owns
 *                                           it. Nothing here re-adds trailing
 *                                           space or strips the final newline,
 *                                           so no editor and this tool will ever
 *                                           take turns undoing each other.
 *
 * The two non-default options match the house style, so formatting the existing
 * code moved as few lines as possible: single quotes and no semicolons.
 */

module.exports = {
  useTabs: false,
  tabWidth: 2,
  endOfLine: 'lf',
  singleQuote: true,
  semi: false,
}
