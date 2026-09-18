import { ExporterOptions } from "@blocknote/core";

/** px -> pt (Typst works in points; BlockNote sizes are in px). */
export const PT = 0.75;

const ESC: Record<string, string> = {
  "\\": "\\\\",
  '"': '\\"',
  "\n": "\\n",
  "\t": "\\t",
};

/** Escape a JS string for use inside a Typst string literal "...". */
export function escStr(s: string): string {
  // CRLF and lone CR both mean a line break - dropping the CR outright would
  // silently merge lines (e.g. in code blocks from old-Mac clipboards).
  return String(s)
    .replace(/\r\n?/g, "\n")
    .replace(/[\\"\n\t]/g, (c) => ESC[c]);
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
  // The tick is `place`d (out of flow) so both boxes keep identical metrics -
  // otherwise typst's baseline-aligned list markers (PR #7895) drop the
  // checked box below its text. The 0.13em baseline shift centres the box on
  // the text's cap height (verified against a 600dpi raster). The tick is a
  // single round-capped polyline: two separate rotated `line`s (the previous
  // shape) leave a visible gap at the corner, butt caps making it worse.
  `#let _cb-box(fill, stroke, tick) = box(baseline: 0.13em, width: 0.9em, height: 0.9em, radius: 2pt, stroke: 0.08em + stroke, fill: fill, tick)`,
  `#let _cb-unchecked = _cb-box(white, luma(148), none)`,
  `#let _cb-checked = _cb-box(rgb("#3183c8"), rgb("#3183c8"), place(top + left, curve(`,
  `  stroke: (paint: white, thickness: 0.11em, cap: "round", join: "round"),`,
  `  curve.move((0.20em, 0.47em)),`,
  `  curve.line((0.37em, 0.63em)),`,
  `  curve.line((0.70em, 0.27em)),`,
  `)))`,
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

/**
 * The grey editor-style placeholder used when a block's user-written source
 * is invalid (e.g. LaTeX or Mermaid that doesn't parse) - a Typst
 * *expression* (no leading `#`); mirrors the color the editor and the other
 * exporters use for their error placeholders.
 */
export function errorPlaceholder(message: string): string {
  return `text(fill: rgb("#999999"), ${strLit(message)})`;
}
