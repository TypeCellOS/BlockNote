import type { CodeBlockRenderPreview } from "@blocknote/core";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders a preview of a LaTeX code block using KaTeX.
 *
 * This is only responsible for the preview itself - the code block's `render`
 * function decides when & where the preview is shown.
 */
export const renderLaTeXPreview: CodeBlockRenderPreview = (block) => {
  const dom = document.createElement("div");
  dom.className = "bn-latex-preview";

  // The LaTeX source is the block's plain text content.
  const source = Array.isArray(block.content)
    ? block.content.map((node) => ("text" in node ? node.text : "")).join("")
    : "";

  katex.render(source, dom, {
    // Renders invalid LaTeX as an error message instead of throwing, so the
    // preview updates gracefully while the user is still typing.
    throwOnError: false,
    displayMode: true,
  });

  return { dom };
};
