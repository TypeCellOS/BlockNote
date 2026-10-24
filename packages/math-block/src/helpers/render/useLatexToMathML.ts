/* eslint-disable react/refs -- This render-phase cache retains the last valid MathML while a new source fails to parse. */
import { useRef } from "react";
import type { BlockNoteEditor } from "@blocknote/core";

import type { MathRenderer } from "../MathRenderExtension.js";

export const useLatexToMathMLString = (
  latex: string,
  editor: Pick<BlockNoteEditor, "getExtension">,
  inline = false,
) => {
  const lastValidMathMLStringRef = useRef("");

  const renderer = editor.getExtension<MathRenderer>("math-render");
  if (!renderer) {
    throw new Error("Math renderer extension is not registered");
  }
  const { htmlString: mathMLString, error } = renderer.render(latex, inline);
  if (!error || lastValidMathMLStringRef.current === "") {
    lastValidMathMLStringRef.current = mathMLString;
  }

  return { mathMLString: lastValidMathMLStringRef.current, error };
};
