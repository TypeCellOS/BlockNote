import type { RenderDiagram } from "./renderDiagramToImage.js";
import { renderToSizedSVG } from "./renderToSizedSVG.js";

/**
 * Renders the Mermaid source to an SVG {@link ExportImage} (with the
 * diagram's natural dimensions in pixels) - for exporters whose target can
 * embed vector SVG (e.g. Typst), keeping diagrams crisp at any zoom. The
 * output displays anywhere: like all BlockNote diagram rendering, labels
 * are SVG text (see `defaultMermaidOptions`), not browser-only `<foreignObject>`
 * HTML. Invalid sources are returned as a typed error. Browser-only -
 * Mermaid can't render outside of it.
 *
 * Pass `fontFamily` (a CSS font-family list) to declare labels in the
 * document's own font rather than Mermaid's default - applied by rewriting
 * the rendered SVG's font declarations, so it takes effect wherever the SVG
 * is consumed. For faithful output the family should be resolvable by the
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
    return { error: result.error };
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
