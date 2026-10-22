/* eslint-disable react/refs -- This render-phase cache retains the last valid MathML while a new source fails to parse. */
import { useRef } from "react";

import { latexToHTMLString } from "../latexToHTMLString.js";

export const useLatexToMathMLString = (latex: string, inline = false) => {
  const lastValidMathMLStringRef = useRef("");

  const { htmlString: mathMLString, error } = latexToHTMLString(latex, inline);
  if (!error || lastValidMathMLStringRef.current === "") {
    lastValidMathMLStringRef.current = mathMLString;
  }

  return { mathMLString: lastValidMathMLStringRef.current, error };
};
