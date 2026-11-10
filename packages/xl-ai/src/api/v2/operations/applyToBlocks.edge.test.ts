// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { applyToBlocks, type BlockShape } from "./applyToBlocks.js";
import type { BlockOperation } from "./types.js";

function block(id: string, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: [], children };
}

/** The IDs of the structure, with the nesting. */
function ids(shapes: readonly BlockShape[]): unknown[] {
  return shapes.map((shape) =>
    shape.children.length > 0
      ? [shape.block.id, ids(shape.children)]
      : shape.block.id,
  );
}

function apply(document: LensBlock[], operations: BlockOperation[]) {
  return ids(applyToBlocks(document, operations));
}

describe("applyToBlocks: valid operations", () => {
  const document = [block("a", [block("b")]), block("c")];

  it("gives the document for no operations and for updates", () => {
    expect(apply(document, [])).toEqual([["a", ["b"]], "c"]);
    expect(
      apply(document, [
        { type: "update", id: "a", update: { type: "heading" } },
      ]),
    ).toEqual([["a", ["b"]], "c"]);
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

  it("ignores a delete of a block that is not in the document", () => {
    // Unlike a move, a delete does not examine the block.
    expect(apply(document, [{ type: "delete", id: "x" }])).toEqual([
      ["a", ["b"]],
      "c",
    ]);
  });
});

describe("applyToBlocks: operations that refer to a removed block", () => {
  const document = [block("a"), block("b"), block("z")];

  /** The structure, or "error" if the function throws. */
  function attempt(operations: BlockOperation[]) {
    try {
      return apply(document, operations);
    } catch {
      return "error";
    }
  }

  // BUG: a second delete of a block removes a different block. The deleted
  // block stays in the map of shapes, thus `shapeOf` does not throw, and
  // `detach` calls `list.splice(list.indexOf(shape), 1)` with the index -1:
  // that removes the last block of the old list. `applyOperations(tr,
  // [delete b, delete b])` on the blocks a, b, z also removes z. The
  // BlockOperation type says that the blocks of an operation exist when it
  // runs. Thus, this is an error of the caller, but the result must be an
  // exception ("Block b is not in the document"), not a lost block.
  // `computeOperations` does not give such operations.
  it.fails("does not remove a different block if an operation deletes a block two times", () => {
    expect(["error", ["a", "z"]]).toContainEqual(
      attempt([
        { type: "delete", id: "b" },
        { type: "delete", id: "b" },
      ]),
    );
  });

  // BUG: the same cause: a move of a deleted block puts it back, and removes
  // the last block of its old list.
  it.fails("does not remove a different block if an operation moves a deleted block", () => {
    expect(["error", ["a", "z"]]).toContainEqual(
      attempt([
        { type: "delete", id: "b" },
        { type: "move", id: "b", reference: "a", placement: "after" },
      ]),
    );
  });

  it("puts a block at the start of the list of a removed reference block", () => {
    // The removed block keeps its old list, and its index there is -1.
    expect(
      attempt([
        { type: "delete", id: "a" },
        { type: "move", id: "z", reference: "a", placement: "after" },
      ]),
    ).toEqual(["z", "b"]);
  });
});

describe("applyToBlocks: a move into the block itself", () => {
  // BUG: a move of a block into a block in it makes a cycle. The block and
  // the blocks in it are then not in the result, without an error.
  // `applyOperations` then removes them from the document. As above, this
  // is an error of the caller, and the result must be an exception.
  it.fails("does not lose a block that an operation moves into its own child", () => {
    let result: unknown;
    try {
      result = apply(
        [block("a", [block("b")]), block("c")],
        [{ type: "move", id: "a", reference: "b", placement: "first-child" }],
      );
    } catch {
      return;
    }
    expect(JSON.stringify(result)).toContain('"a"');
  });

  it("keeps the document for a move of a block after itself", () => {
    expect(
      apply(
        [block("a"), block("c")],
        [{ type: "move", id: "a", reference: "a", placement: "after" }],
      ),
    ).toEqual(["a", "c"]);
  });
});
