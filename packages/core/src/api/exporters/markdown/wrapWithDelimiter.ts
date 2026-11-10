/**
 * Move boundary whitespace and terminal hard breaks outside emphasis/strikethrough
 * delimiters so they parse as Markdown. Leave whitespace/hard-break-only content
 * unwrapped.
 */
export function wrapWithDelimiter(text: string, delimiter: string): string {
  // Keep each serialized <br> (backslash + newline) intact when trimming the end.
  const content = text.replace(/(?:\\\n|\s)+$/, "").trimStart();
  if (!content) {
    return text;
  }

  const start = text.indexOf(content);
  const leading = text.slice(0, start);
  const trailing = text.slice(start + content.length);

  return `${leading}${delimiter}${content}${delimiter}${trailing}`;
}
