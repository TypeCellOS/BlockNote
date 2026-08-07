import { AlignmentType, ImportedXmlComponent, Paragraph } from "docx";
import katex from "katex";
import { mml2omml } from "mathml2omml";

import { docxBlockMappingForDefaultSchema } from "../docx/defaultSchema/blocks.js";
import { docxInlineContentMappingForDefaultSchema } from "../docx/defaultSchema/inlinecontent.js";

// The math block's inline content as plain text (its LaTeX source). Local
// copy of `@blocknote/math-block`'s `getMathPlainTextContent` - importing the
// package would break headless (Node) exports, as its build carries a
// top-level CSS import.
// TODO: remove after plain text PR lands
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

// Converts LaTeX to a native Word equation (OMML): KaTeX renders the LaTeX
// to MathML, which is then converted to OMML. Throws on invalid LaTeX, so
// callers can fall back to the default source-code rendering.
const latexToEquation = (latex: string, inline: boolean) => {
  const katexOutput = katex.renderToString(latex, {
    displayMode: !inline,
    output: "mathml",
    throwOnError: true,
  });

  // KaTeX wraps the MathML in a `span`; the equation only needs the `math`
  // element itself.
  const mathML = katexOutput.match(/<math[\s\S]*<\/math>/)?.[0];
  if (!mathML) {
    throw new Error("No MathML found in KaTeX output");
  }

  // `fromXmlString` parses the XML *document*, returning a nameless wrapper
  // component around the `m:oMath` root element - unwrap it, or it would
  // serialize as an (invalid) `<undefined>` element.
  const imported = ImportedXmlComponent.fromXmlString(mml2omml(mathML)) as any;
  return imported.root[0] as ImportedXmlComponent;
};

/**
 * Block mapping for `@blocknote/math-block` that renders math blocks as
 * native (editable) Word equations instead of their LaTeX source:
 *
 * ```ts
 * new DOCXExporter(schema, {
 *   ...docxDefaultSchemaMappings,
 *   blockMapping: {
 *     ...docxDefaultSchemaMappings.blockMapping,
 *     math: mathBlockMapping,
 *   },
 * });
 * ```
 *
 * Requires `katex` (a dependency of `@blocknote/math-block`, so already
 * installed when using math blocks). Kept out of the default mappings so
 * exporting without math blocks doesn't load it. Invalid LaTeX falls back to
 * the default source code rendering.
 */
export const mathBlockMapping = (
  ...args: Parameters<typeof docxBlockMappingForDefaultSchema.math>
) => {
  const [block] = args;

  try {
    const source = getPlainTextContent(block.content);
    if (!source.trim()) {
      throw new Error("Empty math block");
    }

    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [latexToEquation(source, false) as any],
    });
  } catch {
    return docxBlockMappingForDefaultSchema.math(...args);
  }
};

/**
 * Inline content mapping for `@blocknote/math-block` that renders inline math
 * as native (editable) Word equations instead of its LaTeX source:
 *
 * ```ts
 * new DOCXExporter(schema, {
 *   ...docxDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...docxDefaultSchemaMappings.inlineContentMapping,
 *     inlineMath: inlineMathMapping,
 *   },
 * });
 * ```
 */
export const inlineMathMapping = (
  ...args: Parameters<
    typeof docxInlineContentMappingForDefaultSchema.inlineMath
  >
) => {
  const [inlineContent] = args;

  try {
    const source = getPlainTextContent(inlineContent.content);
    if (!source.trim()) {
      throw new Error("Empty inline math");
    }

    return latexToEquation(source, true) as any;
  } catch {
    return docxInlineContentMappingForDefaultSchema.inlineMath(...args);
  }
};
