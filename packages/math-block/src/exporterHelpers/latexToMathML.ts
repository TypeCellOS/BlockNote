import katex from "katex";

// Converts LaTeX to MathML (via KaTeX). The DOCX exporter mapping converts
// it further to OMML, the ODT mapping embeds it directly as a formula
// object. Invalid LaTeX is expected (the source is user input), so it's
// returned as a typed error - with a message safe to show to readers -
// rather than thrown.
export function latexToMathML(
  latex: string,
  inline: boolean,
): { error?: undefined; mathML: string } | { error: string } {
  let katexOutput: string;
  try {
    katexOutput = katex.renderToString(latex, {
      displayMode: !inline,
      output: "mathml",
      throwOnError: true,
    });
  } catch (error) {
    // The boundary that converts KaTeX's parse throw into the typed result.
    // Only `ParseError`s are expected (invalid user LaTeX) - their messages
    // are safe to show to readers. Anything else is a bug and propagates.
    // `ParseError` is read off the same `katex` object whose
    // `renderToString` just ran, so unlike a separate class import it can't
    // diverge under bundler interop.
    if (!(error instanceof katex.ParseError)) {
      throw error;
    }
    return { error: error.message };
  }

  // KaTeX wraps the MathML in a `span`; callers only need the `math`
  // element itself.
  const mathML = katexOutput.match(/<math[\s\S]*<\/math>/)?.[0];
  if (!mathML) {
    throw new Error("No MathML found in KaTeX output");
  }

  return { mathML };
}
