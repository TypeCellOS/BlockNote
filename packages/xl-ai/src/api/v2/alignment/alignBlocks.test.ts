import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../blocks/types.js";
import {
  alignBlocks,
  alignmentKey,
  canBeSameBlock,
  linkBlocks,
} from "./alignBlocks.js";

function paragraph(text: string): LensBlock {
  return {
    id: "",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text, styles: {} }],
    children: [],
  };
}

function image(): LensBlock {
  return { id: "", type: "image", props: {}, content: undefined, children: [] };
}

function flat(...blocks: (string | LensBlock)[]): FlatBlock[] {
  return blocks.map((block) => ({
    block: typeof block === "string" ? paragraph(block) : block,
    parentIndex: undefined,
  }));
}

/** The pairs, sorted by `aIndex`. The order of the pairs is not part of the result. */
function align(a: FlatBlock[], b: FlatBlock[]) {
  return alignBlocks(a, b)
    .map((pair) => [pair.aIndex, pair.bIndex])
    .sort((x, y) => x[0] - y[0]);
}

describe("alignBlocks", () => {
  it("matches blocks with equal text", () => {
    expect(align(flat("a b", "c d"), flat("a b", "c d"))).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it("matches the other blocks after an insert", () => {
    expect(
      align(flat("first", "second"), flat("new", "first", "second")),
    ).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it("matches a block with many added sentences", () => {
    const added = " More text here. And even more text. And a lot more text.";
    expect(
      align(
        flat("Top", "One sentence.", "Bottom"),
        flat("Top", "New block", `One sentence.${added}`, "Bottom"),
      ),
    ).toEqual([
      [0, 0],
      [1, 2],
      [2, 3],
    ]);
  });

  it("matches a block with fully new text at the same position", () => {
    expect(
      align(
        flat("Top", "Old text", "Bottom"),
        flat("Top", "New words", "Bottom"),
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it("does not match blocks with a small overlap at different positions", () => {
    // "world" is less than half of the two texts.
    expect(
      align(
        flat("Hello big world"),
        flat("Something else", "Goodbye small world"),
      ),
    ).toEqual([]);
  });

  it("matches a split block to the part with the most text", () => {
    expect(
      align(
        flat("Colored centered paragraph"),
        flat("Colored centered", "paragraph"),
      ),
    ).toEqual([[0, 0]]);
  });

  it("matches two joined blocks to the first block", () => {
    expect(
      align(
        flat("Underlined words here", "Last paragraph"),
        flat("Underlined words here. Last paragraph"),
      ),
    ).toEqual([[0, 0]]);
  });

  it("matches two joined blocks to the first block, also if the second block is larger", () => {
    expect(
      align(
        flat(
          "First part is here.",
          "Second part follows with more words than the first.",
        ),
        flat(
          "First part is here. Second part follows with more words than the first.",
        ),
      ),
    ).toEqual([[0, 0]]);
  });

  it("matches blocks without text by their type and position", () => {
    expect(align(flat("a", image(), "b"), flat("a", image(), "b"))).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it("matches a moved block by its unique text", () => {
    expect(
      align(
        flat("one x", "two y", "three z"),
        flat("two y", "three z", "one x"),
      ),
    ).toEqual([
      [0, 2],
      [1, 0],
      [2, 1],
    ]);
  });

  it("matches a moved block by its text before a block at the same position", () => {
    // "Heading" moves to the position of the removed block "gone".
    expect(
      align(
        flat("Heading", "a b", "gone", "c d"),
        flat("a b", "Heading", "c d"),
      ),
    ).toEqual([
      [0, 1],
      [1, 0],
      [3, 2],
    ]);
  });

  it("does not count a moved block in the gap of a block at the same position", () => {
    // "Heading" moves next to "old text", which the text changes fully.
    expect(
      align(
        flat("Heading", "a b", "old text", "c d"),
        flat("a b", "Heading", "new words", "c d"),
      ),
    ).toEqual([
      [0, 1],
      [1, 0],
      [2, 2],
      [3, 3],
    ]);
  });

  it("does not match a moved block if its text is not unique", () => {
    // The text "same" is on two blocks without a match in the second list.
    expect(
      align(flat("same", "a b", "c d"), flat("a b", "c d", "same", "same")),
    ).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });

  it("does not match a moved block that changed", () => {
    expect(
      align(
        flat("alpha beta", "gamma delta", "epsilon zeta"),
        flat("gamma delta", "epsilon zeta", "alpha omega"),
      ),
    ).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });

  it("keeps the changed blocks aligned if a block moves past them", () => {
    // The moved block has an equal text, the other blocks do not. The
    // changed blocks still match, and the moved block matches by rule 2.
    expect(
      align(
        flat("alpha one two three", "beta four five six", "moved item", "end"),
        flat(
          "moved item",
          "alpha one two three x",
          "beta four five six y",
          "end",
        ),
      ),
    ).toEqual([
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 3],
    ]);
  });
});

describe("linkBlocks", () => {
  it("links the view blocks to the parts with equal keys, and the other blocks in order", () => {
    // The view shows the second part as a heading, with a different text.
    expect(
      linkBlocks(
        flat("Title", "const a = 1;", "const b = 2;", "End"),
        flat("Title", "const a = 1;", "# const b = 2;", "End"),
      ),
    ).toEqual([0, 1, 2, 3]);
  });

  it("does not link a view block without a part", () => {
    expect(linkBlocks(flat("a"), flat("a", "unrelated"))).toEqual([
      0,
      undefined,
    ]);
  });

  it("does not link blocks between anchors if the number of blocks is different", () => {
    expect(linkBlocks(flat("a", "b", "z"), flat("a", "x", "y", "z"))).toEqual([
      0,
      undefined,
      undefined,
      2,
    ]);
  });
});

describe("alignmentKey", () => {
  it("is the text for blocks with inline content, and all fields for blocks without content", () => {
    expect(alignmentKey(paragraph("a"))).toBe("text:a");
    expect(alignmentKey(paragraph(""))).toBe("text:");
    expect(alignmentKey(image())).toBe('block:{"props":{},"type":"image"}');
  });

  it("is different for a table and a paragraph with the same text", () => {
    const table: LensBlock = {
      id: "",
      type: "table",
      props: {},
      content: {
        type: "tableContent",
        columnWidths: [undefined, undefined],
        rows: [{ cells: [[{ type: "text", text: "a", styles: {} }]] }],
      },
      children: [],
    };
    expect(alignmentKey(table)).not.toBe(alignmentKey(paragraph("a")));
  });
});

describe("canBeSameBlock", () => {
  it("is true for blocks with content of the same shape", () => {
    expect(canBeSameBlock(paragraph("a"), paragraph("b"))).toBe(true);
    expect(canBeSameBlock(paragraph("a"), image())).toBe(false);
    expect(canBeSameBlock(image(), image())).toBe(true);
  });
});
