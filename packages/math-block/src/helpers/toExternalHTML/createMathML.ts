import type { BlockFromConfig } from "@blocknote/core";
import temml from "temml";
import { getMathSource } from "../getMathSource.js";

export const createMathML = (block: BlockFromConfig<any, any, any>) => {
  // Convert the LaTeX source to a MathML `<math>` element, annotating it with
  // the original TeX so it round-trips losslessly back to LaTeX.
  const mathml = temml.renderToString(getMathSource(block), {
    displayMode: true,
    annotate: true,
    // Export gracefully renders invalid LaTeX rather than throwing.
    throwOnError: false,
  });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathml;

  return { dom: wrapper.firstElementChild as HTMLElement };
};
