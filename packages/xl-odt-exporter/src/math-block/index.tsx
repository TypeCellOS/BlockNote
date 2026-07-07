import katex from "katex";

import { odtBlockMappingForDefaultSchema } from "../odt/defaultSchema/blocks.js";
import { odtInlineContentMappingForDefaultSchema } from "../odt/defaultSchema/inlineContent.js";
import { ODTExporter } from "../odt/odtExporter.js";

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

// Converts LaTeX to MathML (via KaTeX), which ODT embeds natively as formula
// objects. Throws on invalid LaTeX, so callers can fall back to the default
// source-code rendering.
const latexToMathML = (latex: string, inline: boolean): string => {
  const katexOutput = katex.renderToString(latex, {
    displayMode: !inline,
    output: "mathml",
    throwOnError: true,
  });

  // KaTeX wraps the MathML in a `span`; the formula object only needs the
  // `math` element itself.
  const mathML = katexOutput.match(/<math[\s\S]*<\/math>/)?.[0];
  if (!mathML) {
    throw new Error("No MathML found in KaTeX output");
  }

  return mathML;
};

// A formula object, anchored as a character so it can sit inline among text.
// The MathML goes into an object sub-document (rather than inline into the
// frame) and the frame gets no explicit size, with a graphic style derived
// from the built-in "Formula" style - this exact combination makes
// LibreOffice load the formula as a real formula object and compute its
// natural size (sized frames get the formula scaled-to-fit instead, and
// inline MathML renders at zero size).
const formulaFrame = (
  exporter: ODTExporter<any, any, any>,
  mathML: string,
) => {
  const objectPath = exporter.registerObject(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + mathML,
  );
  const styleName = exporter.registerStyle((name) => (
    <style:style
      style:family="graphic"
      style:name={name}
      style:parent-style-name="Formula"
    >
      <style:graphic-properties
        style:vertical-pos="middle"
        style:vertical-rel="text"
      />
    </style:style>
  ));

  return (
    <draw:frame draw:style-name={styleName} text:anchor-type="as-char">
      <draw:object
        xlink:href={objectPath}
        xlink:type="simple"
        xlink:show="embed"
        xlink:actuate="onLoad"
      />
    </draw:frame>
  );
};

/**
 * Block mapping for `@blocknote/math-block` that renders math blocks as
 * native (editable) formula objects instead of their LaTeX source:
 *
 * ```ts
 * new ODTExporter(schema, {
 *   ...odtDefaultSchemaMappings,
 *   blockMapping: {
 *     ...odtDefaultSchemaMappings.blockMapping,
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
  ...args: Parameters<typeof odtBlockMappingForDefaultSchema.math>
) => {
  const [block, exporter] = args;

  try {
    const source = getPlainTextContent(block.content);
    if (!source.trim()) {
      throw new Error("Empty math block");
    }

    const odtExporter = exporter as ODTExporter<any, any, any>;
    const mathML = latexToMathML(source, false);

    const styleName = odtExporter.registerStyle((name) => (
      <style:style
        style:family="paragraph"
        style:name={name}
        style:parent-style-name="Standard"
      >
        <style:paragraph-properties fo:text-align="center" />
      </style:style>
    ));

    return (
      <text:p text:style-name={styleName}>
        {formulaFrame(odtExporter, mathML)}
      </text:p>
    );
  } catch {
    return odtBlockMappingForDefaultSchema.math(...args);
  }
};

/**
 * Inline content mapping for `@blocknote/math-block` that renders inline math
 * as native (editable) formula objects instead of its LaTeX source:
 *
 * ```ts
 * new ODTExporter(schema, {
 *   ...odtDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...odtDefaultSchemaMappings.inlineContentMapping,
 *     inlineMath: inlineMathMapping,
 *   },
 * });
 * ```
 */
export const inlineMathMapping = (
  ...args: Parameters<typeof odtInlineContentMappingForDefaultSchema.inlineMath>
) => {
  const [inlineContent, exporter] = args;

  try {
    const source = getPlainTextContent(inlineContent.content);
    if (!source.trim()) {
      throw new Error("Empty inline math");
    }

    return formulaFrame(
      exporter as ODTExporter<any, any, any>,
      latexToMathML(source, true),
    );
  } catch {
    return odtInlineContentMappingForDefaultSchema.inlineMath(...args);
  }
};
