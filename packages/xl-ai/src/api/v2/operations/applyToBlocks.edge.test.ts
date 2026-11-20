// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { applyToBlocks } from "./applyToBlocks.js";
import type { StructureOperation } from "./types.js";

function block(id: string, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: [], children };
}

/** The IDs of the blocks, with the nesting. */
function ids(blocks: readonly LensBlock[]): unknown[] {
  return blocks.map((child) =>
    child.children.length > 0 ? [child.id, ids(child.children)] : child.id,
  );
}

function apply(document: LensBlock[], operations: StructureOperation[]) {
  return ids(applyToBlocks(document, operations));
}

describe("applyToBlocks: valid operations", () => {
  const document = [block("a", [block("b")]), block("c")];

  it("gives the document for no operations", () => {
    expect(apply(document, [])).toEqual([["a", ["b"]], "c"]);
  });

  it("places a block at each placement", () => {
    const move = (
      placement: "before" | "after" | "first-child" | "last-child",
    ) =>
      apply(document, [{ type: "move", id: "c", reference: "b", placement }]);
    expect(move("before")).toEqual([["a", ["c", "b"]]]);
    expect(move("after")).toEqual([["a", ["b", "c"]]]);
    expect(move("first-child")).toEqual([["a", [["b", ["c"]]]]]);
    expect(move("last-child")).toEqual([["a", [["b", ["c"]]]]]);
    expect(
      apply(document, [{ type: "move", id: "c", placement: "start" }]),
    ).toEqual(["c", ["a", ["b"]]]);
  });

  it("inserts a new block with its children, and a later operation can refer to a child", () => {
    expect(
      apply(document, [
        { type: "insert", block: block("n", [block("m")]), placement: "start" },
        { type: "move", id: "c", reference: "m", placement: "after" },
      ]),
    ).toEqual([
      ["n", ["m", "c"]],
      ["a", ["b"]],
    ]);
  });

  it("removes a block with its children", () => {
    expect(apply(document, [{ type: "delete", id: "a" }])).toEqual(["c"]);
  });

  it("does not change the blocks of the document and of the operations", () => {
    const inserted = block("n", [block("m")]);
    const before = structuredClone({ document, inserted });

    const result = applyToBlocks(document, [
      { type: "insert", block: inserted, placement: "start" },
      { type: "move", id: "c", reference: "m", placement: "after" },
      { type: "move", id: "b", reference: "n", placement: "before" },
      { type: "delete", id: "a" },
    ]);

    expect(ids(result)).toEqual(["b", ["n", ["m", "c"]]]);
    expect({ document, inserted }).toEqual(before);
    // The result has copies: a block of the input is not in it.
    expect(result[1]).not.toBe(inserted);
    expect(result[0]).not.toBe(document[0].children[0]);
  });

  it("throws for a move with a block that is not in the document", () => {
    expect(() =>
      apply(document, [
        { type: "move", id: "a", reference: "x", placement: "after" },
      ]),
    ).toThrow("Block x is not in the document");
    expect(() =>
      apply(document, [{ type: "move", id: "x", placement: "start" }]),
    ).toThrow("Block x is not in the document");
  });

  it("throws for a delete of a block that is not in the document", () => {
    expect(() => apply(document, [{ type: "delete", id: "x" }])).toThrow(
      "Block x is not in the document",
    );
  });

  it("throws for an insert of a block ID that is in the document", () => {
    expect(() =>
      apply(document, [
        { type: "insert", block: block("b"), placement: "start" },
      ]),
    ).toThrow("Block b is already in the document");
  });
});

describe("applyToBlocks: operations that refer to a removed block", () => {
  // A structure operation must refer to blocks that are in the document when
  // it runs
  // (see `BlockOperation`). `computeOperations` does not give other
  // operations. For other operations, the function throws: before the fix,
  // a removed block stayed in the map, and an operation that referred to it
  // removed a different block (the last block of its old list).
  const document = [block("a"), block("b"), block("z")];

  it("throws for a second delete of a block", () => {
    expect(() =>
      apply(document, [
        { type: "delete", id: "b" },
        { type: "delete", id: "b" },
      ]),
    ).toThrow("Block b is not in the document");
  });

  it("throws for a move of a removed block", () => {
    expect(() =>
      apply(document, [
        { type: "delete", id: "b" },
        { type: "move", id: "b", reference: "a", placement: "after" },
      ]),
    ).toThrow("Block b is not in the document");
  });

  it("throws for an insert with the ID of a removed block", () => {
    // A new block has an ID that the current document does not have. A
    // removed block cannot come back with an insert: a move keeps a block.
    expect(() =>
      apply(document, [
        { type: "delete", id: "b" },
        { type: "insert", block: block("b"), placement: "start" },
      ]),
    ).toThrow("Block b is a block that an earlier operation removed");
  });

  it("throws for an insert of a new block that holds a block with the ID of a removed block", () => {
    expect(() =>
      apply(document, [
        { type: "delete", id: "b" },
        {
          type: "insert",
          block: block("n", [block("b")]),
          placement: "start",
        },
      ]),
    ).toThrow("Block b is a block that an earlier operation removed");
  });

  it("throws for an insert with the ID of a child of a removed block", () => {
    expect(() =>
      apply(
        [block("p", [block("child")]), block("z")],
        [
          { type: "delete", id: "p" },
          { type: "insert", block: block("child"), placement: "start" },
        ],
      ),
    ).toThrow("Block child is a block that an earlier operation removed");
  });

  it("throws for a position next to a removed block", () => {
    expect(() =>
      apply(document, [
        { type: "delete", id: "a" },
        { type: "move", id: "z", reference: "a", placement: "after" },
      ]),
    ).toThrow("Block a is not in the document");
  });

  it("throws for a position in a block in a removed block", () => {
    expect(() =>
      apply(
        [block("a", [block("b")]), block("c")],
        [
          { type: "delete", id: "a" },
          { type: "move", id: "c", reference: "b", placement: "first-child" },
        ],
      ),
    ).toThrow("Block b is not in the document");
  });
});

describe("applyToBlocks: a move into the block itself", () => {
  // Before the fix, a move of a block into a block in it made a cycle: the
  // block and the blocks in it were not in the result, without an error.

  it("throws for a move of a block into its own child", () => {
    expect(() =>
      apply(
        [block("a", [block("b")]), block("c")],
        [{ type: "move", id: "a", reference: "b", placement: "first-child" }],
      ),
    ).toThrow("A move of block a into itself");
  });

  it("throws for a move of a block before or after itself", () => {
    for (const placement of ["before", "after", "last-child"] as const) {
      expect(() =>
        apply(
          [block("c"), block("a")],
          [{ type: "move", id: "a", reference: "a", placement }],
        ),
      ).toThrow("A move of block a into itself");
    }
  });
});
