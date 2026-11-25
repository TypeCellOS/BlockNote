/**
 * Escapes the characters `&`, `<`, `>` and `"`. The HTML parser then reads the
 * string as text, also in an attribute value in double quotes.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
