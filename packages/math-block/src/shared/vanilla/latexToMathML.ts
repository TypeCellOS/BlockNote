import katex from "katex";
import "katex/dist/katex.min.css";

export const latexToMathMLString = (latex: string, inline = false) => {
  try {
    return {
      mathMLString: katex.renderToString(latex, {
        throwOnError: true,
        displayMode: !inline,
      }),
      error: undefined,
    };
  } catch (error) {
    return {
      mathMLString: katex.renderToString(latex, {
        throwOnError: false,
        displayMode: !inline,
      }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const latexToMathMLElement = (latex: string, inline = false) => {
  const { mathMLString, error } = latexToMathMLString(latex, inline);

  // Katex wraps the `math` element in a `span`, which we don't need.
  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathMLString;
  const mathMLElement = wrapper.querySelector("math") as MathMLElement;

  return { mathMLElement, error };
};
