import type { ExportImage } from "@blocknote/core";

import { renderToSizedSVG } from "./renderToSizedSVG.js";

/**
 * Renders Mermaid source to an {@link ExportImage} (with the diagram's
 * natural dimensions in pixels). Invalid sources are expected (they're user
 * input), so they're returned as a typed error - with a message safe to show
 * to readers - rather than thrown; unexpected failures (environment,
 * renderer infrastructure) throw. PNG rasterization needs a browser;
 * {@link renderDiagramToSVG} also works on the server using Pele.
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
 * the surrounding document. Invalid sources are returned as a typed error.
 * Browser-only because rasterization uses Image and canvas.
 */
export async function renderDiagramToImage(
  source: string,
  scale: number = DEFAULT_RASTER_SCALE,
  fontFamily?: string,
): ReturnType<RenderDiagram> {
  // The explicit dimensions must be on the SVG itself, not the `Image`
  // element below: the element's width/height only affect layout, while
  // canvas rasterization uses the SVG's intrinsic size - without one, Safari
  // falls back to a default size (and older Firefox refuses to draw the
  // image to a canvas at all). Pele's fixed-size output also avoids responsive
  // max-width styles that can letterbox the image in WebKit. The scale goes
  // into the SVG's dimensions (rather than only the canvas), so
  // browsers rasterize the vector at the full canvas resolution instead of
  // upscaling a 1x raster.
  const result = await renderToSizedSVG(source, { scale, fontFamily });
  if (result.error !== undefined) {
    return result;
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
