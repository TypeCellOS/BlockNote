import { Fragment, type Schema } from "prosemirror-model";

export const parseInlineMathMLElement = (el: HTMLElement) =>
  el.nodeName.toLowerCase() === "math" &&
  el.getAttribute("display") === "inline"
    ? {}
    : undefined;

export const parseInlineMathMLContent = ({
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
