import { latexToHTMLString } from "../latexToHTMLString.js";

// Converts LaTeX to a MathML element (via KaTeX), for the external HTML.
// Invalid LaTeX is expected (the source is user input). If KaTeX can show the
// fault in the formula (an unknown command is red text), it still has MathML,
// and the result has that element. If KaTeX cannot render the formula at all
// (for example `\frac{1}{`), it has no MathML: the result is a typed error
// with the message of the parser.
export const latexToMathMLElement = (
  latex: string,
  inline = false,
): { error?: undefined; mathMLElement: MathMLElement } | { error: string } => {
  const { htmlString: mathMLString, error } = latexToHTMLString(
    latex,
    inline,
    true,
  );

  // Katex wraps the `math` element in a `span`, which we don't need.
  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathMLString;
  const mathMLElement = wrapper.querySelector("math");
  if (mathMLElement) {
    return { mathMLElement };
  }

  // No MathML and no parse error is a fault of the renderer, not of the
  // formula.
  if (error === undefined) {
    throw new Error("No MathML found in KaTeX output");
  }

  return { error };
};
