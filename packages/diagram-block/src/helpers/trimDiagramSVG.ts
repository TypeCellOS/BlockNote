/**
 * Trims excess vertical whitespace from a rendered Mermaid SVG. Some diagram
 * types (e.g. `journey`) reserve far more vertical space than their content
 * actually uses, leaving a large empty gap below the diagram. This measures
 * the real content bounds and shrinks the SVG's `viewBox` to fit.
 *
 * Only the bottom is trimmed - the horizontal extent and top edge are left
 * untouched, so nothing (arrowhead markers, titles) can get clipped. Browser-
 * only, since measuring requires the SVG to be laid out in the document.
 */
export const trimDiagramSVG = (svg: string): string => {
  // Measured offscreen - the SVG must be in the document for `getBBox`, but it
  // shouldn't flash on screen while measuring.
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.innerHTML = svg;

  const svgElement = container.querySelector("svg");
  const viewBox = svgElement?.getAttribute("viewBox")?.split(/\s+/).map(Number);
  if (!svgElement || viewBox?.length !== 4 || viewBox.some(isNaN)) {
    return svg;
  }

  document.body.appendChild(container);
  try {
    const [vbX, vbY, vbWidth, vbHeight] = viewBox;
    const bbox = svgElement.getBBox();
    const contentBottom = bbox.y + bbox.height;
    // A little padding so the content doesn't sit flush against the edge.
    const trimmedHeight = contentBottom - vbY + 8;

    let changed = false;
    if (trimmedHeight < vbHeight) {
      svgElement.setAttribute(
        "viewBox",
        `${vbX} ${vbY} ${vbWidth} ${trimmedHeight}`,
      );
      changed = true;
    }

    // Mermaid renders most diagrams responsively (width `100%`, height derived
    // from the view box's aspect ratio), but pins an explicit pixel height on
    // `journey` diagrams. That fixed height makes the SVG letterbox - it stays
    // that many pixels tall even when scaled down to fit a narrower container,
    // leaving empty space below. Dropping it lets the height follow the view
    // box, so the box always hugs the content.
    if (svgElement.hasAttribute("height")) {
      svgElement.removeAttribute("height");
      changed = true;
    }

    return changed ? svgElement.outerHTML : svg;
  } finally {
    document.body.removeChild(container);
  }
};
