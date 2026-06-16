import { MathMLToLaTeX } from "mathml-to-latex";
import type { Schema } from "prosemirror-model";

/**
 * Reads the LaTeX source out of a parsed `<math>` (MathML) element. Prefers the
 * original TeX when it's present as an annotation (as produced by our own
 * export, and by temml/MathJax), and otherwise converts the MathML to LaTeX.
 */
const mathMLElementToLaTeX = (el: HTMLElement): string => {
  const annotations = Array.from(el.getElementsByTagName("annotation"));
  const texAnnotation = annotations.find(
    (annotation) => annotation.getAttribute("encoding") === "application/x-tex",
  );
  if (texAnnotation?.textContent) {
    return texAnnotation.textContent.trim();
  }

  try {
    return MathMLToLaTeX.convert(el.outerHTML).trim();
  } catch {
    return "";
  }
};

// The math block's HTML representation is a MathML `<math>` element.
export const parseMathML = (el: HTMLElement) =>
  el.nodeName.toLowerCase() === "math" ? {} : undefined;

export const parseMathMLContent = ({
  el,
  schema,
}: {
  el: HTMLElement;
  schema: Schema;
}) => {
  const source = mathMLElementToLaTeX(el);
  return schema.nodes["math"].create(null, source ? schema.text(source) : null)
    .content;
};
