import mermaid from "mermaid";

import { initializeMermaid } from "./initializeMermaid.js";

// Each render call needs its own element ID (Mermaid removes any existing
// document element with the given ID when rendering).
let exportElementId = 0;

/**
 * Renders the Mermaid source to a PNG image (as a data URL, with the
 * diagram's natural dimensions in pixels), e.g. to embed diagrams as images
 * when exporting documents to PDF/DOCX/ODT. Throws when the source is
 * invalid. Browser-only - Mermaid can't render outside of it.
 */
export const renderDiagramToImage = async (
  source: string,
): Promise<{ dataURL: string; width: number; height: number }> => {
  initializeMermaid();

  await mermaid.parse(source);
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
  // Sized at 2x so the diagram stays sharp in the exported document. The 2x
  // goes into the SVG's dimensions (rather than only the canvas), so browsers
  // rasterize the vector at the full canvas resolution instead of upscaling a
  // 1x raster.
  svgElement.setAttribute("width", String(width * 2));
  svgElement.setAttribute("height", String(height * 2));
  const sizedSVG = new XMLSerializer().serializeToString(svgElement);

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sizedSVG)}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);

  return { dataURL: canvas.toDataURL("image/png"), width, height };
};
