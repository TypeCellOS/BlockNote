import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import { AlignmentType, ImportedXmlComponent, Paragraph, TextRun } from "docx";
import { mml2omml } from "mathml2omml";

import { latexToMathML } from "../exporterHelpers/latexToMathML.js";
import { getMathExporterDictionary } from "../i18n/dictionary.js";

type MathBlock = BlockFromConfigNoChildren<
  BlockConfig<"math", {}, "plain">,
  any,
  any
>;

type InlineMath = { type: "inlineMath"; content: string };

// Converts LaTeX to a native Word equation (OMML): KaTeX renders the LaTeX
// to MathML, which is then converted to OMML. Invalid LaTeX comes back as a
// typed error, for the mappings to render as a placeholder.
function latexToDocxEquation(
  latex: string,
  inline: boolean,
): { error?: undefined; equation: ImportedXmlComponent } | { error: string } {
  const mathML = latexToMathML(latex, inline);
  if (mathML.error !== undefined) {
    return { error: mathML.error };
  }

  // `fromXmlString` parses the XML *document*, returning a nameless wrapper
  // component around the `m:oMath` root element - unwrap it, or it would
  // serialize as an (invalid) `<undefined>` element.
  const imported = ImportedXmlComponent.fromXmlString(
    mml2omml(mathML.mathML),
  ) as any;
  return { equation: imported.root[0] as ImportedXmlComponent };
}

// Mirrors the editor, which shows the error state in the preview
// placeholder. The LaTeX source identifies which formula broke; the message
// comes from the typed error result, so it's safe to show. The text comes
// from the math dictionary (see ExporterOptions.dictionary).
function errorText(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
  message: string,
) {
  return new TextRun({
    text: getMathExporterDictionary(exporter).invalid_formula(source, message),
    italics: true,
    color: "999999",
  });
}

/**
 * DOCX block mapping for `@blocknote/math-block` that renders math blocks as
 * native (editable) Word equations. Invalid LaTeX renders an error
 * placeholder (mirroring the editor):
 *
 * ```ts
 * import { mathBlockMapping } from "@blocknote/math-block/docx-exporter";
 *
 * new DOCXExporter(schema, {
 *   ...docxDefaultSchemaMappings,
 *   blockMapping: {
 *     ...docxDefaultSchemaMappings.blockMapping,
 *     math: mathBlockMapping,
 *   },
 * });
 * ```
 */
export function mathBlockMapping(
  block: MathBlock,
  exporter: Exporter<any, any, any, any, any, any, any>,
) {
  const source = plainContentToString(block.content);
  if (!source.trim()) {
    return new Paragraph({});
  }

  const result = latexToDocxEquation(source, false);
  if (result.error !== undefined) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [errorText(exporter, source, result.error)],
    });
  }

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [result.equation as any],
  });
}

/**
 * DOCX inline content mapping for `@blocknote/math-block` that renders
 * inline math as native (editable) Word equations. Invalid LaTeX renders an
 * error placeholder (mirroring the editor):
 *
 * ```ts
 * import { inlineMathMapping } from "@blocknote/math-block/docx-exporter";
 *
 * new DOCXExporter(schema, {
 *   ...docxDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...docxDefaultSchemaMappings.inlineContentMapping,
 *     inlineMath: inlineMathMapping,
 *   },
 * });
 * ```
 */
export function inlineMathMapping(
  inlineContent: InlineMath,
  exporter: Exporter<any, any, any, any, any, any, any>,
) {
  const source = inlineContent.content;
  if (!source.trim()) {
    return new TextRun({ text: "" });
  }

  const result = latexToDocxEquation(source, true);
  if (result.error !== undefined) {
    return errorText(exporter, source, result.error);
  }

  return result.equation as any;
}
