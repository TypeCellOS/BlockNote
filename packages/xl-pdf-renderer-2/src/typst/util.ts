import {
  Exporter,
  ExporterOptions,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

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

/**
 * Typst `#let` definitions for the two check-list markers, drawn with
 * primitives (no glyph/font dependency): a grey rounded outline when unchecked,
 * a BlockNote-blue rounded box with a white tick when checked. Included once in
 * the preamble; each check item then uses one of these as its *list marker* (via
 * a single-item `#list(marker: …)`), so the checkbox hangs like a real bullet
 * and wrapped lines indent under the text. (Marker shapes adapted from the
 * MIT-licensed `cheq` package.)
 */
export const CHECKBOX_MARKER_DEFS = [
  `#let _cb-unchecked = box(baseline: 0.24em, width: 0.9em, height: 0.9em, radius: 2pt, stroke: 0.08em + luma(148), fill: white)`,
  // The check mark is `place`d (out of flow) so the box keeps the same metrics
  // as the unchecked box — otherwise typst's baseline-aligned list markers
  // (PR #7895) drop the checked box below its text. The baseline shift centres
  // the box on the text's x-height.
  `#let _cb-checked = box(baseline: 0.24em, width: 0.9em, height: 0.9em, radius: 2pt, stroke: 0.08em + rgb("#3183c8"), fill: rgb("#3183c8"), place(center + horizon, {`,
  `  box(move(dx: -0.11em, dy: 0.05em, rotate(45deg, line(length: 0.2em, stroke: white + 0.11em))))`,
  `  box(move(dx: 0.02em, dy: -0.04em, rotate(-45deg, line(length: 0.38em, stroke: white + 0.11em))))`,
  `}))`,
].join("\n");

/** The check-list marker symbol name (defined by {@link CHECKBOX_MARKER_DEFS}). */
export function checkboxMarker(checked: boolean): string {
  return checked ? "_cb-checked" : "_cb-unchecked";
}

/**
 * A small grey right-pointing chevron used to mark a toggle list item (drawn
 * with primitives, no glyph dependency) — mirroring the editor and the other
 * exporters, which prefix toggles with a chevron.
 */
export const TOGGLE_CHEVRON = `#box(baseline: 0.02em, move(dy: 0.04em, polygon(fill: luma(115), (0pt, 0pt), (0.32em, 0.2em), (0pt, 0.4em))))#h(0.35em)`;

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
  exporter: { options: ExporterOptions },
  name: string | undefined,
  kind: "text" | "background",
): string | undefined {
  if (!name || name === "default") {
    return undefined;
  }
  const colors = exporter.options.colors as Record<
    string,
    { text: string; background: string } | undefined
  >;
  return colors[name]?.[kind];
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/avif": "avif",
};

/**
 * Pick a file extension for an image from its MIME type, falling back to the
 * URL's extension and then `png`. Typst infers the image format from the
 * shadow-file path's extension, so this needs to match the actual bytes.
 */
export function imageExtension(
  mimeType: string | undefined,
  url: string,
): string {
  if (mimeType && MIME_EXT[mimeType]) {
    return MIME_EXT[mimeType];
  }
  const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url);
  return match ? match[1].toLowerCase() : "png";
}
