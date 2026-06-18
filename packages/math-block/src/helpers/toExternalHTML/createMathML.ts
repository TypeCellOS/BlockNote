import type { BlockFromConfig } from "@blocknote/core";
import katex from "katex";
import { getMathSource } from "../getMathSource.js";

export const createMathML = (block: BlockFromConfig<any, any, any>) => {
  const mathml = katex.renderToString(getMathSource(block), {
    displayMode: true,
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
