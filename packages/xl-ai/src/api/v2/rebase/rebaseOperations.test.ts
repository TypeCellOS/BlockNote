import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import type { BlockOperation } from "../operations/types.js";
import { rebaseOperations } from "./rebaseOperations.js";

function block(
  id: string,
  text = id,
  children: LensBlock[] = [],
  // A BlockNote block always has all props of its type.
  props: Record<string, unknown> = { textColor: "default" },
): LensBlock {
  return {
    id,
    type: "paragraph",
    props,
    content: [{ type: "text", text, styles: {} }],
    children,
  };
}

/**
 * The target of the operations, as a flat list: the blocks of `base` that
 * the operations do not remove (or that they move out), and the inserted
 * blocks. The rebase uses only the IDs of the target.
 */
function targetOf(base: LensBlock[], operations: BlockOperation[]) {
  const removed = new Set(
    operations.flatMap((op) => (op.type === "delete" ? [op.id] : [])),
  );
  const moved = new Set(
    operations.flatMap((op) => (op.type === "move" ? [op.id] : [])),
  );
  const target: LensBlock[] = [];
  function visit(blocks: LensBlock[], inRemoved: boolean) {
    for (const block of blocks) {
      const gone = removed.has(block.id) || (inRemoved && !moved.has(block.id));
      if (!gone) {
        target.push({ ...block, children: [] });
      }
      visit(block.children, gone);
    }
  }
  visit(base, false);
  for (const op of operations) {
    if (op.type === "insert") {
      target.push(op.block);
    }
  }
  return target;
}

function rebaseAll(
  base: LensBlock[],
  current: LensBlock[],
  operations: BlockOperation[],
) {
  return rebaseOperations({
    base,
    current,
    target: targetOf(base, operations),
    operations,
    contentKindOf: () => "inline",
    canContain: () => true,
  });
}

/** The operations and warnings of the rebase (see `rebaseAll` for the result tree). */
function rebase(
  base: LensBlock[],
  current: LensBlock[],
  operations: BlockOperation[],
) {
  const { operations: rebased, warnings } = rebaseAll(
    base,
    current,
    operations,
  );
  return { operations: rebased, warnings };
}

const insert = (
  reference: string,
  id = "new",
): Extract<BlockOperation, { type: "insert" }> => ({
  type: "insert",
  block: { id, type: "paragraph", props: {}, content: [], children: [] },
  reference,
  placement: "after",
});

