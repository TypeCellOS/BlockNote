import { latexToHTMLString } from "../latexToHTMLString.js";

export const latexToMathMLElement = (latex: string, inline = false) => {
  const { htmlString: mathMLString, error } = latexToHTMLString(
    latex,
    inline,
    true,
  );

  // Katex wraps the `math` element in a `span`, which we don't need.
  const wrapper = document.createElement("div");
  wrapper.innerHTML = mathMLString;
  const mathMLElement = wrapper.querySelector("math") as MathMLElement;

  return { mathMLElement, error };
};
