import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { mergeTree } from "./tree.js";

function block(
  id: string,
  children: LensBlock[] = [],
  text = id,
  type = "paragraph",
): LensBlock {
  return {
    id,
    type,
    props: {},
    content:
      type === "column" ? undefined : [{ type: "text", text, styles: {} }],
    children,
  };
}

function merge(
  base: LensBlock[],
  ours: LensBlock[],
  theirs: LensBlock[],
  canContain = (parent: string | undefined, child: string) =>
    child !== "column" || parent === "columnList",
) {
  return mergeTree({
    base,
    ours,
    theirs,
    contentKindOf: (type) => (type === "column" ? "none" : "inline"),
    canContain,
  });
}

/** The IDs of the tree, with the children of each block. For example `["a", ["b"]]` if b is in a. */
function shape(blocks: LensBlock[]): unknown[] {
  return blocks.flatMap((b) =>
    b.children.length > 0 ? [b.id, shape(b.children)] : [b.id],
  );
}

describe("mergeTree", () => {
  it("gives ours if theirs did not change", () => {
    const base = [block("a"), block("b")];
    const ours = [block("b"), block("a", [], "A")];
    const result = merge(base, ours, base);
    expect(shape(result.blocks)).toEqual(["b", "a"]);
    expect(result.blocks[1].content).toMatchObject([{ text: "A" }]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps the changes of the two sides to different blocks", () => {
    const base = [block("a"), block("b")];
    const result = merge(
      base,
      [block("a", [], "A"), block("b")],
      [block("a"), block("b", [], "B"), block("c")],
    );
    expect(result.blocks.map((b) => b.content)).toMatchObject([
      [{ text: "A" }],
      [{ text: "B" }],
      [{ text: "c" }],
    ]);
  });

  it("does not apply a change to a block that theirs removed, and gives a warning", () => {
    const base = [block("a"), block("b")];
    const result = merge(base, [block("a"), block("b", [], "B")], [block("a")]);
    expect(shape(result.blocks)).toEqual(["a"]);
    expect(result.warnings).toEqual([
      { type: "change-to-removed-block", id: "b" },
    ]);
  });

  it("removes a block that theirs changed, and gives a warning", () => {
    const base = [block("a"), block("b")];
    const result = merge(base, [block("a")], [block("a"), block("b", [], "B")]);
    expect(shape(result.blocks)).toEqual(["a"]);
    expect(result.warnings).toEqual([
      { type: "removed-changed-block", id: "b" },
    ]);
  });

  it("puts a new block of ours into the place of its parent, if theirs removed the parent", () => {
    const base = [block("a"), block("p"), block("z")];
    const result = merge(
      base,
      [block("a"), block("p", [block("new")]), block("z")],
      [block("a"), block("z")],
    );
    expect(shape(result.blocks)).toEqual(["a", "new", "z"]);
  });

  it("moves a block that ours keeps out of a block that ours removes, to its place", () => {
    const base = [block("p"), block("x"), block("z")];
    // Theirs moved x into p. Ours removes p, and keeps x.
    const result = merge(
      base,
      [block("x"), block("z")],
      [block("p", [block("x")]), block("z")],
    );
    expect(shape(result.blocks)).toEqual(["x", "z"]);
  });

  it("removes a new block of theirs in a block that ours removes", () => {
    const base = [block("p"), block("z")];
    const result = merge(
      base,
      [block("z")],
      [block("p", [block("n")]), block("z")],
    );
    expect(shape(result.blocks)).toEqual(["z"]);
    expect(result.warnings).toEqual([
      { type: "removed-changed-block", id: "p" },
    ]);
  });

  it("does one move if the two sides make the same move", () => {
    const base = [block("a", [block("b")]), block("c")];
    const moved = [block("a"), block("b"), block("c")];
    expect(shape(merge(base, moved, moved).blocks)).toEqual(["a", "b", "c"]);
  });

  it("keeps the two blocks if the two sides add a block at one position: ours first", () => {
    const base = [block("a"), block("z")];
    const result = merge(
      base,
      [block("a"), block("mine"), block("z")],
      [block("a"), block("theirs"), block("z")],
    );
    expect(shape(result.blocks)).toEqual(["a", "mine", "theirs", "z"]);
  });

  it("gives the parents of ours if the two sides move two blocks into each other", () => {
    const base = [block("a"), block("b")];
    const result = merge(
      base,
      [block("a", [block("b")])],
      [block("b", [block("a")])],
    );
    expect(shape(result.blocks)).toEqual(["a", ["b"]]);
  });

  it("gives the children of a block that its parent cannot hold", () => {
    // Ours adds a column to a column list. Theirs removed the column list.
    const column = (id: string, children: LensBlock[]) =>
      block(id, children, id, "column");
    const list = (children: LensBlock[]) =>
      block("list", children, "list", "columnList");
    const base = [
      list([column("c1", [block("a")]), column("c2", [block("b")])]),
      block("z"),
    ];
    const result = merge(
      base,
      [
        list([
          column("c1", [block("a")]),
          column("c2", [block("b")]),
          column("c3", [block("new")]),
        ]),
        block("z"),
      ],
      [block("z")],
    );
    expect(shape(result.blocks)).toEqual(["new", "z"]);
  });
});
