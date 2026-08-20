import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import { strLit } from "@blocknote/xl-pdf-renderer-2";
import { tex2typst } from "tex2typst";

import { latexToMathML } from "../exporterHelpers/latexToMathML.js";
import { getMathExporterDictionary } from "../i18n/dictionary.js";

type MathBlock = BlockFromConfigNoChildren<
  BlockConfig<"mathBlock", {}, "plain">,
  any,
  any
>;

type InlineMath = { type: "math"; content: string };

// Converts LaTeX to Typst math notation (the content of a `$...$` equation).
// tex2typst is a lightweight translator that passes some invalid LaTeX
// through, so the LaTeX is validated with KaTeX first - the same parser (and
// typed error) the other exporter mappings use. Invalid LaTeX is expected
// (the source is user input), so it comes back as a typed error rather than
// thrown.
function latexToTypstMath(
  latex: string,
): { error?: undefined; math: string } | { error: string } {
  const validation = latexToMathML(latex, true);
  if (validation.error !== undefined) {
    return { error: validation.error };
  }
  return { math: tex2typst(latex) };
}

// Mirrors the editor, which shows the error state in the preview
// placeholder, identifying the formula by its source. The parser's message
// is deliberately NOT rendered: it's authoring detail (and untranslated
// English) - the editor is where the author sees and fixes it.
function errorText(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
): string {
  return `text(fill: rgb("#999999"), ${strLit(
    getMathExporterDictionary(exporter).invalid_formula(source),
  )})`;
}

/**
 * Typst block mapping for `@blocknote/math-block` that renders math blocks
 * as native Typst equations (real text, not images - the LaTeX is converted
 * to Typst math notation with `tex2typst`). The equation carries the LaTeX
 * source as its alt text, as PDF/UA requires formulas to have one. Invalid
 * LaTeX renders an error placeholder (mirroring the editor):
 *
 * ```ts
 * import { mathBlockMapping } from "@blocknote/math-block/typst-exporter";
 *
 * new TypstExporter(schema, {
 *   ...typstDefaultSchemaMappings,
 *   blockMapping: {
 *     ...typstDefaultSchemaMappings.blockMapping,
 *     mathBlock: mathBlockMapping,
 *   },
 * });
 * ```
 */
export function mathBlockMapping(
  block: MathBlock,
  exporter: Exporter<any, any, any, any, any, any, any>,
): string {
  const source = plainContentToString(block.content);
  if (!source.trim()) {
    return "";
  }

  const result = latexToTypstMath(source);
  if (result.error !== undefined) {
    return `#align(center)[#${errorText(exporter, source)}]`;
  }

  // A block equation is a display equation, centered by default (matching the
  // editor and the other exporters).
  return `#math.equation(block: true, alt: ${strLit(source)}, $ ${
    result.math
  } $)`;
}

/**
 * Typst inline content mapping for `@blocknote/math-block` that renders
 * inline math as native Typst equations flowing with the text - see
 * {@link mathBlockMapping} for the conversion and alt-text details. Invalid
 * LaTeX renders an error placeholder (mirroring the editor):
 *
 * ```ts
 * import { inlineMathMapping } from "@blocknote/math-block/typst-exporter";
 *
 * new TypstExporter(schema, {
 *   ...typstDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...typstDefaultSchemaMappings.inlineContentMapping,
 *     math: inlineMathMapping,
 *   },
 * });
 * ```
 */
export function inlineMathMapping(
  inlineContent: InlineMath,
  exporter: Exporter<any, any, any, any, any, any, any>,
): string {
  const source = inlineContent.content;
  if (!source.trim()) {
    // Inline mappings return a Typst *expression*; an empty string literal
    // renders nothing.
    return `""`;
  }

  const result = latexToTypstMath(source);
  if (result.error !== undefined) {
    return errorText(exporter, source);
  }

  return `math.equation(alt: ${strLit(source)}, $${result.math}$)`;
}
