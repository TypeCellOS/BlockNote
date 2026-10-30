import type { BlockNoteEditor } from "@blocknote/core";
import type { DiagramMathRenderer } from "./DiagramMathRenderer.js";
import type { MathRenderer } from "./MathRenderer.js";

/** No runtime import of a typesetter: the editor supplies this capability. */
export function getDiagramMathRenderer(
  editor: Pick<BlockNoteEditor, "getExtension">,
): DiagramMathRenderer | undefined {
  if (!editor.getExtension<MathRenderer>("math-render")) {
    return undefined;
  }
  return (source, { fontSize }) => {
    // Look up the current capability on each call, including after replacement.
    const result = editor
      .getExtension<MathRenderer>("math-render")
      ?.render(source, false);
    if (!result || result.error !== undefined) {
      // Pele preserves the original TeX when a resolver cannot typeset it.
      return null;
    }
    // MathML needs browser layout. Do not pretend it is a portable SVG
    // renderer in headless/server exports.
    if (typeof document === "undefined") {
      return null;
    }
    const container = document.createElement("span");
    try {
      const style = `font-size:${fontSize}px;line-height:normal;white-space:nowrap`;
      container.style.cssText = `${style};position:fixed;left:-10000px;visibility:hidden;display:inline-block`;
      container.innerHTML = result.htmlString;
      // Use only MathML: Safari mispositions KaTeX's HTML inside foreignObject
      // (WebKit bug 23113). Detach it from KaTeX's visually hidden wrapper.
      const math = container.querySelector("math");
      if (!math) {
        return null;
      }
      container.replaceChildren(math);
      // Pele needs dimensions before laying out nodes and edges. MathML must be
      // attached to measure it; keep this temporary layout out of the document.
      document.body.append(container);
      const { width, height } = math.getBoundingClientRect();
      return {
        format: "html",
        content: math.outerHTML,
        width,
        height,
      };
    } finally {
      container.remove();
    }
  };
}
