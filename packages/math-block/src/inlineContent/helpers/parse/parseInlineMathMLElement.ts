import { MathMLToLaTeX } from "mathml-to-latex";
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

  // Prioritize getting source from annotation (guaranteed lossless), else parse
  // MathML elements to LaTeX.
  let latex: string | undefined;
  if (texAnnotation?.textContent) {
    latex = texAnnotation.textContent.trim();
  } else {
    try {
      latex = MathMLToLaTeX.convert(el.outerHTML).trim();
    } catch {}
  }

  // Fall through to default parsing if we couldn't derive the source.
  if (!latex) {
    return undefined;
  }

  return Fragment.from(schema.text(latex));
};
