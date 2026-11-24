import katex from "katex";
import { describe, expect, it, vi } from "vite-plus/test";

import { latexToMathMLElement } from "./latexToMathMLElement.js";

describe("latexToMathMLElement", () => {
  it("gives the math element of a formula that compiles", () => {
    const result = latexToMathMLElement("a^2");

    expect(result.error).toBeUndefined();
    if (result.error === undefined) {
      expect(result.mathMLElement.nodeName.toLowerCase()).toBe("math");
      expect(
        result.mathMLElement.querySelector("annotation")?.textContent,
      ).toBe("a^2");
    }
  });

  it.each([String.raw`\frac{1}{`, "a\n$$ b", String.raw`x \badcommand y`])(
    "gives an error value, and no element, for a formula that does not compile: %s",
    (latex) => {
      const result = latexToMathMLElement(latex);

      expect(typeof result.error).toBe("string");
      expect("mathMLElement" in result).toBe(false);
    },
  );

  it("does not make an error value of an unexpected error of the typesetter", () => {
    const failure = new Error("Unexpected renderer failure");
    const render = vi
      .spyOn(katex, "renderToString")
      .mockImplementationOnce(() => {
        throw failure;
      });
    try {
      expect(() => latexToMathMLElement("x")).toThrow(failure);
    } finally {
      render.mockRestore();
    }
  });
});
