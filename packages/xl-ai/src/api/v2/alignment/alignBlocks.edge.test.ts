// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import { alignBlocks, linkBlocks } from "./alignBlocks.js";

function paragraph(text: string): LensBlock {
  return {
    id: "",
    type: "paragraph",
    props: {},
    content: text === "" ? [] : [{ type: "text", text, styles: {} }],
    children: [],
  };
}

function table(text: string): LensBlock {
  return {
    id: "",
    type: "table",
    props: {},
    content: {
      type: "tableContent",
      columnWidths: [undefined],
      rows: [{ cells: [[{ type: "text", text, styles: {} }]] }],
    },
    children: [],
  };
}

function flat(...blocks: (string | LensBlock)[]): FlatBlock[] {
  return blocks.map((block) => ({
    block: typeof block === "string" ? paragraph(block) : block,
    parentIndex: undefined,
  }));
}

/** The pairs as `[aIndex, bIndex]`, sorted by `aIndex`. */
function align(a: FlatBlock[], b: FlatBlock[]) {
  return alignBlocks(a, b)
    .map((pair) => [pair.aIndex, pair.bIndex])
    .sort((x, y) => x[0] - y[0]);
}

describe("alignBlocks: the limit of rule 1 (MIN_SHARE = 0.5)", () => {
  // "zzzz" is before the changed block in `b`. Thus, the changed block is
  // not at the same position (rule 3), and only rule 1 can match it.
  it("matches two blocks at different positions if the overlap is exactly half of the shorter text", () => {
    // 4 of 8 word characters.
    expect(align(flat("abcd efgh"), flat("zzzz", "abcd ijkl"))).toEqual([
      [0, 1],
    ]);
  });

  it("does not match two blocks at different positions if the overlap is less than half of the shorter text", () => {
    // 4 of 9 word characters.
    expect(align(flat("abcd efghi"), flat("zzzz", "abcd ijklm"))).toEqual([]);
  });
});

describe("alignBlocks: moved blocks", () => {
  // BUG: two blocks that only swap places match by position (rule 1 on a
  // partial overlap), not by their equal text, if the text of one block is
  // in the other block. The README says: "a block that the text moves keeps
  // its ID, props and comments", and "An equal text is a stronger sign than
  // a position". Through `updateDocument` (plain text), the swap of "Hello
  // world" and "world" gives two content updates, and the props (for
  // example a background color) stay at the old positions.
  //
  // The cause: the key tokens of the two moved blocks cross, thus the
  // longest increasing subsequence of the anchors drops them (see
  // `anchoredMatch`). In the gaps, "world" then aligns with the other block.
  // Rule 1 matches these blocks before rule 2 can match the equal texts.
  it.fails("matches two blocks that swap places by their equal text, also if the text of one block is in the other block", () => {
    expect(
      align(
        flat("Hello world", "Middle", "world"),
        flat("world", "Middle", "Hello world"),
      ),
    ).toEqual([
      [0, 2],
      [1, 1],
      [2, 0],
    ]);
  });

  it("matches two blocks that swap places by their equal text if the texts have no words in common", () => {
    expect(
      align(
        flat("Hello there", "Middle", "world"),
        flat("world", "Middle", "Hello there"),
      ),
    ).toEqual([
      [0, 2],
      [1, 1],
      [2, 0],
    ]);
  });

  it("does not keep the identity of an empty paragraph that moved: a different block at its old position gets it", () => {
    // Rule 2 does not count blocks with empty text. Rule 3 then matches the
    // empty paragraph with the new block at its old position.
    expect(
      align(
        flat("one two", "", "three four"),
        flat("one two", "new", "three four", ""),
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });
});

describe("alignBlocks: other edge cases", () => {
  it("matches a table and a paragraph with the same words by rule 1: rule 1 does not compare the shape", () => {
    // The target stage then replaces the shape (warning `block-shape-replaced`).
    expect(align(flat(table("cell")), flat("other", "cell"))).toEqual([[0, 1]]);
    // Rule 3 compares the shape.
    expect(align(flat(table("cell")), flat("text"))).toEqual([]);
  });

  it("matches blocks with only punctuation by their key", () => {
    // A text without words is only its key token, with the size 1.
    expect(align(flat("one", "---", "two"), flat("two", "---", "one"))).toEqual(
      [
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    );
  });

  it("matches all blocks of two lists of equal empty paragraphs in order", () => {
    expect(align(flat("", "", ""), flat("", ""))).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it("does not compare letter case for rule 1", () => {
    expect(align(flat("Hello World"), flat("new", "hello world"))).toEqual([
      [0, 1],
    ]);
  });

  it("does not keep the identity of a changed block if the blocks around it swap places", () => {
    // The anchors "x" and "y" cross. The longest increasing subsequence
    // keeps one of them ("y"). Relative to "y", the changed block moved.
    // A block that moved and changed has no match (see the README).
    expect(
      align(flat("x", "Hello World", "y"), flat("y", "hello world", "x")),
    ).toEqual([
      [0, 2],
      [2, 0],
    ]);
  });
});

describe("linkBlocks: edge cases", () => {
  it("links two view blocks with the same key in order", () => {
    expect(linkBlocks(flat("a", "a"), flat("a", "a"))).toEqual([0, 1]);
  });

  it("does not link a block of a different shape between two anchors", () => {
    expect(linkBlocks(flat("a", table("t"), "z"), flat("a", "t", "z"))).toEqual(
      [0, undefined, 2],
    );
  });
});
