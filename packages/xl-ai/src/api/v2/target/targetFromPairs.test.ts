// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import type { MatchedPair } from "../util/sequence/types.js";
import type { ViewBlock } from "../projection/projectDocument.js";
import { targetFromPairs } from "./targetFromPairs.js";

function content(text: string) {
  return [{ type: "text" as const, text, styles: {} }];
}

function paragraph(id: string, text: string, children: LensBlock[] = []) {
  return {
    id,
    type: "paragraph",
    props: {},
    content: content(text),
    children,
  } satisfies LensBlock;
}

/** A flat block with the text, at the top level or in the block at `parentIndex`. */
function flat(text: string, parentIndex?: number): FlatBlock {
  return {
    block: paragraph("", text),
    parentIndex,
  };
}

function viewBlock(
  sourceId: string | undefined,
  text: string,
  parentIndex?: number,
): ViewBlock {
  return { ...flat(text, parentIndex), sourceId };
}

/** The ID and text of each block, with the children nested: `["a", ["b"]]` if b is in a. */
function shape(blocks: LensBlock[]): unknown[] {
  return blocks.flatMap((block) => {
    const text = (block.content as { text: string }[])
      .map((item) => item.text)
      .join("");
    const node = block.id === text ? block.id : `${block.id}:${text}`;
    return block.children.length > 0 ? [node, shape(block.children)] : [node];
  });
}

/** The target of the input, as the ID and the text of each block (see `shape`), and the warnings. */
function targetOf(input: {
  document: LensBlock[];
  view: ViewBlock[];
  incoming: FlatBlock[];
  pairs: [number, number][];
  invisibleIds?: string[];
}) {
  let count = 0;
  const { target, warnings } = targetFromPairs({
    source: input.document,
    projection: {
      view: input.view,
      invisibleIds: new Set(input.invisibleIds),
    },
    incoming: input.incoming,
    alignment: input.pairs.map(([aIndex, bIndex]): MatchedPair => ({
      aIndex,
      bIndex,
    })),
    contentKindOf: () => "inline",
    newId: () => `new${++count}`,
  });
  return { target: shape(target), warnings };
}

const document = [paragraph("a", "a"), paragraph("b", "b")];
const view = [viewBlock("a", "a"), viewBlock("b", "b")];
const same: [number, number][] = [
  [0, 0],
  [1, 1],
];

