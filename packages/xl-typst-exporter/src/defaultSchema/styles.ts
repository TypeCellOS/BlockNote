import { DefaultStyleSchema, StyleMapping } from "@blocknote/core";
import { colorHex } from "../util.js";

/**
 * A style maps to a wrapper that takes an inner Typst expression and returns a
 * wrapped one, e.g. bold -> `(e) => strong(${e})`. This composes naturally with
 * Typst's nested element model (`strong(emph("x"))`).
 */
type Wrap = (inner: string) => string;
const id: Wrap = (e) => e;

export const typstStyleMappingForDefaultSchema: StyleMapping<
  DefaultStyleSchema,
  Wrap
> = {
  bold: (v) => (v ? (e) => `strong(${e})` : id),
  italic: (v) => (v ? (e) => `emph(${e})` : id),
  underline: (v) => (v ? (e) => `underline(${e})` : id),
  strike: (v) => (v ? (e) => `strike(${e})` : id),
  // `code` is handled in transformStyledText (wraps the text in `raw(...)`),
  // so the style wrapper itself is a no-op.
  code: () => id,
  textColor: (v, ex) => {
    const hex = colorHex(ex, v as string, "text");
    return hex ? (e) => `text(fill: rgb("${hex}"), ${e})` : id;
  },
  backgroundColor: (v, ex) => {
    const hex = colorHex(ex, v as string, "background");
    return hex ? (e) => `highlight(fill: rgb("${hex}"), ${e})` : id;
  },
};
