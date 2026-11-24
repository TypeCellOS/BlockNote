import { describe, expect } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import { alignBlocks } from "./alignBlocks.js";

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

describe("alignBlocks: the limit of a changed pair (MIN_SHARE = 0.5)", () => {
  // "zzzz" is before the changed block in `b`. Thus, the gap has two blocks
  // of `b`: the changed block has no pair by position, and only its shared
  // words can match it.
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
  // Two blocks that swap places match by their equal text, also if they
  // share at least half of the shorter text and unchanged blocks are between
  // them. An equal text is a stronger sign than shared words: the equal
  // pairs are candidates before the word diff runs (see `candidates`).
  it("matches two blocks that swap places by their equal text, also if the text of one block is in the other block and two blocks are between them", () => {
    expect(
      align(
        flat("Hello world", "Middle one", "Middle two", "world"),
        flat("world", "Middle one", "Middle two", "Hello world"),
      ),
    ).toEqual([
      [0, 3],
      [1, 1],
      [2, 2],
      [3, 0],
    ]);
  });

  it("matches two blocks that swap places by their equal text, also if the text of one block is in the other block", () => {
    // One block is between them. The three equal pairs cross each other,
    // thus the skeleton keeps the heaviest pair in order ("Hello world"). The
    // two other blocks are moved blocks.
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
    // The diff of the keys keeps "three four" in order, and the pair of the
    // empty paragraphs crosses it. An empty text is not a unique key. Thus,
    // the empty paragraph of `before` has no equal pair, and it pairs by
    // position with the new block.
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

describe("alignBlocks: blocks that swap places", () => {
  // The identity of swapped blocks follows their text.

  it("matches two adjacent blocks with words in common by their text", () => {
    // The diff of the keys keeps one block in order. The other block has a
    // unique key: it is a moved block.
    expect(align(flat("Item 1", "Item 2"), flat("Item 2", "Item 1"))).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(
      align(
        flat("Buy milk at the store", "Buy bread at the store"),
        flat("Buy bread at the store", "Buy milk at the store"),
      ),
    ).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("matches two adjacent blocks by their text, also if the text of one block is in the other block", () => {
    expect(
      align(flat("Hello world", "world"), flat("world", "Hello world")),
    ).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("matches two long blocks with a shared sentence by their text", () => {
    const shared =
      "The quick brown fox jumps over the lazy dog near the river bank today";
    expect(
      align(
        flat(`${shared} one`, `${shared} two`),
        flat(`${shared} two`, `${shared} one`),
      ),
    ).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("matches the blocks of a rotation by their text", () => {
    expect(
      align(
        flat("Step one", "Step two", "Step three"),
        flat("Step two", "Step three", "Step one"),
      ),
    ).toEqual([
      [0, 2],
      [1, 0],
      [2, 1],
    ]);
  });

  it("matches two swapped blocks between other blocks by their text", () => {
    expect(
      align(
        flat("Intro text here", "Item 1", "Item 2", "Outro text here"),
        flat("Intro text here", "Item 2", "Item 1", "Outro text here"),
      ),
    ).toEqual([
      [0, 0],
      [1, 2],
      [2, 1],
      [3, 3],
    ]);
  });

  it("matches two similar blocks that swap places by their equal text, also if unchanged blocks are between them", () => {
    // "see above" and "see below" share at least half of the shorter text.
    // The equal pairs are candidates before the word diff runs. Thus, each
    // block matches its equal text, not the similar block at its position.
    expect(
      align(
        flat("Note: see above", "a1 b1", "a2 b2", "a3 b3", "Note: see below"),
        flat("Note: see below", "a1 b1", "a2 b2", "a3 b3", "Note: see above"),
      ),
    ).toEqual([
      [0, 4],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 0],
    ]);
  });
});
describe("alignBlocks: other edge cases", () => {
  it("matches a table and a paragraph with the same words: a changed pair does not compare the shape", () => {
    // The target stage then replaces the shape (warning `block-shape-replaced`).
    expect(align(flat(table("cell")), flat("other", "cell"))).toEqual([[0, 1]]);
    // The pair by position compares the shape.
    expect(align(flat(table("cell")), flat("text"))).toEqual([]);
  });

  it("matches blocks with only punctuation by their key", () => {
    // A text without words shares no words. Its equal pair has the weight 1.
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

  it("does not compare letter case for a changed pair", () => {
    expect(align(flat("Hello World"), flat("new", "hello world"))).toEqual([
      [0, 1],
    ]);
  });

  it("keeps the identity of a changed block if the blocks around it swap places", () => {
    // The changed pair crosses the equal pairs of "x" and of "y", and it
    // weighs more than each of them. Thus, it is the skeleton, and "x" and
    // "y" are moved blocks.
    expect(
      align(flat("x", "Hello World", "y"), flat("y", "hello world", "x")),
    ).toEqual([
      [0, 2],
      [1, 1],
      [2, 0],
    ]);
  });
});
