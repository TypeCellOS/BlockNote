import { useRef } from "react";

import { latexToMathMLString } from "../vanilla/latexToMathML.js";

export const useLatexToMathMLString = (latex: string, inline = false) => {
  const lastValidMathMLStringRef = useRef("");

  const { mathMLString, error } = latexToMathMLString(latex, inline);
  if (!error || lastValidMathMLStringRef.current === "") {
    lastValidMathMLStringRef.current = mathMLString;
  }

  return { mathMLString: lastValidMathMLStringRef.current, error };
};
