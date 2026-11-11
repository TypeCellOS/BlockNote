// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import type { LayoutRule } from "../util/blocks/schema.js";
import { fitLayout } from "./fitLayout.js";

const rules: Record<string, LayoutRule> = {
  columnList: { minChildren: 2, namedOnly: false, dissolves: true },
  column: { minChildren: 1, namedOnly: true, dissolves: true },
  // A tab set does not dissolve (`children.dissolve: false`).
  tabs: { minChildren: 1, namedOnly: false, dissolves: false },
  // A tab set with at least two tabs.
  tabPair: { minChildren: 2, namedOnly: false, dissolves: false },
  tab: { minChildren: 1, namedOnly: true, dissolves: true },
};

function block(id: string, type = "paragraph", children: LensBlock[] = []) {
  return { id, type, props: {}, content: [], children } as LensBlock;
}

function shape(blocks: LensBlock[]): unknown[] {
  return blocks.map((b) =>
    b.children.length > 0 ? [b.id, shape(b.children)] : b.id,
  );
}

function fit(blocks: LensBlock[]) {
  return shape(fitLayout(blocks, (type) => rules[type]));
}

describe("fitLayout", () => {
  it("keeps layout blocks that fit their rules", () => {
    const document = [
      block("list", "columnList", [
        block("c1", "column", [block("a")]),
        block("c2", "column", [block("b")]),
      ]),
    ];
    expect(fit(document)).toEqual(shape(document));
  });

  it("removes an empty column", () => {
    expect(
      fit([
        block("list", "columnList", [
          block("c1", "column", [block("a")]),
          block("c2", "column"),
          block("c3", "column", [block("c")]),
        ]),
      ]),
    ).toEqual([
      [
        "list",
        [
          ["c1", ["a"]],
          ["c3", ["c"]],
        ],
      ],
    ]);
  });

  it("changes a column list with one column to the blocks of that column", () => {
    expect(
      fit([
        block("before"),
        block("list", "columnList", [
          block("c1", "column", [block("a"), block("b")]),
          block("c2", "column"),
        ]),
        block("after"),
      ]),
    ).toEqual(["before", "a", "b", "after"]);
  });

  it("removes an empty child of a layout block that does not dissolve, and keeps the block", () => {
    expect(
      fit([
        block("set", "tabs", [
          block("t1", "tab", [block("a")]),
          block("t2", "tab"),
        ]),
      ]),
    ).toEqual([["set", [["t1", ["a"]]]]]);
  });

  it("removes a layout block that does not dissolve if none of its children has blocks", () => {
    // The text has nothing of the tab set, thus it goes.
    expect(
      fit([
        block("set", "tabs", [block("t1", "tab"), block("t2", "tab")]),
        block("after"),
      ]),
    ).toEqual(["after"]);
  });

  it("keeps the first empty children that the minimum of a layout block that does not dissolve needs", () => {
    // The schema wins: the set needs two tabs. The apply fills the empty
    // tab t1 (see `applyStructure`). The other empty tab goes.
    expect(
      fit([
        block("set", "tabPair", [
          block("t1", "tab"),
          block("t2", "tab"),
          block("t3", "tab", [block("c")]),
        ]),
      ]),
    ).toEqual([["set", ["t1", ["t3", ["c"]]]]]);
  });

  it("keeps a column with only an empty paragraph", () => {
    expect(
      fit([
        block("list", "columnList", [
          block("c1", "column", [block("empty")]),
          block("c2", "column", [block("b")]),
        ]),
      ]),
    ).toEqual([
      [
        "list",
        [
          ["c1", ["empty"]],
          ["c2", ["b"]],
        ],
      ],
    ]);
  });

  describe("with the child rules of the schema", () => {
    // A column list holds only columns, and a column is only in a column list.
    const canContain = (parent: string | undefined, child: string) =>
      (child === "column") === (parent === "columnList");
    function fitWithRules(blocks: LensBlock[]) {
      return shape(fitLayout(blocks, (type) => rules[type], canContain));
    }

    it("moves a block that its parent cannot hold to after the parent", () => {
      expect(
        fitWithRules([
          block("list", "columnList", [
            block("c1", "column", [block("a")]),
            block("c2", "column", [block("b")]),
            block("new"),
          ]),
          block("z"),
        ]),
      ).toEqual([
        [
          "list",
          [
            ["c1", ["a"]],
            ["c2", ["b"]],
          ],
        ],
        "new",
        "z",
      ]);
    });

    it("changes a column outside a column list to its blocks", () => {
      expect(
        fitWithRules([block("c3", "column", [block("new")]), block("z")]),
      ).toEqual(["new", "z"]);
    });
  });
});
