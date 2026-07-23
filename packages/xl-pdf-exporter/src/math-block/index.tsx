import { Math } from "@react-pdf/math";
import { View } from "@react-pdf/renderer";

import { pdfBlockMappingForDefaultSchema } from "../pdf/defaultSchema/blocks.js";

// The math block's inline content as plain text (its LaTeX source). Local
// copy of `@blocknote/math-block`'s `getMathPlainTextContent` - importing the
// package would break headless (Node) exports, as its build carries a
// top-level CSS import.
const getPlainTextContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((node) =>
        node && typeof node === "object" && "text" in node ? node.text : "",
      )
      .join("");
  }

  return "";
};

/**
 * Block mapping for `@blocknote/math-block` that renders math blocks as
 * actual formulas (via `@react-pdf/math`, which converts the LaTeX to SVG
 * paths with MathJax) instead of their LaTeX source:
 *
 * ```ts
 * new PDFExporter(schema, {
 *   ...pdfDefaultSchemaMappings,
 *   blockMapping: {
 *     ...pdfDefaultSchemaMappings.blockMapping,
 *     math: mathBlockMapping,
 *   },
 * });
 * ```
 *
 * Kept out of the default mappings so exporting without math blocks doesn't
 * load MathJax. Invalid LaTeX renders as MathJax's own error output.
 *
 * There's no counterpart for inline math: react-pdf silently drops SVG
 * elements inside `Text`, and paragraphs are rendered as `Text`, so inline
 * math keeps the default mapping (its LaTeX source in a monospaced font).
 */
export const mathBlockMapping = (
  ...args: Parameters<typeof pdfBlockMappingForDefaultSchema.math>
) => {
  const [block] = args;

  const source = getPlainTextContent(block.content);
  if (!source.trim()) {
    return pdfBlockMappingForDefaultSchema.math(...args);
  }

  return (
    <View key={"math"} style={{ alignItems: "center" }}>
      <Math>{source}</Math>
    </View>
  );
};
