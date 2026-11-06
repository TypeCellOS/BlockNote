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
    // Incomplete input while typing is a ParseError and stays a result value.
    // Only unexpected renderer failures should reach an error boundary.
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
