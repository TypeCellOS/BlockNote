import { ReactCustomBlockRenderProps } from "@blocknote/react";
import katex from "katex";
import { createElement } from "react";
import type { MathBlockConfig } from "../../block.js";
import { getMathSource } from "../getMathSource.js";

/**
 * Renders the block's LaTeX source as MathML for external HTML export. The
 * React equivalent of `createMathML`.
 */
export const MathML = (props: ReactCustomBlockRenderProps<MathBlockConfig>) => {
  const mathml = katex.renderToString(getMathSource(props.block), {
    displayMode: true,
    output: "mathml",
    throwOnError: false,
  });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathml;

  // KaTeX wraps its MathML in a `<span class="katex">`; export the bare
  // `<math>` element as the top-level node.
  const el = (wrapper.querySelector("math") ??
    wrapper.firstElementChild) as HTMLElement | null;

  if (!el) {
    return null;
  }

  const attributes = Object.fromEntries(
    Array.from(el.attributes).map((attr) => [
      // React expects `className` rather than the `class` DOM attribute.
      attr.name === "class" ? "className" : attr.name,
      attr.value,
    ]),
  );

  return createElement(el.tagName.toLowerCase(), {
    ...attributes,
    dangerouslySetInnerHTML: { __html: el.innerHTML },
  });
};
