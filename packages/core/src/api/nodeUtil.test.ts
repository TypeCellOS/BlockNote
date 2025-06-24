import { describe, expect, it, beforeEach } from "vitest";

import { setupTestEnv } from "./blockManipulation/setupTestEnv.js";
import { getBlocksChangedByTransaction } from "./nodeUtil.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

const getEditor = setupTestEnv();

describe("Test getBlocksChangedByTransaction", () => {
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
});
