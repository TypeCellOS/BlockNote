import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../blocks/types.js";
import {
  alignBlocks,
  alignmentKey,
  canBeSameBlock,
  linkBlocks,
  linkKey,
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

  it("does not match a moved block that changed, or a moved empty block", () => {
    expect(
      align(flat("one x", "", "two y"), flat("two y", "one x!", "")),
    ).toEqual([[2, 0]]);
  });
});

describe("linkBlocks", () => {
  it("links each view block to the source block with most of its text", () => {
    expect(
      linkBlocks(
        flat("Title", "const a = 1;\n\nconst b = 2;", paragraph(""), "End"),
        flat("Title", "const a = 1;", "const b = 2;", "End"),
      ),
    ).toEqual([0, 1, 1, 3]);
  });

  it("does not link a view block without a source", () => {
    expect(linkBlocks(flat("a"), flat("a", "unrelated"))).toEqual([
      0,
      undefined,
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
    expect(linkKey(table)).not.toBe(linkKey(paragraph("a")));
  });
});

describe("linkKey", () => {
  it("is the type for blocks without content, because a format can lose their fields", () => {
    expect(linkKey(image())).toBe("type:image");
    expect(linkKey(paragraph("a"))).toBe("text:a");
  });
});

describe("canBeSameBlock", () => {
  it("is true for blocks with content of the same shape", () => {
    expect(canBeSameBlock(paragraph("a"), paragraph("b"))).toBe(true);
    expect(canBeSameBlock(paragraph("a"), image())).toBe(false);
    expect(canBeSameBlock(image(), image())).toBe(true);
  });
});
