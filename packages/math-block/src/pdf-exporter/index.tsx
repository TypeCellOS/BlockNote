import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { exportImageToDataURL, plainContentToString } from "@blocknote/core";
import { Math } from "@react-pdf/math";
import { Image, Text, View } from "@react-pdf/renderer";

import {
  latexToMathSVG,
  RasterizeSVG,
  rasterizeSVGInBrowser,
} from "../exporterHelpers/renderMathToImage.js";
import { getMathExporterDictionary } from "../i18n/dictionary.js";

type MathBlock = BlockFromConfigNoChildren<
  BlockConfig<"mathBlock", {}, "plain">,
  any,
  any
>;

type InlineMath = { type: "math"; content: string };

export {
  latexToMathSVG,
  rasterizeSVGInBrowser,
} from "../exporterHelpers/renderMathToImage.js";
export type {
  RasterizeSVG,
  SVGExportImage,
} from "../exporterHelpers/renderMathToImage.js";

// The PDF exporter's body text is 12pt (16px at 0.75 pixels per point).
const FONT_SIZE_POINTS = 16 * 0.75;

// Mirrors the editor, which shows the error state in the preview
// placeholder, identifying the formula by its source. The parser's message
// is deliberately NOT rendered: it's authoring detail (and untranslated
// English) - the editor is where the author sees and fixes it.
function errorText(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
  key: string,
) {
  return (
    <Text key={key} style={{ color: "#999999" }}>
      {getMathExporterDictionary(exporter).invalid_formula(source)}
    </Text>
  );
}

/**
 * PDF block mapping for `@blocknote/math-block` that renders math blocks as
 * actual formulas (via `@react-pdf/math`, which converts the LaTeX to SVG
 * paths with MathJax). Invalid LaTeX renders an error placeholder
 * (mirroring the editor):
 *
 * ```ts
 * import { mathBlockMapping } from "@blocknote/math-block/pdf-exporter";
 *
 * new PDFExporter(schema, {
 *   ...pdfDefaultSchemaMappings,
 *   blockMapping: {
 *     ...pdfDefaultSchemaMappings.blockMapping,
 *     mathBlock: mathBlockMapping,
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
    return <View key={"math"} />;
  }

  // `Math` renders MathJax's own error output for invalid LaTeX; validate
  // up front to render the editor-style error placeholder instead.
  const validation = latexToMathSVG(source, {
    inline: false,
    fontSize: FONT_SIZE_POINTS,
  });
  if (validation.error !== undefined) {
    return (
      <View key={"math"} style={{ alignItems: "center" }}>
        {errorText(exporter, source, "math-error")}
      </View>
    );
  }

  return (
    <View key={"math"} style={{ alignItems: "center" }}>
      <Math>{source}</Math>
    </View>
  );
}

/**
 * Creates a PDF inline content mapping for `@blocknote/math-block` that
 * renders inline math as formulas, rasterized to images that flow inline
 * with the text (react-pdf drops SVG elements inside `Text`, so the vector
 * output used for math blocks isn't an option here). Note that the image
 * sits on the text baseline, so expressions with depth (fractions,
 * subscripts) render slightly raised - and it's sized for the exporter's
 * 12pt body text (mappings get no font context from react-pdf), so inline
 * math inside headings renders at body-text size.
 *
 * Rasterization runs in the browser by default; when exporting elsewhere
 * (e.g. server-side), pass a `rasterize` function backed by an SVG
 * rasterizer such as `@resvg/resvg-js` or `sharp`. Invalid LaTeX renders an
 * error placeholder (mirroring the editor):
 *
 * ```ts
 * import { createInlineMathMapping } from "@blocknote/math-block/pdf-exporter";
 *
 * new PDFExporter(schema, {
 *   ...pdfDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...pdfDefaultSchemaMappings.inlineContentMapping,
 *     math: createInlineMathMapping({ rasterize }),
 *   },
 * });
 * ```
 */
export function createInlineMathMapping(options?: {
  rasterize?: RasterizeSVG;
}) {
  return (
    inlineContent: InlineMath,
    exporter: Exporter<any, any, any, any, any, any, any>,
  ) => {
    const source = inlineContent.content;
    if (!source.trim()) {
      return <Text key={"inlineMath"} />;
    }

    const rasterize = options?.rasterize ?? rasterizeSVGInBrowser;
    if (!options?.rasterize && typeof document === "undefined") {
      throw new Error(
        "Rendering inline math requires rasterizing SVGs, which the built-in rasterizer can only do in the browser. When exporting elsewhere, pass a `rasterize` function to `createInlineMathMapping` (e.g. backed by @resvg/resvg-js or sharp).",
      );
    }

    // The metrics are needed synchronously for react-pdf's text layout; only
    // the rasterization itself is deferred, via react-pdf's support for
    // async `src` functions (resolved before layout). Rasterization failures
    // are unexpected and propagate - react-pdf skips the image and warns.
    const result = latexToMathSVG(source, {
      inline: true,
      fontSize: FONT_SIZE_POINTS,
    });
    if (result.error !== undefined) {
      return errorText(exporter, source, "inlineMath");
    }

    return (
      <Image
        key={"inlineMath"}
        src={() => rasterize(result.image).then(exportImageToDataURL)}
        style={{ width: result.image.width, height: result.image.height }}
      />
    );
  };
}

/**
 * PDF inline content mapping for `@blocknote/math-block` with the default
 * options - see {@link createInlineMathMapping}. Browser-only; when
 * exporting elsewhere, use the factory to pass a `rasterize` function.
 */
export const inlineMathMapping = createInlineMathMapping();
