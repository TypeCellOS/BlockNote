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
