import type { ExportImage } from "@blocknote/core";

import { renderToSizedSVG } from "./renderToSizedSVG.js";
import { DEFAULT_DIAGRAM_FONT_FAMILY } from "./svgFontFamily.js";

/**
 * Renders Mermaid source to an {@link ExportImage} (with the diagram's
 * natural dimensions in pixels). Invalid sources are expected (they're user
 * input), so they're returned as a typed error - with a message safe to show
 * to readers - rather than thrown; unexpected failures (environment,
 * renderer infrastructure) throw. The default implementations
 * ({@link renderDiagramToImage}, {@link renderDiagramToSVG}) need a browser
 * - Mermaid can't render outside of it; exporters running elsewhere plug in
 * their own (e.g. backed by `@mermaid-js/mermaid-cli` or a Kroki server).
 */
export type RenderDiagram = (
  source: string,
) => Promise<{ error?: undefined; image: ExportImage } | { error: string }>;

// Wrap the renderer to trade sharpness for size:
// `(source) => renderDiagramToImage(source, 4)`.
const DEFAULT_RASTER_SCALE = 2;

/**
 * Renders the Mermaid source to a PNG {@link ExportImage} (with the
 * diagram's natural dimensions in pixels), rasterized at `scale` times that
 * size so it stays sharp in the exported document - e.g. to embed diagrams
 * as images when exporting documents to PDF/DOCX/ODT. Labels rasterize in
 * `fontFamily` (resolved by the browser, so the family should be loaded in
 * the page) - by default BlockNote's UI font, so exported diagrams match
 * the surrounding document rather than standing out in Mermaid's own font.
 * Invalid sources are returned as a typed error. Browser-only - Mermaid
 * can't render outside of it.
 */
export async function renderDiagramToImage(
  source: string,
  scale: number = DEFAULT_RASTER_SCALE,
  fontFamily: string = DEFAULT_DIAGRAM_FONT_FAMILY,
): ReturnType<RenderDiagram> {
  // The explicit dimensions must be on the SVG itself, not the `Image`
  // element below: the element's width/height only affect layout, while
  // canvas rasterization uses the SVG's intrinsic size - without one, Safari
  // falls back to a default size (and older Firefox refuses to draw the
  // image to a canvas at all). WebKit also honors a leftover `max-width`
  // style during canvas rasterization - rendering the diagram letterboxed at
  // a fraction of the canvas - so the stripped style matters here too. The
  // scale goes into the SVG's dimensions (rather than only the canvas), so
  // browsers rasterize the vector at the full canvas resolution instead of
  // upscaling a 1x raster.
  const result = await renderToSizedSVG(source, { scale, fontFamily });
  if (result.error !== undefined) {
    return { error: result.error };
  }
  const { svg, width, height } = result;

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) {
    throw new Error("Canvas produced no PNG data");
  }

  return {
    image: {
      mimeType: "image/png",
      data: new Uint8Array(await blob.arrayBuffer()),
      width,
      height,
    },
  };
}
