import { renderDiagram } from "./renderDiagram.js";
import { resolveSVGStyles } from "./resolveSVGStyles.js";

/**
 * The shared Pele step of the export renderers ({@link
 * renderDiagramToImage}, {@link renderDiagramToSVG}): validates the source,
 * renders it, and gives the SVG explicit pixel dimensions. Invalid sources
 * are expected (they're user input), so they're returned as a typed error -
 * with a message safe to show to readers - rather than thrown.
 *
 * Export consumers need explicit intrinsic dimensions. Pele's fixed-size
 * output already has them, without a browser DOM or responsive sizing styles.
 *
 * `scale` multiplies only the dimension *attributes* (the returned
 * `width`/`height` stay the natural size) - rasterizing consumers use it to
 * rasterize the vector at full canvas resolution. `fontFamily` is used for
 * measurement as well as rendering - see {@link renderDiagramToSVG}.
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
  const result = await renderDiagram(source, { fontFamily, responsive: false });
  if (result.error !== undefined) {
    return result;
  }
  const width = Math.ceil(result.width);
  const height = Math.ceil(result.height);

  return {
    // Only rewrite the root's dimension attributes, never node/label markup.
    svg: resolveSVGStyles(result.svg).replace(/^<svg\b[^>]*>/, (root) =>
      root
        .replace(/\bwidth="[^"]*"/, `width="${width * scale}"`)
        .replace(/\bheight="[^"]*"/, `height="${height * scale}"`),
    ),
    width,
    height,
  };
}
