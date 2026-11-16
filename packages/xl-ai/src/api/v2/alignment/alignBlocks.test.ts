// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import { alignBlocks, alignmentKey, canBeSameBlock } from "./alignBlocks.js";

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
    const added = Array.from(
      { length: 8 },
      (_, i) => ` This is new sentence number ${i + 1}.`,
    ).join("");
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

  it("does not count a block that moved out of the gap of a block at the same position", () => {
    // "moved item" moves from the gap between "a b" and "c d" to the end.
    // "old text" and "new words" are then the only blocks in that gap.
    expect(
      align(
        flat("a b", "old text", "moved item", "c d"),
        flat("a b", "new words", "c d", "moved item"),
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
      [2, 3],
      [3, 2],
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

describe("alignBlocks: blocks with equal text that is not unique", () => {
  it("keeps equal blocks, also if a new block and a removed block share a word", () => {
    // "shared" is in each list one time. The two equal blocks are between
    // its two blocks. The block at the end changes at its position (rule 3).
    expect(
      align(
        flat("Same text", "Same text", "Old shared"),
        flat("New shared", "Same text", "Same text", "Other"),
      ),
    ).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
  });

  it("keeps equal blocks, also if a new block and a removed block share as many words as the equal blocks have", () => {
    expect(
      align(
        flat("Same text", "Same text", "Old shared thing"),
        flat("New shared thing", "Same text", "Same text", "Other"),
      ),
    ).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
  });

  it("keeps equal blocks between changed blocks with other words", () => {
    // The changed blocks at the two ends are anchors of the word diff.
    expect(
      align(
        flat(
          "Intro one two",
          "Same text",
          "Same text",
          "Old shared",
          "End a b",
        ),
        flat(
          "Intro one two three",
          "New shared",
          "Same text",
          "Same text",
          "Other",
          "End a b c",
        ),
      ),
    ).toEqual([
      [0, 0],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ]);
  });

  it("keeps the first equal blocks if the text adds one more", () => {
    expect(
      align(
        flat("Same text", "Same text", "Old shared"),
        flat("New shared", "Same text", "Same text", "Same text", "Other"),
      ),
    ).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it("keeps equal blocks with a long text between other equal blocks (probe EXP3, case A4)", () => {
    // "text" is in each list one time: in the removed block and in the new
    // first block.
    const same = "This is a non-editable block.";
    expect(
      align(
        flat(same, same, "emoji ipsum text lorem lorem", same),
        flat(
          "Note café gamma café café text lens note.",
          same,
          same,
          "Lens merge lorem delta delta.",
          "Lens merge lorem delta delta.",
          same,
        ),
      ),
    ).toEqual([
      [0, 1],
      [1, 2],
      [3, 5],
    ]);
  });

  it("KNOWN LIMIT: does not keep equal blocks if a changed block moves past them and shares more tokens than they have", () => {
    // The changed block shares 9 words. The two equal blocks have 8 tokens
    // (the key, two words and the separator, for each block). The diff
    // aligns the most tokens, and rule 2 does not match a key that is not
    // unique.
    expect(
      align(
        flat(
          "Same text",
          "Same text",
          "one two three four five six seven eight nine old",
        ),
        flat(
          "one two three four five six seven eight nine new",
          "Same text",
          "Same text",
          "Other",
        ),
      ),
    ).toEqual([[2, 0]]);
  });

  it("keeps the last equal blocks if a block is between the first and the others", () => {
    // The text removes the first "Same text". The others stay after "P q r".
    expect(
      align(
        flat("Same text", "P q r", "Same text", "Same text", "end"),
        flat("P q r", "Same text", "Same text", "end!"),
      ),
    ).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
    ]);
  });
});

describe("alignmentKey", () => {
  it("is equal for blocks with the same text, and for equal blocks without content", () => {
    expect(alignmentKey(paragraph("a"))).toBe(alignmentKey(paragraph("a")));
    expect(alignmentKey(paragraph("a"))).not.toBe(alignmentKey(paragraph("b")));
    expect(alignmentKey(image())).toBe(alignmentKey(image()));
    expect(alignmentKey(image())).not.toBe(alignmentKey(paragraph("")));
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
