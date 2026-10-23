/**
 * Move boundary whitespace outside emphasis/strikethrough delimiters so they
 * parse as Markdown. Leave empty or whitespace-only content unwrapped.
 */
export function wrapWithDelimiter(text: string, delimiter: string): string {
  const content = text.trim();
  if (!content) {
    return text;
  }

  const start = text.indexOf(content);
  const leading = text.slice(0, start);
  const trailing = text.slice(start + content.length);

  return `${leading}${delimiter}${content}${delimiter}${trailing}`;
}
