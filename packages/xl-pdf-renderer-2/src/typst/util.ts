import { Exporter, InlineContentSchema, StyleSchema } from "@blocknote/core";

/** px -> pt (Typst works in points; BlockNote sizes are in px). */
export const PT = 0.75;

/** Escape a JS string for use inside a Typst string literal "...". */
export function escStr(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

/** A Typst string literal, e.g. `"foo"`. */
export function strLit(s: string): string {
  return `"${escStr(s)}"`;
}

/**
 * Join an array of inline-content expressions into Typst markup.
 *
 * Each inline mapping returns a Typst *expression* (e.g. `strong("x")`,
 * `link("u")[...]`). Prefixing each with `#` turns it into markup. We render
 * text as Typst string literals (`#"..."`) rather than raw markup so we never
 * have to escape markup-significant characters (`#`, `/`, `*`, `_`, `@`, ...).
 */
export function joinInline(
  exporter: Exporter<
    any,
    InlineContentSchema,
    StyleSchema,
    any,
    string,
    any,
    string
  >,
  inline: any[],
): string {
  const pieces = exporter.transformInlineContent(inline) as string[];
  return pieces.map((p) => "#" + p).join("");
}

/** Resolve a BlockNote color name to a hex string, or undefined for default. */
export function colorHex(
  exporter: any,
  name: string | undefined,
  kind: "text" | "background",
): string | undefined {
  if (!name || name === "default") {
    return undefined;
  }
  return exporter.options.colors?.[name]?.[kind];
}
