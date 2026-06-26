import { createElement } from "react";
import { katexToMathML } from "./createMathML.js";

/**
 * Renders a LaTeX source string as a bare `<math>` (MathML) element for
 * external HTML export. The React equivalent of `katexToMathML`.
 *
 * @param source The LaTeX source to render.
 * @param displayMode Whether to render in display (block) or inline mode.
 */
export const MathMLContent = (props: {
  source: string;
  displayMode: boolean;
}) => {
  const { dom } = katexToMathML(props.source, props.displayMode);

  if (!dom) {
    return null;
  }

  const attributes = Object.fromEntries(
    Array.from(dom.attributes).map((attr) => [
      // React expects `className` rather than the `class` DOM attribute.
      attr.name === "class" ? "className" : attr.name,
      attr.value,
    ]),
  );

  return createElement(dom.tagName.toLowerCase(), {
    ...attributes,
    dangerouslySetInnerHTML: { __html: dom.innerHTML },
  });
};
