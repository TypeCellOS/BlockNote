import type { ExportImage } from "@blocknote/core";
import mermaid from "mermaid";

import { initializeMermaid } from "./initializeMermaid.js";

/**
 * Renders Mermaid source to an {@link ExportImage} (with the diagram's
 * natural dimensions in pixels). Invalid sources are expected (they're user
 * input), so they're returned as a typed error - with a message safe to show
 * to readers - rather than thrown; unexpected failures (environment,
 * renderer infrastructure) throw. The default implementation
 * ({@link renderDiagramToImage}) needs a browser - Mermaid can't render
 * outside of it; exporters running elsewhere plug in their own (e.g. backed
 * by `@mermaid-js/mermaid-cli` or a Kroki server).
 */
export type RenderDiagram = (
  source: string,
) => Promise<{ error?: undefined; image: ExportImage } | { error: string }>;

// Each render call needs its own element ID (Mermaid removes any existing
// document element with the given ID when rendering).
let exportElementId = 0;

// Wrap the renderer to trade sharpness for size:
// `(source) => renderDiagramToImage(source, 4)`.
const DEFAULT_RASTER_SCALE = 2;

/**
 * Renders the Mermaid source to a PNG {@link ExportImage} (with the
 * diagram's natural dimensions in pixels), rasterized at `scale` times that
 * size so it stays sharp in the exported document - e.g. to embed diagrams
 * as images when exporting documents to PDF/DOCX/ODT. Invalid sources are
 * returned as a typed error. Browser-only - Mermaid can't render outside of
 * it.
 */
export async function renderDiagramToImage(
  source: string,
  scale: number = DEFAULT_RASTER_SCALE,
): ReturnType<RenderDiagram> {
  initializeMermaid();

  try {
    await mermaid.parse(source);
  } catch (error) {
    // The boundary that converts Mermaid's parse throw into the typed
    // result.
    return { error: error instanceof Error ? error.message : String(error) };
  }

  const { svg } = await mermaid.render(
    `diagram-export-${exportElementId++}`,
    source,
  );

  // Mermaid sizes the SVG relatively (`width: 100%`), so it needs explicit
  // pixel dimensions before rasterizing. These must be set on the SVG itself,
  // not the `Image` element: the element's width/height only affect layout,
  // while canvas rasterization uses the SVG's intrinsic size - without one,
  // Safari falls back to a default size (and older Firefox refuses to draw
  // the image to a canvas at all). The view box is also the only reliable
  // source for the diagram's pixel dimensions, which the exporters need for
  // layout.
  const svgElement = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  const viewBox = svgElement.getAttribute("viewBox")?.split(/\s+/).map(Number);
  const width = Math.ceil(viewBox?.[2] || 800);
  const height = Math.ceil(viewBox?.[3] || 600);
  // The scale goes into the SVG's dimensions (rather than only the canvas),
  // so browsers rasterize the vector at the full canvas resolution instead
  // of upscaling a 1x raster.
  svgElement.setAttribute("width", String(width * scale));
  svgElement.setAttribute("height", String(height * scale));
  // Mermaid also caps the root with an inline `max-width` style (for
  // responsive display in the editor). CSS wins over presentation attributes
  // when computing the SVG's intrinsic size, and WebKit honors it during
  // canvas rasterization - leaving it in renders the diagram letterboxed at
  // a fraction of the canvas. The explicit dimensions above are the ones
  // that must be authoritative here.
  svgElement.removeAttribute("style");
  const sizedSVG = new XMLSerializer().serializeToString(svgElement);

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sizedSVG)}`;
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
