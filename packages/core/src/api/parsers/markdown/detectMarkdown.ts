// Headings H1-H6.
const h1 = /(^|\n) {0,3}#{1,6} {1,8}[^\n]{1,64}\r?\n\r?\n\s{0,32}\S/;

// Bold, italic, underline, strikethrough, highlight.
const bold =
  /(_|__|\*|\*\*|~~|==|\+\+)(?!\s)(?:[^\s](?:.{0,62}[^\s])?|\S)(?=\1)/;

// Basic inline link (also captures images).
const link = /\[[^\]]{1,128}\]\(https?:\/\/\S{1,999}\)/;

// Inline code.
const code = /(?:\s|^)`(?!\s)(?:[^\s`](?:[^`]{0,46}[^\s`])?|[^\s`])`([^\w]|$)/;

// Unordered list.
const ul = /(?:^|\n)\s{0,5}-\s{1}[^\n]+\n\s{0,15}-\s/;

// Ordered list.
const ol = /(?:^|\n)\s{0,5}\d+\.\s{1}[^\n]+\n\s{0,15}\d+\.\s/;

// Horizontal rule.
const hr = /\n{2} {0,3}-{2,48}\n{2}/;

// Fenced code block.
const fences =
  /(?:\n|^)(```|~~~|\$\$)(?!`|~)[^\s]{0,64} {0,64}[^\n]{0,64}\n[\s\S]{0,9999}?\s*\1 {0,64}(?:\n+|$)/;

// Classical underlined H1 and H2 headings.
const title = /(?:\n|^)(?!\s)\w[^\n]{0,64}\r?\n(-|=)\1{0,64}\n\n\s{0,64}(\w|$)/;

// Blockquote.
const blockquote =
  /(?:^|(\r?\n\r?\n))( {0,3}>[^\n]{1,333}\n){1,999}($|(\r?\n))/;

// Table Header
const tableHeader = /^\s*\|(.+\|)+\s*$/m;

// Table Divider
const tableDivider = /^\s*\|(\s*[-:]+[-:]\s*\|)+\s*$/m;

// Table Row
const tableRow = /^\s*\|(.+\|)+\s*$/m;

/**
 * Returns `true` if the source text might be a markdown document.
 *
 * @param src Source text to analyze.
 */
export const isMarkdown = (src: string): boolean =>
  h1.test(src) ||
  bold.test(src) ||
  link.test(src) ||
  code.test(src) ||
  ul.test(src) ||
  ol.test(src) ||
  hr.test(src) ||
  fences.test(src) ||
  title.test(src) ||
  blockquote.test(src) ||
  tableHeader.test(src) ||
  tableDivider.test(src) ||
  tableRow.test(src);
