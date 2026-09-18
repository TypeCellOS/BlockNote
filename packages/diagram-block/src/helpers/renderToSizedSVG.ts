import mermaid from "mermaid";

import { initializeMermaid } from "./initializeMermaid.js";
import { setSVGFontFamily } from "./svgFontFamily.js";

// Each render call needs its own element ID (Mermaid removes any existing
// document element with the given ID when rendering).
let exportElementId = 0;

/**
 * The shared Mermaid step of the export renderers ({@link
 * renderDiagramToImage}, {@link renderDiagramToSVG}): validates the source,
 * renders it, and gives the SVG explicit pixel dimensions. Invalid sources
 * are expected (they're user input), so they're returned as a typed error -
 * with a message safe to show to readers - rather than thrown.
 *
 * Mermaid sizes the SVG relatively (`width: 100%`, plus an inline
 * `max-width` style for responsive display in the editor), while export
 * consumers - canvas rasterization and SVG renderers alike - need explicit
 * intrinsic dimensions. Those are set from the view box (the only reliable
 * source for the diagram's pixel size), and the style is stripped since CSS
 * wins over presentation attributes when computing the intrinsic size.
 *
 * `scale` multiplies only the dimension *attributes* (the returned
 * `width`/`height` stay the natural size) - rasterizing consumers use it to
 * rasterize the vector at full canvas resolution. `fontFamily` replaces the
 * font in the rendered output - see {@link renderDiagramToSVG}.
 */
export async function renderToSizedSVG(
  source: string,
  {
    scale = 1,
    fontFamily,
  }: {
    scale?: number;
    fontFamily?: string;
  } = {},
): Promise<
  | { error?: undefined; svg: string; width: number; height: number }
  | { error: string }
> {
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

  const svgElement = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  const viewBox = svgElement.getAttribute("viewBox")?.split(/\s+/).map(Number);
  const width = Math.ceil(viewBox?.[2] || 800);
  const height = Math.ceil(viewBox?.[3] || 600);
  svgElement.setAttribute("width", String(width * scale));
  svgElement.setAttribute("height", String(height * scale));
  svgElement.removeAttribute("style");

  if (fontFamily) {
    setSVGFontFamily(svgElement, fontFamily);
  }

  return {
    svg: new XMLSerializer().serializeToString(svgElement),
    width,
    height,
  };
}
