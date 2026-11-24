// Firefox serializes CSSOM-created style attributes in a different position
// from Chromium and WebKit. Keep the value, but snapshot it last.
export function normalizeHTMLStyleAttribute(html: string): string {
  // Do not reparse the document: that would also insert missing <tbody>s
  // and hide changes to the HTML that the exporter actually returns.
  return html.replace(
    /<!--[\s\S]*?-->|(<[a-z][\w:-]*)((?:\s+[\w:.-]+(?:="[^"]*")?)*)(\s*\/?>)/gi,
    (match, start?: string, attributes?: string, end?: string) => {
      if (!start || !attributes || !end) {
        return match;
      }
      const style = attributes.match(/\s+style="[^"]*"/i);
      return style
        ? start + attributes.replace(style[0], "") + style[0] + end
        : match;
    },
  );
}
