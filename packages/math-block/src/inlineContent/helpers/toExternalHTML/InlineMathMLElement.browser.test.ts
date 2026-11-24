import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { createReactInlineMathSpec } from "../../createReactMathInlineContentSpec.js";

const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

/** A paragraph with text, an inline formula with `source`, and text. */
function paragraphWith(source: string) {
  return [
    {
      type: "paragraph",
      content: ["See ", { type: "math", content: source }, " here"],
    },
  ] as any[];
}

describe("the external HTML of inline math", () => {
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    editor = BlockNoteEditor.create({ schema });
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  /** The inline content of the first block of the parse of the HTML. */
  function readBack(html: string) {
    return editor.tryParseHTMLToBlocks(html)[0].content;
  }

  it("is the MathML of a formula that compiles, and reads back as the same item", () => {
    const html = editor.blocksToHTMLLossy(paragraphWith("a^2"));

    expect(html).toContain('display="inline"');
    expect(html).not.toContain("<merror>");
    expect(readBack(html)).toMatchObject([
      { type: "text", text: "See " },
      { type: "math", content: "a^2" },
      { type: "text", text: " here" },
    ]);
  });

  it.each([String.raw`\frac{1}{`, String.raw`x \badcommand y`])(
    "shows the source of a formula that does not compile as text, and reads back as the same item: %s",
    (source) => {
      const html = editor.blocksToHTMLLossy(paragraphWith(source));
      const dom = document.createElement("div");
      dom.innerHTML = html;
      const math = dom.querySelector("math");

      expect(math?.getAttribute("display")).toBe("inline");
      expect(math?.getAttribute("alttext")).toBe(source);
      expect(math?.querySelector("merror > mtext")?.textContent).toBe(source);
      expect(readBack(html)).toMatchObject([
        { type: "text", text: "See " },
        { type: "math", content: source },
        { type: "text", text: " here" },
      ]);
    },
  );

  it("keeps a formula that does not compile in the markdown export", () => {
    expect(
      editor.blocksToMarkdownLossy(paragraphWith(String.raw`\frac{1}{`)),
    ).toBe("See $\\frac{1}{$ here\n");
  });
});
