import { MathMLToLaTeX } from "mathml-to-latex";
import type { Node, Schema } from "prosemirror-model";

export const parseBlockMathMLElement = (el: HTMLElement) =>
  el.nodeName.toLowerCase() === "math" ? {} : undefined;

export const parseBlockMathMLContent = ({
  el,
  schema,
}: {
  el: HTMLElement;
  schema: Schema;
}) => {
  let contentNode: Node | null = null;

  const annotations = Array.from(el.getElementsByTagName("annotation"));
  const texAnnotation = annotations.find(
    (annotation) => annotation.getAttribute("encoding") === "application/x-tex",
  );

  // Prioritize getting source from annotation (guaranteed lossless), else parse MathML elements to
  // LaTeX. If parsing errors, don't return any content.
  if (texAnnotation?.textContent) {
    contentNode = schema.text(texAnnotation.textContent.trim());
  } else {
    try {
      contentNode = schema.text(MathMLToLaTeX.convert(el.outerHTML).trim());
    } catch {}
  }

  return schema.nodes["math"].create(null, contentNode).content;
};
