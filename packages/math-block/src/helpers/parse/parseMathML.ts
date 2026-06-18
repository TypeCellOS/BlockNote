import { MathMLToLaTeX } from "mathml-to-latex";
import type { Schema } from "prosemirror-model";

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
