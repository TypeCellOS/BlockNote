import type { BlockFromConfig } from "@blocknote/core";
import katex from "katex";
import { getMathSource } from "../getMathSource.js";

/**
 * Renders a LaTeX source string to a bare `<math>` (MathML) element for use
 * outside the editor.
 *
 * @param source The LaTeX source to render.
 * @param displayMode Whether to render in display (block) or inline mode.
 */
export const katexToMathML = (source: string, displayMode: boolean) => {
  const mathml = katex.renderToString(source, {
    displayMode,
    output: "mathml",
    throwOnError: false,
  });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathml;

  // KaTeX wraps its MathML in a `<span class="katex">`; export the bare
  // `<math>` element as the top-level node.
  const math = wrapper.querySelector("math");

  return { dom: (math ?? wrapper.firstElementChild) as HTMLElement };
};

export const createMathML = (block: BlockFromConfig<any, any, any>) =>
  katexToMathML(getMathSource(block), true);