describe("targetFromPairs", () => {
  it("gives the document if the text did not change", () => {
    expect(
      targetOf({
        document,
        view,
        incoming: [flat("a"), flat("b")],
        pairs: same,
      }),
    ).toEqual({ target: ["a", "b"], warnings: [] });
  });

  it("merges the fields of a changed block", () => {
    expect(
      targetOf({
        document,
        view,
        incoming: [flat("a"), flat("b2")],
        pairs: same,
      }).target,
    ).toEqual(["a", "b:b2"]);
  });

  it("puts a new block at its position in the text", () => {
    expect(
      targetOf({
        document,
        view,
        incoming: [flat("n"), flat("a"), flat("m"), flat("b")],
        pairs: [
          [0, 1],
          [1, 3],
        ],
      }).target,
    ).toEqual(["new1:n", "a", "new2:m", "b"]);
  });

  it("puts the children of a new block in the new block", () => {
    expect(
      targetOf({
        document,
        view,
        incoming: [flat("a"), flat("n"), flat("c", 1)],
        pairs: [[0, 0]],
      }).target,
    ).toEqual(["a", "new1:n", ["new2:c"]]);
  });

  it("removes a block without a match", () => {
    expect(
      targetOf({ document, view, incoming: [flat("a")], pairs: [[0, 0]] })
        .target,
    ).toEqual(["a"]);
  });

  it("moves a block out of a removed parent", () => {
    expect(
      targetOf({
        document: [paragraph("p", "p", [paragraph("c", "c")])],
        view: [viewBlock("p", "p"), viewBlock("c", "c", 0)],
        incoming: [flat("c")],
        pairs: [[1, 0]],
      }).target,
    ).toEqual(["c"]);
  });

  it("keeps a nesting that the text does not show", () => {
    // The view shows "c" at the top level, but in the document it is in "p".
    expect(
      targetOf({
        document: [paragraph("p", "p", [paragraph("c", "c")])],
        view: [viewBlock("p", "p"), viewBlock("c", "c")],
        incoming: [flat("p"), flat("c2")],
        pairs: same,
      }).target,
    ).toEqual(["p", ["c:c2"]]);
  });

  it("does not keep a hidden nesting if the block order of the text needs a move", () => {
    // The view shows "c" in "p" and "d" at the top level. The text moves "c"
    // out of "p". Then "d", which comes after "c", cannot stay in "p".
    expect(
      targetOf({
        document: [
          paragraph("p", "p", [paragraph("c", "c"), paragraph("d", "d")]),
        ],
        view: [
          viewBlock("p", "p"),
          viewBlock("c", "c", 0),
          viewBlock("d", "d"),
        ],
        incoming: [flat("p"), flat("c"), flat("d")],
        pairs: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
      }).target,
    ).toEqual(["p", "c", "d"]);
  });

  it("puts a new block before a block with a hidden nesting into the same nesting", () => {
    expect(
      targetOf({
        document: [
          paragraph("p", "p", [paragraph("c", "c")]),
          paragraph("e", "e"),
        ],
        view: [viewBlock("p", "p"), viewBlock("c", "c"), viewBlock("e", "e")],
        incoming: [flat("p"), flat("n"), flat("c"), flat("e")],
        pairs: [
          [0, 0],
          [1, 2],
          [2, 3],
        ],
      }).target,
    ).toEqual(["p", ["new1:n", "c"], "e"]);
  });

  it("keeps a block that the format does not show", () => {
    expect(
      targetOf({
        document: [
          paragraph("a", "a"),
          paragraph("e", ""),
          paragraph("b", "b"),
        ],
        view,
        incoming: [flat("a"), flat("b2")],
        pairs: same,
        invisibleIds: ["e"],
      }).target,
    ).toEqual(["a", "e:", "b:b2"]);
  });

  it("removes a block that the format does not show if the blocks around it are removed", () => {
    expect(
      targetOf({
        document: [
          paragraph("a", "a"),
          paragraph("e", ""),
          paragraph("b", "b"),
        ],
        view,
        incoming: [flat("x")],
        pairs: [],
        invisibleIds: ["e"],
      }).target,
    ).toEqual(["new1:x"]);
  });

  it("keeps a hidden block with a kept descendant, and the descendant in it", () => {
    // Example: a column, which markdown does not show.
    expect(
      targetOf({
        document: [
          paragraph("col", "", [paragraph("x", "x"), paragraph("y", "y")]),
          paragraph("e", "e"),
        ],
        view: [viewBlock("x", "x"), viewBlock("y", "y"), viewBlock("e", "e")],
        incoming: [flat("x2"), flat("y"), flat("e")],
        pairs: [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
        invisibleIds: ["col"],
      }).target,
    ).toEqual(["col:", ["x:x2", "y"], "e"]);
  });

  it("does not apply a change to a view block without a link, and gives a warning", () => {
    expect(
      targetOf({
        document: [paragraph("a", "a")],
        view: [viewBlock("a", "a"), viewBlock(undefined, "x")],
        incoming: [flat("a"), flat("x2")],
        pairs: same,
      }),
    ).toEqual({
      target: ["a"],
      warnings: [{ type: "unlinked-block-changed", text: "x" }],
    });
  });

  it("gives a warning for a view block without a link that the text removes", () => {
    expect(
      targetOf({
        document: [paragraph("a", "a")],
        view: [viewBlock("a", "a"), viewBlock(undefined, "x")],
        incoming: [flat("a")],
        pairs: [[0, 0]],
      }),
    ).toEqual({
      target: ["a"],
      warnings: [{ type: "unlinked-block-changed", text: "x" }],
    });
  });

  it("adds no block for a view block without a link that the text does not change, and gives no warning", () => {
    expect(
      targetOf({
        document: [paragraph("a", "a")],
        view: [viewBlock("a", "a"), viewBlock(undefined, "x")],
        incoming: [flat("a"), flat("x")],
        pairs: same,
      }),
    ).toEqual({ target: ["a"], warnings: [] });
  });

  it("makes the pair of an empty view block without a link a new block, without a warning", () => {
    // The empty view block has no data that the text can change. Thus, the
    // text block is a block of the text.
    expect(
      targetOf({
        document: [paragraph("a", "a")],
        view: [viewBlock("a", "a"), viewBlock(undefined, "")],
        incoming: [flat("a"), flat("n")],
        pairs: same,
      }),
    ).toEqual({ target: ["a", "new1:n"], warnings: [] });
  });
});
