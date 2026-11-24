import { latexToMathMLElement } from "./latexToMathMLElement.js";

/**
 * The content of the `math` element of a formula in the external HTML.
 *
 * - KaTeX has MathML for the formula: that MathML. It has an annotation with
 *   the LaTeX source.
 * - KaTeX has no MathML for the formula: an `merror` element with the source
 *   as text, and the same annotation. A user makes this state with each
 *   keystroke in a formula, so the export must not render nothing: the
 *   serializer of core needs an element for each block.
 *
 * In the two cases, the HTML parse reads the formula back with its source
 * (from the annotation), and the Markdown export writes the source.
 */
export function mathMLExportContent(latex: string, inline = false): string {
  const result = latexToMathMLElement(latex, inline);
  if (result.error === undefined) {
    return result.mathMLElement.innerHTML;
  }

  // The export shows the source, and not the message of the parser: the
  // editor is where the author sees and corrects the fault.
  // `textContent` and `outerHTML` escape the source: it is text of the user.
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
