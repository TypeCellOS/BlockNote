import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import {
  dataURLImageDelivery,
  ReactEmailImageDelivery,
} from "@blocknote/xl-email-exporter";
import { Img, Text } from "@react-email/components";

import {
  latexToMathSVG,
  RasterizeSVG,
  rasterizeSVGInBrowser,
} from "../exporterHelpers/renderMathToImage.js";

type MathBlock = BlockFromConfigNoChildren<
  BlockConfig<"math", {}, "plain">,
  any,
  any
>;

type InlineMath = { type: "inlineMath"; content: string };

export {
  latexToMathSVG,
  rasterizeSVGInBrowser,
} from "../exporterHelpers/renderMathToImage.js";
export type {
  RasterizeSVG,
  SVGExportImage,
} from "../exporterHelpers/renderMathToImage.js";
import { getMathExporterDictionary } from "../i18n/dictionary.js";

type MathImageOptions = {
  /**
   * Rasterizes the formula SVG to a raster image. Defaults to the built-in
   * canvas rasterizer in the browser; elsewhere (e.g. server-side email
   * rendering), the formula is embedded as an SVG instead - pass a
   * rasterizer (e.g. backed by `@resvg/resvg-js` or `sharp`) to get PNGs
   * there, which more email clients display.
   */
  rasterize?: RasterizeSVG;
  /**
   * How generated images get into the email: embedded as data URLs
   * (default), or e.g. as inline `cid:` attachments via
   * `createCIDImageDelivery` from `@blocknote/xl-email-exporter` - the most
   * widely supported option (Gmail and Outlook block data URLs).
   */
  imageDelivery?: ReactEmailImageDelivery;
};

// Emails render body text at 16px.
const FONT_SIZE_PIXELS = 16;

// Mirrors the editor, which shows the error state in the preview
// placeholder. The LaTeX source identifies which formula broke; the message
// comes from the typed error result, so it's safe to show. The text comes
// from the math dictionary (see ExporterOptions.dictionary).
function errorText(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
  message: string,
): string {
  return getMathExporterDictionary(exporter).invalid_formula(source, message);
}

/**
 * Creates an email block mapping for `@blocknote/math-block` that renders
 * math blocks as images, with the LaTeX source as the alt text. Invalid
 * LaTeX renders an error placeholder (mirroring the editor). See
 * {@link MathImageOptions} for how images are generated and delivered:
 *
 * ```ts
 * import { createMathBlockMapping } from "@blocknote/math-block/email-exporter";
 *
 * new ReactEmailExporter(schema, {
 *   ...reactEmailDefaultSchemaMappings,
 *   blockMapping: {
 *     ...reactEmailDefaultSchemaMappings.blockMapping,
 *     math: createMathBlockMapping({ imageDelivery }),
 *   },
 * });
 * ```
 */
export function createMathBlockMapping(options?: MathImageOptions) {
  return async (
    block: MathBlock,
    exporter: Exporter<any, any, any, any, any, any, any>,
  ) => {
    const source = plainContentToString(block.content);
    if (!source.trim()) {
      return <span />;
    }

    // Rasterized when possible (see `MathImageOptions.rasterize`), embedded
    // as SVG otherwise. Rasterization and delivery failures are unexpected
    // and propagate (failing the export) rather than being rendered to
    // readers.
    const rasterize =
      options?.rasterize ??
      (typeof document !== "undefined" ? rasterizeSVGInBrowser : undefined);

    const result = latexToMathSVG(source, {
      inline: false,
      fontSize: FONT_SIZE_PIXELS,
    });
    if (result.error !== undefined) {
      return (
        <Text style={{ color: "#999999", textAlign: "center" }}>
          {errorText(exporter, source, result.error)}
        </Text>
      );
    }

    const image = rasterize ? await rasterize(result.image) : result.image;
    const src = (options?.imageDelivery ?? dataURLImageDelivery).deliver({
      ...image,
      name: "math",
    });

    return (
      <Img
        src={src}
        alt={source}
        width={Math.ceil(image.width)}
        height={Math.ceil(image.height)}
        style={{ display: "block", margin: "0 auto" }}
      />
    );
  };
}

/**
 * Creates an email inline content mapping for `@blocknote/math-block` that
 * renders inline math as images flowing with the text, with the LaTeX
 * source as the alt text. Inline content renders synchronously, so the
 * formula is always embedded as an SVG (never rasterized) - email clients
 * that don't render SVG show the alt text. Invalid LaTeX renders an error
 * placeholder (mirroring the editor):
 *
 * ```ts
 * import { createInlineMathMapping } from "@blocknote/math-block/email-exporter";
 *
 * new ReactEmailExporter(schema, {
 *   ...reactEmailDefaultSchemaMappings,
 *   inlineContentMapping: {
 *     ...reactEmailDefaultSchemaMappings.inlineContentMapping,
 *     inlineMath: createInlineMathMapping({ imageDelivery }),
 *   },
 * });
 * ```
 */
export function createInlineMathMapping(
  options?: Pick<MathImageOptions, "imageDelivery">,
) {
  return (
    inlineContent: InlineMath,
    exporter: Exporter<any, any, any, any, any, any, any>,
  ) => {
    const source = inlineContent.content;
    if (!source.trim()) {
      return <span />;
    }

    const result = latexToMathSVG(source, {
      inline: true,
      fontSize: FONT_SIZE_PIXELS,
    });
    if (result.error !== undefined) {
      return (
        <span style={{ color: "#999999" }}>
          {errorText(exporter, source, result.error)}
        </span>
      );
    }

    const src = (options?.imageDelivery ?? dataURLImageDelivery).deliver({
      ...result.image,
      name: "math",
    });

    return (
      <Img
        src={src}
        alt={source}
        width={Math.ceil(result.image.width)}
        height={Math.ceil(result.image.height)}
        style={{ display: "inline", verticalAlign: "middle" }}
      />
    );
  };
}

/**
 * Email block mapping for `@blocknote/math-block` with the default options -
 * see {@link createMathBlockMapping}.
 */
export const mathBlockMapping = createMathBlockMapping();

/**
 * Email inline content mapping for `@blocknote/math-block` with the default
 * options - see {@link createInlineMathMapping}.
 */
export const inlineMathMapping = createInlineMathMapping();