describe("rebaseOperations", () => {
  it("gives the same operations if no other writer changed the document", () => {
    const document = [block("a"), block("b"), block("c")];
    const operations: BlockOperation[] = [
      { type: "update", id: "a", update: { props: { textColor: "red" } } },
      insert("a"),
      { type: "move", id: "c", reference: "a", placement: "after" },
      { type: "delete", id: "b" },
    ];

    expect(rebase(document, document, operations)).toEqual({
      operations,
      warnings: [],
    });
  });

  describe("update", () => {
    it("keeps a change of another writer to a different field", () => {
      const base = [block("a", "Hello", [], { textColor: "red" })];
      const current = [block("a", "Hello", [], { textColor: "blue" })];
      const content = [
        { type: "text" as const, text: "Hello world", styles: {} },
      ];

      expect(
        rebase(base, current, [
          { type: "update", id: "a", update: { content } },
        ]).operations,
      ).toEqual([{ type: "update", id: "a", update: { content } }]);
    });

    it("merges two changes in one paragraph", () => {
      const base = [block("a", "Hello world")];
      const current = [block("a", "Hello brave world")];
      const content = [
        { type: "text" as const, text: "Hello world!", styles: {} },
      ];

      expect(
        rebase(base, current, [
          { type: "update", id: "a", update: { content } },
        ]).operations,
      ).toEqual([
        {
          type: "update",
          id: "a",
          update: {
            content: [{ type: "text", text: "Hello brave world!", styles: {} }],
          },
        },
      ]);
    });

    it("uses the value of the text if both sides changed the same prop", () => {
      const base = [block("a", "a", [], { textColor: "red" })];
      const current = [block("a", "a", [], { textColor: "blue" })];

      expect(
        rebase(base, current, [
          {
            type: "update",
            id: "a",
            update: { props: { textColor: "green" } },
          },
        ]).operations,
      ).toEqual([
        { type: "update", id: "a", update: { props: { textColor: "green" } } },
      ]);
    });

    it("skips an update of a block that another writer removed", () => {
      expect(
        rebase(
          [block("a"), block("b")],
          [block("b")],
          [
            {
              type: "update",
              id: "a",
              update: { props: { textColor: "red" } },
            },
          ],
        ),
      ).toEqual({
        operations: [],
        warnings: [{ type: "change-to-removed-block", id: "a" }],
      });
    });
  });

  describe("insert", () => {
    it("goes after the reference block, also if another writer moved it", () => {
      const base = [block("a"), block("b")];
      const current = [block("b", "b", [block("a")])];

      expect(rebase(base, current, [insert("a")]).operations).toEqual([
        insert("a"),
      ]);
    });

    it("goes to the position of a removed reference block", () => {
      const base = [block("a"), block("b"), block("c")];

      expect(
        rebase(base, [block("a"), block("c")], [insert("b")]).operations,
      ).toEqual([insert("a")]);
      expect(rebase(base, [block("c")], [insert("b")]).operations).toEqual([
        { type: "insert", block: insert("b").block, placement: "start" },
      ]);
    });

    it("goes to the position of the parent, if the parent is also removed", () => {
      const base = [block("a"), block("p", "p", [block("x")])];

      expect(rebase(base, [block("a")], [insert("x")]).operations).toEqual([
        insert("a"),
      ]);
    });

    it("can refer to a block that an earlier operation inserted", () => {
      const operations: BlockOperation[] = [
        insert("a"),
        insert("new", "new-2"),
      ];

      expect(rebase([block("a")], [block("a")], operations).operations).toEqual(
        operations,
      );
    });
  });

  describe("move", () => {
    const outdent: BlockOperation = {
      type: "move",
      id: "pears",
      reference: "fruit",
      placement: "after",
    };

    it("does not do a move that another writer already did", () => {
      const base = [block("fruit", "Fruit", [block("apples"), block("pears")])];
      const current = [
        block("fruit", "Fruit", [block("apples")]),
        block("pears"),
      ];

      expect(rebase(base, current, [outdent])).toEqual({
        operations: [],
        warnings: [],
      });
    });

    it("uses the position of the text if another writer moved the block to a different position", () => {
      const base = [block("a"), block("b"), block("c")];
      const current = [block("b", "b", [block("a")]), block("c")];
      const move: BlockOperation = {
        type: "move",
        id: "a",
        reference: "c",
        placement: "after",
      };

      expect(rebase(base, current, [move]).operations).toEqual([move]);
    });

    it("skips a move that is not possible, because another writer moved the reference into the block", () => {
      const base = [block("a"), block("b"), block("c")];
      const current = [block("a", "a", [block("b")]), block("c")];

      expect(
        rebase(base, current, [
          {
            type: "move",
            id: "a",
            reference: "b",
            placement: "after",
          },
        ]).operations,
      ).toEqual([]);
    });

    it("skips a move of a block that another writer removed", () => {
      const base = [block("fruit", "Fruit", [block("pears")])];

      expect(rebase(base, [block("fruit")], [outdent])).toEqual({
        operations: [],
        warnings: [{ type: "change-to-removed-block", id: "pears" }],
      });
    });
  });

  describe("delete", () => {
    it("removes a block that another writer changed, with a warning", () => {
      expect(
        rebase(
          [block("a"), block("b")],
          [block("a", "changed"), block("b")],
          [{ type: "delete", id: "a" }],
        ),
      ).toEqual({
        operations: [{ type: "delete", id: "a" }],
        warnings: [{ type: "removed-changed-block", id: "a" }],
      });
    });

    it("moves a block that the text keeps out of a removed block, if another writer moved it there", () => {
      expect(
        rebase(
          [block("a"), block("b"), block("c"), block("d")],
          [block("a"), block("b", "b", [block("c"), block("d")])],
          [{ type: "delete", id: "b" }],
        ),
      ).toEqual({
        operations: [
          { type: "move", id: "c", reference: "b", placement: "before" },
          { type: "move", id: "d", reference: "b", placement: "before" },
          { type: "delete", id: "b" },
        ],
        warnings: [],
      });
    });

    it("keeps a block that the text moves out of a removed block, if the reference of the move is gone", () => {
      // Base: P[One, Two], End. Another writer removed One. The text removes
      // P, and moves One and Two out of it.
      expect(
        rebase(
          [block("p", "P", [block("one"), block("two")]), block("end")],
          [block("p", "P", [block("two")]), block("end")],
          [
            { type: "move", id: "one", reference: "p", placement: "after" },
            { type: "move", id: "two", reference: "one", placement: "after" },
            { type: "delete", id: "p" },
          ],
        ),
      ).toEqual({
        operations: [
          { type: "move", id: "two", placement: "start" },
          { type: "delete", id: "p" },
        ],
        warnings: [{ type: "change-to-removed-block", id: "one" }],
      });
    });

    it("moves a kept block at any depth out of a removed block", () => {
      // Another writer moved c into b, which is in a, which the text removes.
      expect(
        rebase(
          [block("a", "a", [block("b")]), block("c")],
          [block("a", "a", [block("b", "b", [block("c")])])],
          [
            { type: "move", id: "b", reference: "a", placement: "after" },
            { type: "delete", id: "a" },
          ],
        ).operations,
      ).toEqual([
        { type: "move", id: "b", reference: "a", placement: "after" },
        { type: "delete", id: "a" },
      ]);
    });

    it("removes a block in which another writer added a child, with a warning", () => {
      expect(
        rebase(
          [block("a"), block("b")],
          [block("a", "a", [block("new")]), block("b")],
          [{ type: "delete", id: "a" }],
        ).warnings,
      ).toEqual([{ type: "removed-changed-block", id: "a" }]);
    });

    it("does nothing for a block that another writer removed", () => {
      expect(
        rebase(
          [block("a"), block("b")],
          [block("b")],
          [{ type: "delete", id: "a" }],
        ),
      ).toEqual({ operations: [], warnings: [] });
    });
  });

  it("gives the tree of the current document after the operations", () => {
    const base = [block("a"), block("b"), block("c")];
    // Another writer moved c into b.
    const current = [block("a"), block("b", "b", [block("c")])];
    const { result } = rebaseAll(base, current, [
      { type: "move", id: "a", reference: "b", placement: "after" },
      insert("a", "n"),
    ]);

    function shape(blocks: LensBlock[]): unknown[] {
      return blocks.map((b) =>
        b.children.length > 0 ? [b.id, shape(b.children)] : b.id,
      );
    }
    expect(shape(result)).toEqual([["b", ["c"]], "a", "n"]);
  });
});
