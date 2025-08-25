import { describe, expect, it, beforeEach } from "vitest";

import { setupTestEnv } from "./blockManipulation/setupTestEnv.js";
import { getBlocksChangedByTransaction } from "./getBlocksChangedByTransaction.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

const getEditor = setupTestEnv();

describe("getBlocksChangedByTransaction", () => {
  let editor: BlockNoteEditor;

  beforeEach(() => {
    editor = getEditor();
  });

  it("should return the correct blocks changed by a transaction", () => {
    const blocksChanged = editor.transact((tr) => {
      return getBlocksChangedByTransaction(tr);
    });
    expect(blocksChanged).toEqual([]);
  });

  it("should return blocks inserted by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.insertBlocks([{ type: "paragraph" }], "paragraph-0", "after");
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-inserted.json",
    );
  });

  it("should return nested blocks inserted by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.insertBlocks(
        [
          {
            type: "paragraph",
            children: [{ type: "paragraph", content: "Nested" }],
          },
        ],
        "paragraph-0",
        "after",
      );

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-inserted-nested.json",
    );
  });

  it("should return blocks deleted by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.removeBlocks(["paragraph-0"]);
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-deleted.json",
    );
  });

  it("should return deeply nested blocks deleted by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.removeBlocks(["double-nested-paragraph-0"]);
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-deleted-nested-deep.json",
    );
  });

  it("should return nested blocks deleted by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.removeBlocks(["nested-paragraph-0"]);
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-deleted-nested.json",
    );
  });

  it("should return blocks updated by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.updateBlock("paragraph-0", {
        props: {
          backgroundColor: "red",
        },
      });

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated.json",
    );
  });

  it("should return nested blocks updated by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.updateBlock("nested-paragraph-0", {
        props: {
          backgroundColor: "red",
        },
      });

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-nested.json",
    );
  });

  it("should return deeply nested blocks updated by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.updateBlock("double-nested-paragraph-0", {
        content: "Example Text",
      });

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-nested-deep.json",
    );
  });

  it("should return multiple nested blocks updated by a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.updateBlock("nested-paragraph-0", {
        props: {
          backgroundColor: "red",
        },
      });
      editor.updateBlock("double-nested-paragraph-0", {
        content: "Example Text",
      });

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-nested-multiple.json",
    );
  });

  it("should only return a single block, if multiple updates change a single block in a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.updateBlock("paragraph-0", {
        props: {
          backgroundColor: "red",
        },
      });
      editor.updateBlock("paragraph-0", {
        props: {
          backgroundColor: "blue",
        },
      });

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-single.json",
    );
  });

  it("should return multiple blocks, if multiple updates change multiple blocks in a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.updateBlock("paragraph-0", {
        props: {
          backgroundColor: "red",
        },
      });
      editor.updateBlock("paragraph-1", {
        props: {
          backgroundColor: "blue",
        },
      });

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-multiple.json",
    );
  });

  it("should return multiple blocks, if multiple inserts add new blocks in a transaction", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.insertBlocks(
        [{ type: "paragraph", content: "ABC" }],
        "paragraph-0",
        "after",
      );
      editor.insertBlocks(
        [{ type: "paragraph", content: "DEF" }],
        "paragraph-1",
        "after",
      );

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-multiple-insert.json",
    );
  });

  it("should return blocks which have had content inserted into them", async () => {
    const blocksChanged = editor.transact((tr) => {
      editor.setTextCursorPosition("paragraph-2", "start");
      editor.insertInlineContent("Hello");

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-updated-content-inserted.json",
    );
  });

  it("should return blocks which have been indented", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "paragraph-with-children",
        type: "paragraph",
        content: "A",
        children: [
          {
            id: "nested-paragraph-0",
            type: "paragraph",
            content: "B",
            children: [],
          },
          {
            id: "double-nested-paragraph-0",
            type: "paragraph",
            content: "C",
          },
        ],
      },
    ]);
    const blocksChanged = editor.transact((tr) => {
      editor.setTextCursorPosition("double-nested-paragraph-0", "start");
      editor.nestBlock();

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-indented-changed.json",
    );
  });

  it("should return blocks which have been outdented", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "paragraph-with-children",
        type: "paragraph",
        content: "A",
        children: [
          {
            id: "nested-paragraph-0",
            type: "paragraph",
            content: "B",
            children: [
              {
                id: "double-nested-paragraph-0",
                type: "paragraph",
                content: "C",
              },
            ],
          },
        ],
      },
    ]);

    // This test is different from the other tests because it uses the onChange hook to get the blocks changed
    // This is because unnesting a block is not allowed within a transaction
    let blocksChanged: any = null;
    const unsubscribe = editor.onChange((_e, { getChanges }) => {
      blocksChanged = getChanges();
    });

    // Make the change
    editor.setTextCursorPosition("double-nested-paragraph-0", "start");
    editor.unnestBlock();

    // Clean up
    if (unsubscribe) {
      unsubscribe();
    }

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-outdented-changed.json",
    );
  });

  it("should return blocks which have been moved to a different parent", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "parent-1",
        type: "paragraph",
        content: "Parent 1",
        children: [
          {
            id: "child-1",
            type: "paragraph",
            content: "Child 1",
          },
        ],
      },
      {
        id: "parent-2",
        type: "paragraph",
        content: "Parent 2",
        children: [],
      },
    ]);

    const blocksChanged = editor.transact((tr) => {
      const childBlock = editor.getBlock("child-1");
      editor.removeBlocks(["child-1"]);
      editor.insertBlocks([{ ...childBlock }], "parent-2", "after");

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-to-different-parent.json",
    );
  });

  it("should return blocks which have been moved to root level", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [
          {
            id: "child",
            type: "paragraph",
            content: "Child",
          },
        ],
      },
    ]);

    const blocksChanged = editor.transact((tr) => {
      const childBlock = editor.getBlock("child");
      editor.removeBlocks(["child"]);
      editor.insertBlocks([{ ...childBlock }], "parent", "after");

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-to-root-level.json",
    );
  });

  it("should return blocks which have been moved deeper into nesting", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "root",
        type: "paragraph",
        content: "Root",
        children: [
          {
            id: "level-1",
            type: "paragraph",
            content: "Level 1",
            children: [
              {
                id: "level-2",
                type: "paragraph",
                content: "Level 2",
              },
            ],
          },
          {
            id: "target",
            type: "paragraph",
            content: "Target",
          },
        ],
      },
    ]);

    const blocksChanged = editor.transact((tr) => {
      const targetBlock = editor.getBlock("target");
      editor.removeBlocks(["target"]);
      editor.insertBlocks([{ ...targetBlock }], "level-2", "after");

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-deeper-into-nesting.json",
    );
  });

  it("should return multiple blocks when multiple blocks are moved in the same transaction", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "parent-1",
        type: "paragraph",
        content: "Parent 1",
        children: [
          {
            id: "child-1",
            type: "paragraph",
            content: "Child 1",
          },
          {
            id: "child-2",
            type: "paragraph",
            content: "Child 2",
          },
        ],
      },
      {
        id: "parent-2",
        type: "paragraph",
        content: "Parent 2",
        children: [],
      },
    ]);

    const blocksChanged = editor.transact((tr) => {
      const child1Block = editor.getBlock("child-1");
      const child2Block = editor.getBlock("child-2");
      editor.removeBlocks(["child-1", "child-2"]);
      editor.insertBlocks(
        [{ ...child1Block }, { ...child2Block }],
        "parent-2",
        "after",
      );

      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-multiple-in-same-transaction.json",
    );
  });

  it("should return blocks which have been moved up or down in the same transaction", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "top",
        type: "paragraph",
        content: "Top",
      },
      {
        id: "middle",
        type: "paragraph",
        content: "Middle",
      },
      {
        id: "bottom",
        type: "paragraph",
        content: "Bottom",
      },
    ]);

    const blocksChanged = editor.transact((tr) => {
      editor.setTextCursorPosition("top");
      editor.moveBlocksDown();

      return getBlocksChangedByTransaction(tr);
    });

    // Should report a single minimal move within the same parent
    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-up-down-in-same-transaction.json",
    );
  });

  it("should detect moving the bottom block up within the same parent", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "top", type: "paragraph", content: "Top" },
      { id: "middle", type: "paragraph", content: "Middle" },
      { id: "bottom", type: "paragraph", content: "Bottom" },
    ]);

    const blocksChanged = editor.transact((tr) => {
      editor.setTextCursorPosition("bottom");
      editor.moveBlocksUp();
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-up-down-in-same-parent.json",
    );
  });

  it("should detect moving a block down twice within the same parent as a single move", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "paragraph", content: "A" },
      { id: "b", type: "paragraph", content: "B" },
      { id: "c", type: "paragraph", content: "C" },
    ]);

    const blocksChanged = editor.transact((tr) => {
      editor.setTextCursorPosition("a");
      editor.moveBlocksDown();
      editor.moveBlocksDown();
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-down-twice-in-same-parent.json",
    );
  });

  it("should detect nested sibling reorder within the same parent", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [
          { id: "child-a", type: "paragraph", content: "A" },
          { id: "child-b", type: "paragraph", content: "B" },
          { id: "child-c", type: "paragraph", content: "C" },
        ],
      },
      { id: "sibling", type: "paragraph", content: "S" },
    ]);

    const blocksChanged = editor.transact((tr) => {
      editor.setTextCursorPosition("child-a");
      editor.moveBlocksDown();
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-nested-sibling-reorder.json",
    );
  });

  it("should not report moves when an insert changes sibling order", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "paragraph", content: "A" },
      { id: "b", type: "paragraph", content: "B" },
      { id: "c", type: "paragraph", content: "C" },
    ]);

    const blocksChanged = editor.transact((tr) => {
      editor.insertBlocks(
        [{ id: "x", type: "paragraph", content: "X" }],
        "a",
        "after",
      );
      return getBlocksChangedByTransaction(tr);
    });

    await expect(blocksChanged).toMatchFileSnapshot(
      "__snapshots__/blocks-moved-insert-changes-sibling-order.json",
    );
  });
});
