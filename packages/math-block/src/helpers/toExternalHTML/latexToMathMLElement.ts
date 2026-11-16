import { latexToMathML } from "../../exporterHelpers/latexToMathML.js";

/**
 * The `math` element of a formula, for the external HTML. A formula that
 * does not compile is an expected state (the source is user input): the
 * result is then the typed error of {@link latexToMathML}, and no element.
 */
export function latexToMathMLElement(
  latex: string,
  inline = false,
): { error?: undefined; mathMLElement: MathMLElement } | { error: string } {
  const mathML = latexToMathML(latex, inline);
  if (mathML.error !== undefined) {
    return mathML;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathML.mathML;
  const mathMLElement = wrapper.querySelector("math");
  if (mathMLElement === null) {
    throw new Error("The MathML of KaTeX has no math element");
  }

  return { mathMLElement };
}

/**
 * The content of the `math` element in the external HTML of a formula:
 *
 * - A formula that compiles: the MathML of KaTeX. It has an annotation with
 *   the LaTeX source.
 * - A formula that does not compile: an `merror` element with the source as
 *   text, and the same annotation. A user makes this state with each
 *   keystroke in a formula, thus the export must not render nothing: the
 *   serializer of core needs an element for each block.
 *
 * In the two cases, the HTML parse reads the formula back with its source
 * (it reads the annotation), and the markdown export writes the source.
 */
export function mathMLExportContent(latex: string, inline: boolean): string {
  const result = latexToMathMLElement(latex, inline);
  if (result.error === undefined) {
    return result.mathMLElement.innerHTML;
  }

  const text = document.createElement("mtext");
  text.textContent = latex;
  const error = document.createElement("merror");
  error.append(text);
  const annotation = document.createElement("annotation");
  annotation.setAttribute("encoding", "application/x-tex");
  annotation.textContent = latex;
  const semantics = document.createElement("semantics");
  semantics.append(error, annotation);
  return semantics.outerHTML;
}
