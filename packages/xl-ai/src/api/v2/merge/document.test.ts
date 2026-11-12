// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { mergeDocument } from "./document.js";
import { documentShape } from "../testUtil/fixtures.js";

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

function merge(base: LensBlock[], ours: LensBlock[], theirs: LensBlock[]) {
  return mergeDocument({
    base,
    ours,
    theirs,
    contentKindOf: (type) => (type === "column" ? "none" : "inline"),
  });
}

describe("mergeDocument", () => {
  it("gives ours if theirs did not change", () => {
    const base = [block("a"), block("b")];
    const ours = [block("b"), block("a", [], "A")];
    const result = merge(base, ours, base);
    expect(documentShape(result.blocks)).toEqual(["b", "a"]);
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
    expect(documentShape(result.blocks)).toEqual(["a"]);
    expect(result.warnings).toEqual([
      { type: "change-to-removed-block", id: "b" },
    ]);
  });

  it("keeps a block that ours removes and theirs changed, with a warning", () => {
    const base = [block("a"), block("b")];
    const result = merge(base, [block("a")], [block("a"), block("b", [], "B")]);
    expect(documentShape(result.blocks)).toEqual(["a", "b"]);
    expect(result.blocks[1].content).toEqual([
      { type: "text", text: "B", styles: {} },
    ]);
    expect(result.warnings).toEqual([
      { type: "removed-changed-block", id: "b" },
    ]);
  });

  it("removes a block that ours removes and theirs only moved", () => {
    const base = [block("a"), block("b"), block("c")];
    const result = merge(
      base,
      [block("a"), block("c")],
      [block("b"), block("a"), block("c")],
    );
    expect(documentShape(result.blocks)).toEqual(["a", "c"]);
    expect(result.warnings).toEqual([]);
  });

  it("puts a new block of ours into the place of its parent, if theirs removed the parent", () => {
    const base = [block("a"), block("p"), block("z")];
    const result = merge(
      base,
      [block("a"), block("p", [block("new")]), block("z")],
      [block("a"), block("z")],
    );
    expect(documentShape(result.blocks)).toEqual(["a", "new", "z"]);
  });

  it("moves a block that ours keeps out of a block that ours removes, to its place", () => {
    const base = [block("p"), block("x"), block("z")];
    // Theirs moved x into p. Ours removes p, and keeps x.
    const result = merge(
      base,
      [block("x"), block("z")],
      [block("p", [block("x")]), block("z")],
    );
    expect(documentShape(result.blocks)).toEqual(["x", "z"]);
  });

  it("removes a block that ours removes, if theirs changed only a block in it that ours moves out", () => {
    // Ours removes s and b, and moves a out. Theirs changes a. The removal of
    // s loses no change: a stays with its change. Thus, s goes, without a
    // warning. (No other test had this case: without the check of ours in
    // `removalLosesChange`, s stayed empty, with a warning.)
    const base = [block("s", [block("a"), block("b")]), block("z")];
    const result = merge(
      base,
      [block("a"), block("z")],
      [block("s", [block("a", [], "a, changed"), block("b")]), block("z")],
    );
    expect(documentShape(result.blocks)).toEqual(["a", "z"]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps a block that ours removes, with a new block of theirs in it, with a warning", () => {
    const base = [block("p"), block("z")];
    const result = merge(
      base,
      [block("z")],
      [block("p", [block("n")]), block("z")],
    );
    expect(documentShape(result.blocks)).toEqual(["p", ["n"], "z"]);
    expect(result.warnings).toEqual([
      { type: "removed-changed-block", id: "p" },
    ]);
  });

  it("does one move if the two sides make the same move", () => {
    const base = [block("a", [block("b")]), block("c")];
    const moved = [block("a"), block("b"), block("c")];
    expect(documentShape(merge(base, moved, moved).blocks)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps the two blocks if the two sides add a block at one position: ours first", () => {
    const base = [block("a"), block("z")];
    const result = merge(
      base,
      [block("a"), block("mine"), block("z")],
      [block("a"), block("theirs"), block("z")],
    );
    expect(documentShape(result.blocks)).toEqual(["a", "mine", "theirs", "z"]);
  });

  it("gives the parents of theirs, with a warning, if the two sides move two blocks into each other", () => {
    const base = [block("a"), block("b")];
    const result = merge(
      base,
      [block("a", [block("b")])],
      [block("b", [block("a")])],
    );
    expect(documentShape(result.blocks)).toEqual(["b", ["a"]]);
    expect(result.warnings).toEqual([{ type: "conflicting-change", id: "b" }]);
  });

  it("keeps a block at the place of theirs, with a warning, if the two sides move it to different parents", () => {
    // Ours moves "x" out of "p" (and removes "p"). Theirs moves "x" into its
    // new block "w". The parent of theirs wins, thus "x" is in "w".
    const base = [block("p", [block("x")]), block("y")];
    const result = merge(
      base,
      [block("x"), block("y")],
      [block("w", [block("x")]), block("y")],
    );
    expect(documentShape(result.blocks)).toEqual(["w", ["x"], "y"]);
    expect(result.warnings).toEqual([{ type: "conflicting-change", id: "x" }]);
  });

  it("keeps a block at the place of theirs, with a warning, if the two sides move it to different places in one list", () => {
    const base = [block("a"), block("b"), block("c"), block("d")];
    const result = merge(
      base,
      [block("b"), block("a"), block("c"), block("d")],
      [block("b"), block("c"), block("d"), block("a")],
    );
    expect(documentShape(result.blocks)).toEqual(["b", "c", "d", "a"]);
    expect(result.warnings).toEqual([{ type: "conflicting-change", id: "a" }]);
  });

  it("moves a block of the client, without a warning, if another writer moves a different block", () => {
    const base = [block("a"), block("b"), block("c"), block("d")];
    const result = merge(
      base,
      [block("b"), block("a"), block("c"), block("d")],
      [block("a"), block("b"), block("d"), block("c")],
    );
    expect(documentShape(result.blocks)).toEqual(["b", "a", "d", "c"]);
    expect(result.warnings).toEqual([]);
  });

  it("puts a new column of ours into the place of its column list, if theirs removed the list", () => {
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
    // The fit of the result changes the column to its blocks (see `fitLayout`).
    expect(documentShape(result.blocks)).toEqual(["c3", ["new"], "z"]);
  });

  it("puts a new block of ours into the column list, if theirs removed its column", () => {
    const column = (id: string, children: LensBlock[]) =>
      block(id, children, id, "column");
    const list = (children: LensBlock[]) =>
      block("list", children, "list", "columnList");
    const base = [
      list([
        column("c1", [block("a")]),
        column("c2", [block("b")]),
        column("c3", [block("g")]),
      ]),
      block("z"),
    ];
    const result = merge(
      base,
      [
        list([
          column("c1", [block("a")]),
          column("c2", [block("b")]),
          column("c3", [block("g"), block("new")]),
        ]),
        block("z"),
      ],
      [
        list([column("c1", [block("a")]), column("c2", [block("b")])]),
        block("z"),
      ],
    );
    // The fit of the result moves it to after the list (see `fitLayout`).
    expect(documentShape(result.blocks)).toEqual([
      "list",
      ["c1", ["a"], "c2", ["b"], "new"],
      "z",
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("does not see a new block before a block as a move of that block", () => {
    // Ours adds a block before b. Theirs removed b. No warning: ours did not change b.
    const base = [block("a"), block("b")];
    const result = merge(
      base,
      [block("a"), block("new"), block("b")],
      [block("a")],
    );
    expect(documentShape(result.blocks)).toEqual(["a", "new"]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps a new block of theirs at its position, next to a block that ours moves", () => {
    // Theirs adds z after x. Ours moves x after q. The run of x is a
    // conflict that ours wins, but z stays there (not at the end).
    const base = [block("p"), block("x"), block("q"), block("r")];
    const result = merge(
      base,
      [block("p"), block("q"), block("x"), block("r")],
      [block("p"), block("x"), block("z"), block("q"), block("r")],
    );
    expect(documentShape(result.blocks)).toEqual(["p", "z", "q", "x", "r"]);
  });
});
