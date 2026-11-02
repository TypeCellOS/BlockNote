import katex from "katex";

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
    if (!(error instanceof katex.ParseError)) {
      throw error;
    }
    return {
      htmlString: katex.renderToString(latex, {
        throwOnError: false,
        displayMode: !inline,
        output: external ? "mathml" : "htmlAndMathml",
      }),
      error: error.message,
    };
  }
};
