import type { BlockConfig, BlockFromConfigNoChildren } from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import { ODTExporter } from "@blocknote/xl-odt-exporter";
import { createElement } from "react";

import { latexToMathML } from "../exporterHelpers/latexToMathML.js";

// The ODT elements are created with `createElement` string tags rather than
// JSX: the ODT exporter's namespaced tags (`text:p`, `draw:frame`, ...) need
// JSX runtime module augmentation plus a transform that allows namespaces,
// neither of which this package sets up for its React sources.

type MathBlock = BlockFromConfigNoChildren<
  BlockConfig<"math", {}, "plain">,
  any,
  any
>;

type InlineMath = { type: "inlineMath"; content: string };

// A formula object, anchored as a character so it can sit inline among text.
// The MathML goes into an object sub-document (rather than inline into the
// frame) and the frame gets no explicit size, with a graphic style derived
// from the built-in "Formula" style - this exact combination makes
// LibreOffice load the formula as a real formula object and compute its
// natural size (sized frames get the formula scaled-to-fit instead, and
// inline MathML renders at zero size).
function formulaFrame(exporter: ODTExporter<any, any, any>, mathML: string) {
  const objectPath = exporter.registerObject(
    '<?xml version="1.0" encoding="UTF-8"?>\n' + mathML,
  );
  const styleName = exporter.registerStyle((name) =>
    createElement(
      "style:style",
      {
        "style:family": "graphic",
        "style:name": name,
        "style:parent-style-name": "Formula",
      },
      createElement("style:graphic-properties", {
        "style:vertical-pos": "middle",
        "style:vertical-rel": "text",
      }),
    ),
  );

  return createElement(
    "draw:frame",
    { "draw:style-name": styleName, "text:anchor-type": "as-char" },
    createElement("draw:object", {
      "xlink:href": objectPath,
      "xlink:type": "simple",
      "xlink:show": "embed",
      "xlink:actuate": "onLoad",
    }),
  );
}

// Mirrors the editor, which shows the error state in the preview
// placeholder. The LaTeX source identifies which formula broke; the message
// comes from the typed error result, so it's safe to show. Styled muted like
// the other exporters' placeholders.
function errorText(
  source: string,
  message: string,
  exporter: ODTExporter<any, any, any>,
) {
  const styleName = exporter.registerStyle((name) =>
    createElement(
      "style:style",
      { "style:family": "text", "style:name": name },
      createElement("style:text-properties", {
        "fo:font-style": "italic",
        "fo:color": "#999999",
      }),
    ),
  );

  return createElement(
    "text:span",
    { "text:style-name": styleName },
    `Invalid formula "${source}": ${message}`,
  );
}

/**
 * ODT block mapping for `@blocknote/math-block` that renders math blocks as
 * native (editable) formula objects. Invalid LaTeX renders an error
 * placeholder (mirroring the editor):
 *
 * ```ts
 * import { mathBlockMapping } from "@blocknote/math-block/odt-exporter";
 *
 * new ODTExporter(schema, {
 *   ...odtDefaultSchemaMappings,
 *   blockMapping: {
 *     ...odtDefaultSchemaMappings.blockMapping,
 *     math: mathBlockMapping,
 *   },
 * });
 * ```
 */
export function mathBlockMapping(
  block: MathBlock,
  exporter: ODTExporter<any, any, any>,
) {
  const source = plainContentToString(block.content);
  if (!source.trim()) {
    return createElement("text:p");
  }

  const mathML = latexToMathML(source, false);
  if (mathML.error !== undefined) {
    return createElement(
      "text:p",
      null,
      errorText(source, mathML.error, exporter),
    );
  }

  const styleName = exporter.registerStyle((name) =>
    createElement(
      "style:style",
      {
        "style:family": "paragraph",
        "style:name": name,
        "style:parent-style-name": "Standard",
      },
      createElement("style:paragraph-properties", {
        "fo:text-align": "center",
      }),
    ),
  );

  return createElement(
    "text:p",
    { "text:style-name": styleName },
    formulaFrame(exporter, mathML.mathML),
  );
}

/**
 * ODT inline content mapping for `@blocknote/math-block` that renders inline
 * math as native (editable) formula objects. Invalid LaTeX renders an error
 * placeholder (mirroring the editor):
 *
 * ```ts
 * import { inlineMathMapping } from "@blocknote/math-block/odt-exporter";
 *
 * new ODTExporter(schema, {
 *   ...odtDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...odtDefaultSchemaMappings.inlineContentMapping,
 *     inlineMath: inlineMathMapping,
 *   },
 * });
 * ```
 */
export function inlineMathMapping(
  inlineContent: InlineMath,
  exporter: ODTExporter<any, any, any>,
) {
  const source = inlineContent.content;
  if (!source.trim()) {
    return createElement("text:span");
  }

  const mathML = latexToMathML(source, true);
  if (mathML.error !== undefined) {
    return errorText(source, mathML.error, exporter);
  }

  return formulaFrame(exporter, mathML.mathML);
}
