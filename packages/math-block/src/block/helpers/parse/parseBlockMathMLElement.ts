import { Fragment, type Schema } from "prosemirror-model";

export const parseBlockMathMLElement = (el: HTMLElement) =>
  el.nodeName.toLowerCase() === "math" && el.getAttribute("display") === "block"
    ? {}
    : undefined;

export const parseBlockMathMLContent = ({
  el,
  schema,
}: {
  el: HTMLElement;
  schema: Schema;
}) => {
  const annotations = Array.from(el.getElementsByTagName("annotation"));
  const texAnnotation = annotations.find(
    (annotation) => annotation.getAttribute("encoding") === "application/x-tex",
  );

  const latex = texAnnotation?.textContent?.trim();

  if (!latex) {
    return undefined;
  }

  return Fragment.from(schema.text(latex));
};
