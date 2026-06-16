import type { CodeBlockPreview } from "@blocknote/core";
import temml from "temml";
// Renders the preview's MathML using local/system math fonts plus Temml's small
// bundled symbol font - no large external font download required.
import "temml/dist/Temml-Local.css";
import { getMathSource } from "../getMathSource.js";

/**
 * Renders a preview of the block's LaTeX content as MathML using Temml, which
 * the browser then displays natively.
 *
 * This is only responsible for the preview itself - the
 * `createPreviewWithSourcePopup` render decides when & where it's shown.
 */
export const createMathPreview: CodeBlockPreview = (block) => {
  const dom = document.createElement("div");
  dom.className = "bn-latex-preview";

  // `renderToString` + `innerHTML` rather than `temml.render` so it also works
  // when serializing server-side (and in tests), where MathML elements don't
  // support the DOM style manipulation `temml.render` relies on.
  dom.innerHTML = temml.renderToString(getMathSource(block), {
    // Renders invalid LaTeX as an error message instead of throwing, so the
    // preview updates gracefully while the user is still typing.
    throwOnError: false,
    displayMode: true,
  });

  return { dom };
};
