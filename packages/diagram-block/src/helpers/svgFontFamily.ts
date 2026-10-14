/**
 * The font diagrams render in when nothing more specific is known -
 * BlockNote's default UI font, so diagrams match the surrounding document
 * out of the box. Consumers with a themed font get it applied where the
 * actual font is discoverable (the editor preview reads the editor's
 * computed style; exporters pass their document font).
 */
export const DEFAULT_DIAGRAM_FONT_FAMILY = '"Inter", sans-serif';

/**
 * Points every font declaration in a rendered Mermaid SVG at the given CSS
 * font-family list. Mermaid bakes its own font stack ("trebuchet ms", ...)
 * into the SVG's `<style>` block (and some diagram types set font-family
 * attributes directly); rewriting the rendered output is the way to restyle
 * it - Mermaid's config is page-global and `mermaid.render` takes no
 * options. Label metrics were measured with Mermaid's font, which the swap
 * tolerates: labels are anchor-centered in padded boxes.
 */
export function setSVGFontFamily(
  svgElement: Element,
  fontFamily: string,
): void {
  for (const styleElement of svgElement.querySelectorAll("style")) {
    styleElement.textContent =
      styleElement.textContent?.replace(
        /font-family:[^;}]*/g,
        // A replacer function, because as a replacement *string* `$`-patterns
        // are special to String.replace (`$&` splices in the matched text) -
        // and `fontFamily` is external input (theme / exporter config) that
        // may legally contain them. A function's return value is inserted
        // verbatim.
        () => `font-family:${fontFamily}`,
      ) ?? null;
  }
  for (const element of svgElement.querySelectorAll("[font-family]")) {
    element.setAttribute("font-family", fontFamily);
  }
}

/** String-in/string-out {@link setSVGFontFamily}. */
export function withSVGFontFamily(svg: string, fontFamily: string): string {
  const svgElement = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  setSVGFontFamily(svgElement, fontFamily);
  return new XMLSerializer().serializeToString(svgElement);
}
