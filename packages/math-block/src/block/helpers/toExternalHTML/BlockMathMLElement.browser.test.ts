import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { createReactMathBlockSpec } from "../../createReactMathBlockSpec.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { mathBlock: createReactMathBlockSpec() },
});

/** Formulas that do not compile. A user makes such a formula with each keystroke. */
const INVALID = [String.raw`\frac{1}{`, "a\n$$ b", String.raw`x \badcommand y`];

/** A document with a math block with `source` between two paragraphs. */
function documentWith(source: string) {
  return [
    { type: "paragraph", content: "Before" },
    { type: "mathBlock", content: source },
    { type: "paragraph", content: "After" },
  ] as any[];
}

describe("the external HTML of a math block", () => {
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    editor = BlockNoteEditor.create({ schema });
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  /** The type and the text of each block of the parse of the HTML. */
  function readBack(html: string) {
    return editor
      .tryParseHTMLToBlocks(html)
      .map((block) => [
        block.type,
        typeof block.content === "string"
          ? block.content
          : (block.content as { text: string }[])
              .map((item) => item.text)
              .join(""),
      ]);
  }

  it("is the MathML of a formula that compiles, and reads back as the same block", () => {
    const html = editor.blocksToHTMLLossy(documentWith("a^2 + b^2"));

    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
    expect(html).not.toContain("<merror>");
    expect(readBack(html)).toEqual([
      ["paragraph", "Before"],
      ["mathBlock", "a^2 + b^2"],
      ["paragraph", "After"],
    ]);
  });

  it.each(INVALID)(
    "shows the source of a formula that does not compile as text, and reads back as the same block: %s",
    (source) => {
      const html = editor.blocksToHTMLLossy(documentWith(source));
      const dom = document.createElement("div");
      dom.innerHTML = html;
      const math = dom.querySelector("math");

      // The export is one math element: an error element with the source as
      // text, and the annotation that the parse reads.
      expect(dom.querySelectorAll("math")).toHaveLength(1);
      expect(math?.getAttribute("display")).toBe("block");
      expect(math?.getAttribute("alttext")).toBe(source);
      expect(math?.querySelector("merror > mtext")?.textContent).toBe(source);
      // The HTML parse reads a line break in the source as a space, also
      // for a formula that compiles.
      expect(readBack(html)).toEqual([
        ["paragraph", "Before"],
        ["mathBlock", source.replace("\n", " ")],
        ["paragraph", "After"],
      ]);
    },
  );

  it.each(INVALID)(
    "does not stop the markdown export for a formula that does not compile: %s",
    (source) => {
      const markdown = editor.blocksToMarkdownLossy(documentWith(source));

      expect(markdown).toBe(`Before\n\n$$\n${source}\n$$\n\nAfter\n`);
    },
  );

  it("escapes the source of a formula that does not compile", () => {
    const source = String.raw`\frac{<b>&amp;}{`;
    const html = editor.blocksToHTMLLossy(documentWith(source));
    const dom = document.createElement("div");
    dom.innerHTML = html;

    expect(dom.querySelector("b")).toBeNull();
    expect(dom.querySelector("merror > mtext")?.textContent).toBe(source);
    expect(readBack(html)[1]).toEqual(["mathBlock", source]);
  });
});
