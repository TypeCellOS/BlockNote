import type { RenderDiagram } from "./renderDiagramToImage.js";
import { renderToSizedSVG } from "./renderToSizedSVG.js";

/**
 * Renders the Mermaid source to an SVG {@link ExportImage} (with the
 * diagram's natural dimensions in pixels) - for exporters whose target can
 * embed vector SVG (e.g. Typst), keeping diagrams crisp at any zoom. The
 * output displays anywhere: Pele renders labels as SVG text, not browser-only
 * `<foreignObject>` HTML. Invalid sources are returned as a typed error.
 * Works in browsers and on the server.
 *
 * Pass `fontFamily` (a CSS font-family list) to declare labels in the
 * document's own font, used for both label measurement and SVG output.
 * For faithful output the family should be resolvable by the
 * SVG consumer - e.g. the same family the exporter's fonts are declared
 * under.
 */
export async function renderDiagramToSVG(
  source: string,
  options?: { fontFamily?: string },
): ReturnType<RenderDiagram> {
  const result = await renderToSizedSVG(source, {
    fontFamily: options?.fontFamily,
  });
  if (result.error !== undefined) {
    return result;
  }

  return {
    image: {
      mimeType: "image/svg+xml",
      data: new TextEncoder().encode(result.svg),
      width: result.width,
      height: result.height,
    },
  };
}
