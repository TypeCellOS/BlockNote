import katex from "katex";
import "katex/dist/katex.min.css";

export const latexToHTMLString = (
  latex: string,
  inline = false,
  external = false,
) => {
  try {
    return {
      htmlString: katex.renderToString(latex, {
        throwOnError: true,
        displayMode: !inline,
        output: external ? "mathml" : "htmlAndMathml",
      }),
      error: undefined,
    };
  } catch (error) {
    return {
      htmlString: katex.renderToString(latex, {
        throwOnError: false,
        displayMode: !inline,
        output: external ? "mathml" : "htmlAndMathml",
      }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
