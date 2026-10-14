import mermaid, { type MermaidConfig } from "mermaid";

/**
 * The rendering options every BlockNote diagram render uses - applied once
 * through `initializeMermaid`, so the editor preview and the export
 * renderers all draw the same way.
 *
 * Labels render as SVG text instead of Mermaid's default HTML labels: HTML
 * labels live in `<foreignObject>` elements that only browsers display -
 * every other SVG consumer (Typst's renderer, resvg, Office viewers)
 * silently drops them, and exports would diverge from the preview. SVG text
 * keeps label wrapping, `<br/>` and markdown-string formatting; the one
 * thing it can't render is raw inline HTML in label text, which then shows
 * as literal tags - consistently, in the preview as well as in exports.
 *
 * (The cast: `MermaidConfig` doesn't declare `htmlLabels` for every diagram
 * type that honors it at runtime.)
 */
export const defaultMermaidOptions = {
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  class: { htmlLabels: false },
  state: { htmlLabels: false },
  er: { htmlLabels: false },
} as MermaidConfig;

// The diagrams are rendered manually whenever a block's source changes.
let initialized = false;

// Mermaid config is page-global: a consumer app that also uses Mermaid and
// calls `initialize` itself will overwrite these options (last write wins)
// - and with them, the SVG-label rendering the exporters rely on.
export const initializeMermaid = () => {
  if (!initialized) {
    initialized = true;
    mermaid.initialize({
      ...defaultMermaidOptions,
      startOnLoad: false,
      // On render errors, makes Mermaid throw right away - instead of
      // rendering its own error graphic AND leaving its temporary render
      // element behind in the document (it only cleans the element up with
      // this option set). The block renders its own error UI.
      suppressErrorRendering: true,
    });
  }
};
