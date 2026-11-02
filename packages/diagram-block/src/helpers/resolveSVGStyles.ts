/**
 * Resolve Pele's self-contained theme defaults for SVG consumers without CSS
 * custom properties (notably Typst's SVG renderer). Keep preview SVG themeable.
 * Only presentation attributes are changed, never labels or accessibility text.
 */
export function resolveSVGStyles(svg: string): string {
  const rootStyle = svg.match(/^<svg\b[^>]*\bstyle="([^"]*)"/)?.[1] ?? "";
  const variables = new Map(
    [...rootStyle.matchAll(/(?:^|;)(--[\w-]+):([^;]*)/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );

  function resolve(value: string, resolving = new Set<string>()): string {
    return value.replace(
      // Pele emits at most one level of nested fallback functions.
      /var\((--[\w-]+)(?:,((?:[^()]|\([^()]*\))*))?\)/g,
      (original: string, name: string, fallback: string | undefined) => {
        const replacement = resolving.has(name)
          ? fallback
          : (variables.get(name) ?? fallback);
        if (replacement === undefined) {
          return original;
        }
        return resolve(replacement, new Set([...resolving, name]));
      },
    );
  }

  return svg.replace(/<[^>]+>/g, (tag) =>
    tag.replace(
      /\s(style|fill|stroke|color|font-family|font-weight|stop-color|flood-color)="([^"]*)"/g,
      (_attribute: string, name: string, value: string) =>
        ` ${name}="${resolve(value)}"`,
    ),
  );
}
