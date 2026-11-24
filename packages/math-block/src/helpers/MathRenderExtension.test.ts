import { BlockNoteSchema, createExtension } from "@blocknote/core";
import { expect, test, vi } from "vite-plus/test";
import katex from "katex";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createReactMathBlockSpec } from "../block/createReactMathBlockSpec.js";
import { createReactInlineMathSpec } from "../inlineContent/createReactMathInlineContentSpec.js";
import { type MathRenderer } from "./MathRenderExtension.js";
import { latexToHTMLString } from "./latexToHTMLString.js";
import { useLatexToMathMLString } from "./render/useLatexToMathML.js";

it.for(["block", "inline", "both"] as const)(
  "%s math automatically registers the shared KaTeX renderer",
  async (kind, { setupEditor }) => {
    const schema = BlockNoteSchema.create().extend({
      blockSpecs:
        kind !== "inline" ? { mathBlock: createReactMathBlockSpec() } : {},
      inlineContentSpecs:
        kind !== "block" ? { math: createReactInlineMathSpec() } : {},
    });
    const { editor } = await setupEditor({ schema });
    const renderer = editor.getExtension<MathRenderer>("math-render");
    expect(renderer?.render).toBe(latexToHTMLString);
    const result = renderer?.render("\\frac{a}{b}");
    expect(result?.error).toBeUndefined();
    expect(result?.htmlString).toContain('class="katex"');
    expect(renderer?.render("\\frac{").error).toBeDefined();
  },
);

test.each(["\\frac{", "\\sqrt{", "x^{"])(
  "partial LaTeX remains a recoverable source error: %s",
  (source) => {
    const result = latexToHTMLString(source);
    expect(result.error).toBeDefined();
    expect(result.htmlString).toBeTruthy();
  },
);

test("unexpected typesetter errors propagate instead of becoming source errors", () => {
  const failure = new Error("Unexpected renderer failure");
  const render = vi
    .spyOn(katex, "renderToString")
    .mockImplementationOnce(() => {
      throw failure;
    });
  try {
    expect(() => latexToHTMLString("x")).toThrow(failure);
  } finally {
    render.mockRestore();
  }
});

it.for([false, true])(
  "math previews use the editor's shared renderer (inline: %s)",
  async (inline, { setupEditor }) => {
    const render = vi.fn<MathRenderer["render"]>(() => ({
      htmlString: "Shared formula output",
      error: undefined,
    }));
    const { editor } = await setupEditor({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { mathBlock: createReactMathBlockSpec() },
      }),
      extensions: [createExtension({ key: "math-render", render })],
    });
    function Preview() {
      const { mathMLString } = useLatexToMathMLString({
        latex: "x",
        editor,
        inline,
      });
      return createElement("span", null, mathMLString);
    }
    expect(renderToStaticMarkup(createElement(Preview))).toContain(
      "Shared formula output",
    );
    expect(render).toHaveBeenCalledWith("x", inline);
    const replacement = vi.fn<MathRenderer["render"]>(() => ({
      htmlString: "Replacement output",
      error: undefined,
    }));
    editor.replaceExtension(
      "math-render",
      createExtension({
        key: "math-render",
        render: replacement,
      }),
    );
    expect(renderToStaticMarkup(createElement(Preview))).toContain(
      "Replacement output",
    );
    expect(replacement).toHaveBeenCalledWith("x", inline);
  },
);

it("math previews require the editor capability instead of a direct typesetter fallback", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  function Preview() {
    const { mathMLString } = useLatexToMathMLString({ latex: "x", editor });
    return createElement("span", null, mathMLString);
  }
  expect(() => renderToStaticMarkup(createElement(Preview))).toThrow(
    "Math renderer extension is not registered",
  );
});
